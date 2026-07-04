import { listThemes } from './core/platform.js';
import { loadExperience, ConfigError } from './core/configLoader.js';
import { Engine } from './core/engine.js';
import { MusicEngine } from './core/music.js';

import idle from './modules/idle.js';
import story from './modules/story.js';
import quiz from './modules/quiz.js';
import reveal from './modules/reveal.js';
import camera from './modules/camera.js';
import transform from './modules/transform.js';
import results from './modules/results.js';
import print from './modules/print.js';
import qr from './modules/qr.js';

const MODULES = { idle, story, quiz, reveal, camera, transform, results, print, qr };

async function boot() {
  const stage = document.getElementById('stage');
  try {
    // Active theme: ?theme=... query wins, else first available theme.
    const params = new URLSearchParams(location.search);
    const themes = await listThemes();
    const themeId = params.get('theme') || themes[0] || 'know-your-dance';

    const config = await loadExperience(themeId);
    applyThemeTokens(config.theme);

    const engine = new Engine({ stage, config, modules: MODULES });
    const music = new MusicEngine(config);
    engine.onStep = (step) => music.onStep(step);
    window.__engine = engine; // handy for admin/debug
    engine.start();

    wireAdminHotkey();
  } catch (err) {
    stage.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'fatal';
    box.innerHTML = `<h2>Configuration problem</h2><p>${
      err instanceof ConfigError ? 'This theme has an invalid config:' : 'Failed to start:'
    }</p><pre>${escapeHtml(err.message)}</pre><p>Open the admin panel (Ctrl/Cmd+Shift+A) to fix the config.</p>`;
    stage.appendChild(box);
    console.error(err);
  }
}

/** Map the theme's design tokens onto CSS custom properties. */
function applyThemeTokens(theme) {
  const t = theme.tokens || {};
  const root = document.documentElement.style;
  const map = {
    '--color-bg': t.bg,
    '--color-surface': t.surface,
    '--color-ink': t.ink,
    '--color-accent': t.accent,
    '--color-accent-2': t.accent2,
    '--color-muted': t.muted,
    '--font-display': t.fontDisplay,
    '--font-body': t.fontBody,
  };
  for (const [k, v] of Object.entries(map)) if (v) root.setProperty(k, v);
  if (theme.name) document.title = theme.name;
}

function wireAdminHotkey() {
  window.addEventListener('keydown', (e) => {
    const combo = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a');
    if (combo) location.href = 'admin/admin.html' + location.search;
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

boot();
