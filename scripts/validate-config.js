#!/usr/bin/env node
'use strict';
/**
 * Validate a theme's config from the command line before deploying to a kiosk.
 * Usage: node scripts/validate-config.js themes/know-your-dance
 * Mirrors the runtime validation in src/core/configLoader.js and additionally
 * checks that every referenced asset file actually exists on disk.
 */
const fs = require('fs');
const path = require('path');

const SUPPORTED_SCHEMA = 1;
const themeDir = process.argv[2] || 'themes/know-your-dance';
let errors = 0;
let warnings = 0;

function fail(msg) { console.error('  ✗ ' + msg); errors++; }
function warn(msg) { console.warn('  ! ' + msg); warnings++; }
function ok(msg) { console.log('  ✓ ' + msg); }

function readJson(rel) {
  const full = path.join(themeDir, rel);
  if (!fs.existsSync(full)) { fail(`missing file: ${rel}`); return null; }
  try { return JSON.parse(fs.readFileSync(full, 'utf-8')); }
  catch (e) { fail(`invalid JSON in ${rel}: ${e.message}`); return null; }
}

function checkSchema(obj, name) {
  if (!obj) return;
  if (obj.schemaVersion === undefined) fail(`${name}: missing schemaVersion`);
  else if (obj.schemaVersion > SUPPORTED_SCHEMA) fail(`${name}: schemaVersion ${obj.schemaVersion} > supported ${SUPPORTED_SCHEMA}`);
}

function assetExists(rel) {
  if (typeof rel === 'string' && rel.startsWith('/')) return fs.existsSync(path.join(process.cwd(), 'public', rel.slice(1)));
  return fs.existsSync(path.join(themeDir, rel));
}

function checkLayer(layer, where) {
  if (!layer.asset) fail(`${where}: missing asset`);
  if (layer.anchor && !['face', 'head', 'torso'].includes(layer.anchor)) {
    fail(`${where}.anchor must be face, head, or torso`);
  }
}

function validateSelectionCoverage(characters, questions) {
  if (!characters.length || !questions.length) return;

  const optionCounts = questions.map((q) => q.options?.length || 0);
  const sharedOptionCount = Math.min(...optionCounts);
  if (sharedOptionCount <= 0) return;

  const selectedIds = [];
  for (let optionIndex = 0; optionIndex < sharedOptionCount; optionIndex++) {
    const traitScores = {};
    questions.forEach((question) => {
      const traits = question.options[optionIndex]?.traits || {};
      Object.entries(traits).forEach(([trait, value]) => {
        traitScores[trait] = (traitScores[trait] || 0) + value;
      });
    });

    const selected = selectCharacter(characters, traitScores);
    if (!selected) {
      fail(`quiz option column ${optionIndex + 1} does not positively match any character`);
    } else {
      selectedIds.push(selected.id);
    }
  }

  const expectedCoverage = Math.min(characters.length, sharedOptionCount);
  if (new Set(selectedIds).size < expectedCoverage) {
    fail(`quiz selection coverage only maps to ${new Set(selectedIds).size}/${expectedCoverage} expected characters (${selectedIds.join(', ')})`);
  }
}

function selectCharacter(characters, traitScores) {
  let best = null;
  let bestScore = -Infinity;
  characters.forEach((character) => {
    let score = 0;
    Object.entries(character.weights || {}).forEach(([trait, weight]) => {
      score += (traitScores[trait] || 0) * weight;
    });
    if (score > bestScore) {
      bestScore = score;
      best = character;
    }
  });
  return bestScore > 0 ? best : null;
}

console.log(`\nValidating ${themeDir}\n`);

