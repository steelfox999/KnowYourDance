/**
 * Config loader + validator.
 *
 * Loads an Experience and every part it references, resolves asset URLs to
 * loadable paths, and validates required fields BEFORE the flow starts so a
 * broken theme fails loudly at boot instead of mid-visitor.
 *
 * Validation is intentionally dependency-free (no ajv) to keep the offline
 * bundle small; it checks structure, schema version, and cross-references.
 */
import { readJson, assetUrl } from './platform.js';

export const SUPPORTED_SCHEMA = 1;

class ConfigError extends Error {}

function requireFields(obj, fields, where) {
  for (const f of fields) {
    if (obj[f] === undefined || obj[f] === null) {
      throw new ConfigError(`Missing required field "${f}" in ${where}`);
    }
  }
}

function checkSchema(obj, where) {
  if (obj.schemaVersion === undefined) {
    throw new ConfigError(`Missing schemaVersion in ${where}`);
  }
  if (obj.schemaVersion > SUPPORTED_SCHEMA) {
    throw new ConfigError(
      `${where} needs schemaVersion ${obj.schemaVersion} but this build supports ${SUPPORTED_SCHEMA}. Update the app.`
    );
  }
}

export async function loadExperience(themeId) {
  const experience = await readJson(themeId, 'experience.json');
  checkSchema(experience, 'experience.json');
  requireFields(experience, ['id', 'name', 'parts'], 'experience.json');
  validateExperienceFlow(experience);

  const parts = experience.parts;
  requireFields(parts, ['story', 'quiz', 'characters', 'prompts', 'print', 'theme'], 'experience.parts');

  const [story, quiz, characters, prompts, print, theme] = await Promise.all([
    readJson(themeId, parts.story),
    readJson(themeId, parts.quiz),
    readJson(themeId, parts.characters),
    readJson(themeId, parts.prompts),
    readJson(themeId, parts.print),
    readJson(themeId, parts.theme),
  ]);

  validateStory(story);
  validateQuiz(quiz);
  validateCharacters(characters, quiz);
  validatePrompts(prompts);
  validatePrint(print);

  // Resolve asset URLs used at boot (idle images, theme fonts/backgrounds).
  const idleImages = await Promise.all(
    (theme.idle?.images || []).map((rel) => assetUrl(themeId, rel))
  );

  return {
    themeId,
    experience,
    story,
    quiz,
    characters,
    prompts,
    print,
    theme,
    resolved: { idleImages },
    // Bind an asset resolver so downstream modules can lazily resolve their own assets.
    asset: (rel) => assetUrl(themeId, rel),
  };
}

function validateExperienceFlow(experience) {
  const flow = experience.flow;
  if (!Array.isArray(flow) || flow.length === 0) return;

  const quiz = flow.indexOf('quiz');
  const camera = flow.indexOf('camera');
  const reveal = flow.indexOf('reveal');
  if (quiz < 0 || camera < 0 || reveal < 0) {
    throw new ConfigError('experience.flow must include quiz, camera, and reveal');
  }
  if (!(quiz < camera && camera < reveal)) {
    throw new ConfigError('experience.flow must order quiz before camera before reveal');
  }
}

function validateStory(story) {
  checkSchema(story, 'story.json');
  requireFields(story, ['beats'], 'story.json');
  if (!Array.isArray(story.beats) || story.beats.length === 0) {
    throw new ConfigError('story.json "beats" must be a non-empty array');
  }
  story.beats.forEach((b, i) => requireFields(b, ['text'], `story.beats[${i}]`));
}

function validateQuiz(quiz) {
  checkSchema(quiz, 'quiz.json');
  requireFields(quiz, ['questions'], 'quiz.json');
  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    throw new ConfigError('quiz.json "questions" must be a non-empty array');
  }
  quiz.questions.forEach((q, i) => {
    requireFields(q, ['id', 'prompt', 'options'], `quiz.questions[${i}]`);
    if (!Array.isArray(q.options) || q.options.length === 0) {
      throw new ConfigError(`quiz.questions[${i}].options must be a non-empty array`);
    }
    q.options.forEach((o, j) => {
      requireFields(o, ['label', 'traits'], `quiz.questions[${i}].options[${j}]`);
    });
  });
}

function validateCharacters(characters, quiz) {
  checkSchema(characters, 'characters.json');
  requireFields(characters, ['characters'], 'characters.json');
  if (characters.characters.length === 0) {
    throw new ConfigError('characters.json needs at least one character');
  }
  characters.characters.forEach((c, i) => {
    requireFields(c, ['id', 'name', 'weights', 'reveal'], `characters[${i}]`);
    requireFields(c.reveal, ['template'], `characters[${i}].reveal`);
  });
}

function validatePrompts(prompts) {
  checkSchema(prompts, 'prompts.json');
  requireFields(prompts, ['sets'], 'prompts.json');
  // Each character should have a prompt set with a mask layer. Costume is optional.
  Object.entries(prompts.sets).forEach(([id, set]) => {
    requireFields(set, ['mask'], `prompts.sets["${id}"]`);
    validateLayer(set.mask, `prompts.sets["${id}"].mask`);
    if (set.costume) validateLayer(set.costume, `prompts.sets["${id}"].costume`);
  });
}

function validateLayer(layer, where) {
  requireFields(layer, ['asset'], where);
  if (layer.anchor && !['face', 'head', 'torso'].includes(layer.anchor)) {
    throw new ConfigError(`${where}.anchor must be "face", "head", or "torso"`);
  }
}

function validatePrint(print) {
  checkSchema(print, 'print.json');
  requireFields(print, ['page'], 'print.json');
  requireFields(print.page, ['size'], 'print.page');
}

export { ConfigError };
