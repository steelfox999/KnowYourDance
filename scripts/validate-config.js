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

console.log(`\nValidating ${themeDir}\n`);

const exp = readJson('experience.json');
checkSchema(exp, 'experience.json');
if (exp) {
  for (const k of ['id', 'name', 'parts']) if (exp[k] === undefined) fail(`experience.json: missing ${k}`);
  const parts = exp.parts || {};
  for (const k of ['story', 'quiz', 'characters', 'prompts', 'print', 'theme'])
    if (!parts[k]) fail(`experience.parts: missing ${k}`);

  const story = parts.story && readJson(parts.story); checkSchema(story, parts.story);
  if (story && (!Array.isArray(story.beats) || !story.beats.length)) fail('story.json: beats must be non-empty array');

  const quiz = parts.quiz && readJson(parts.quiz); checkSchema(quiz, parts.quiz);
  if (quiz) (quiz.questions || []).forEach((q, i) => {
    if (!q.id || !q.prompt || !q.options) fail(`quiz q[${i}]: missing id/prompt/options`);
    (q.options || []).forEach((o, j) => { if (!o.label || !o.traits) fail(`quiz q[${i}].opt[${j}]: missing label/traits`); });
  });

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

  const print = parts.print && readJson(parts.print); checkSchema(print, parts.print);
  if (print) {
    if (!print.page || !print.page.size) fail('print.json: missing page.size');
    (print.logos || []).forEach((logo, i) => {
      if (logo.src && !assetExists(logo.src)) warn(`print logo[${i}] not found: ${logo.src}`);
    });
  }

  const theme = parts.theme && readJson(parts.theme); checkSchema(theme, parts.theme);
  if (theme) (theme.idle?.images || []).forEach((rel) => { if (!assetExists(rel)) warn(`idle image not found: ${rel}`); });
}

console.log(`\n${errors === 0 ? '✓ VALID' : '✗ INVALID'} — ${errors} error(s), ${warnings} warning(s)\n`);
process.exit(errors === 0 ? 0 : 1);