const exp = readJson('experience.json');
checkSchema(exp, 'experience.json');
if (exp) {
  for (const k of ['id', 'name', 'parts']) if (exp[k] === undefined) fail(`experience.json: missing ${k}`);
  validateExperienceFlow(exp);
  const parts = exp.parts || {};
  for (const k of ['story', 'quiz', 'characters', 'prompts', 'print', 'theme'])
    if (!parts[k]) fail(`experience.parts: missing ${k}`);

  const story = parts.story && readJson(parts.story); checkSchema(story, parts.story);
  if (story && (!Array.isArray(story.beats) || !story.beats.length)) fail('story.json: beats must be non-empty array');

  const quiz = parts.quiz && readJson(parts.quiz); checkSchema(quiz, parts.quiz);
  if (quiz) {
    if (!Array.isArray(quiz.questions) || !quiz.questions.length) fail('quiz.json: questions must be non-empty array');
    (quiz.questions || []).forEach((q, i) => {
      if (!q.id || !q.prompt || !q.options) fail(`quiz q[${i}]: missing id/prompt/options`);
      if (!Array.isArray(q.options) || !q.options.length) fail(`quiz q[${i}]: options must be non-empty`);
      (q.options || []).forEach((o, j) => { if (!o.label || !o.traits) fail(`quiz q[${i}].opt[${j}]: missing label/traits`); });
    });
  }

  const chars = parts.characters && readJson(parts.characters); checkSchema(chars, parts.characters);
  if (chars) (chars.characters || []).forEach((c, i) => {
    if (!c.id || !c.name || !c.weights || !c.reveal) fail(`character[${i}]: missing id/name/weights/reveal`);
    if (c.reveal && !c.reveal.template) fail(`character[${i}].reveal: missing template`);
  });

  const prompts = parts.prompts && readJson(parts.prompts); checkSchema(prompts, parts.prompts);
  if (prompts) Object.entries(prompts.sets || {}).forEach(([id, set]) => {
    if (!set.mask) fail(`prompts.sets["${id}"]: missing mask`);
    if (set.mask) checkLayer(set.mask, `prompts.sets["${id}"].mask`);
    if (set.costume) checkLayer(set.costume, `prompts.sets["${id}"].costume`);
    if (set.mask && !assetExists(set.mask.asset)) warn(`prompt "${id}" mask asset not found: ${set.mask.asset}`);
    if (set.costume && !assetExists(set.costume.asset)) warn(`prompt "${id}" costume asset not found: ${set.costume.asset}`);
  });
  // Every character should have a prompt set.
  if (chars && prompts) chars.characters.forEach((c) => {
    const setId = c.promptSet || c.id;
    if (!prompts.sets[setId]) fail(`character "${c.id}" has no prompt set "${setId}"`);
  });
  if (chars && quiz) validateSelectionCoverage(chars.characters || [], quiz.questions || []);

  const print = parts.print && readJson(parts.print); checkSchema(print, parts.print);
  if (print) {
    if (!print.page || !print.page.size) fail('print.json: missing page.size');
    (print.logos || []).forEach((logo, i) => {
      if (logo.src && !assetExists(logo.src)) warn(`print logo[${i}] not found: ${logo.src}`);
    });
  }

  const theme = parts.theme && readJson(parts.theme); checkSchema(theme, parts.theme);
  if (theme) {
    (theme.idle?.images || []).forEach((rel) => { if (!assetExists(rel)) warn(`idle image not found: ${rel}`); });
    if (theme.music?.track && !assetExists(theme.music.track)) warn(`music track not found: ${theme.music.track}`);
    Object.entries(theme.music?.steps || {}).forEach(([step, rel]) => {
      if (rel && !assetExists(rel)) warn(`music step "${step}" track not found: ${rel}`);
    });
  }
}

function validateExperienceFlow(exp) {
  const flow = exp.flow;
  if (!Array.isArray(flow) || !flow.length) return;
  const quiz = flow.indexOf('quiz');
  const camera = flow.indexOf('camera');
  const reveal = flow.indexOf('reveal');
  if (quiz < 0 || camera < 0 || reveal < 0) fail('experience.flow must include quiz, camera, and reveal');
  else if (!(quiz < camera && camera < reveal)) fail('experience.flow must order quiz before camera before reveal');
}

console.log(`\n${errors === 0 ? '✓ VALID' : '✗ INVALID'} — ${errors} error(s), ${warnings} warning(s)\n`);
process.exit(errors === 0 ? 0 : 1);
