/**
 * Character selection & reveal resolution — PURE logic, no DOM, unit-testable.
 *
 * Contract (the platform's promise): every visit ends with a character AND a
 * personalized explanation of why THAT character chose THIS human, derived from
 * their actual quiz answers. This is theme-agnostic; characters are just
 * data that flow through here.
 */

/** Accumulate trait scores from the visitor's chosen options. */
export function scoreTraits(answers) {
  const scores = {};
  for (const a of answers) {
    for (const [trait, val] of Object.entries(a.traits || {})) {
      scores[trait] = (scores[trait] || 0) + val;
    }
  }
  return scores;
}

/** Return traits sorted strongest-first (deterministic tie-break by name). */
export function rankedTraits(traitScores) {
  return Object.entries(traitScores)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([trait, score]) => ({ trait, score }));
}

/**
 * Pick the character whose weights best match the visitor's traits.
 * Score = Σ visitorTrait[t] * charWeight[t]. Deterministic tie-break by list order.
 * Returns null when there is no positive trait signal instead of defaulting to
 * the first character and hiding a broken quiz path.
 */
export function selectCharacter(characters, traitScores) {
  const hasSignal = Object.values(traitScores || {}).some((score) => score > 0);
  if (!hasSignal) return null;

  let best = null;
  let bestScore = -Infinity;
  characters.forEach((c, order) => {
    let s = 0;
    for (const [trait, weight] of Object.entries(c.weights || {})) {
      s += (traitScores[trait] || 0) * weight;
    }
    if (s > bestScore) {
      bestScore = s;
      best = { character: c, score: s, order };
    }
  });
  return best && best.score > 0 ? best.character : null;
}

/**
 * Build the "why this character chose you" text.
 * Strategy: find the visitor's strongest trait that the character actually values,
 * pull the character's reason line for that trait, and fill the reveal template.
 * Falls back gracefully so the "why" beat is NEVER empty.
 */
export function resolveReveal(character, traitScores, ranked) {
  const valued = new Set(Object.keys(character.weights || {}));
  const matched = ranked.find((r) => valued.has(r.trait)) || ranked[0] || null;
  const topTrait = matched ? matched.trait : 'spirit';

  const reasons = character.reveal.reasons || {};
  const reasonLine =
    reasons[topTrait] ||
    character.reveal.defaultReason ||
    `you carry a rare ${topTrait} that this experience needs`;

  return fill(character.reveal.template, {
    name: character.name,
    topTrait,
    reason: reasonLine,
    title: character.title || character.name,
  });
}

function fill(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] !== undefined ? vars[k] : `{${k}}`
  );
}

/** Full pipeline used by the reveal screen. */
export function runReveal(charactersConfig, answers) {
  const traitScores = scoreTraits(answers);
  const ranked = rankedTraits(traitScores);
  const character = selectCharacter(charactersConfig.characters, traitScores);
  if (!character) return { traitScores, ranked, character: null, revealText: null };
  const revealText = resolveReveal(character, traitScores, ranked);
  return { traitScores, ranked, character, revealText };
}

export function hasCompleteQuizAnswers(quizConfig, answers) {
  const questions = quizConfig?.questions || [];
  if (!questions.length || !Array.isArray(answers)) return false;

  const answeredQuestionIds = new Set(
    answers
      .map((answer) => answer?.questionId)
      .filter(Boolean)
  );

  return questions.every((question) => answeredQuestionIds.has(question.id));
}
