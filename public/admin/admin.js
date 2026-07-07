import { listThemes, readJson, writeJson, assetUrl, ENV } from '../core/platform.js';

/* ------------------------------ tiny DOM helper ------------------------------ */
function h(tag, props = {}, kids = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined) n.setAttribute(k, v);
  }
  (Array.isArray(kids) ? kids : [kids]).forEach((c) => c != null && n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return n;
}
const $ = (id) => document.getElementById(id);

/* ------------------------------ state ------------------------------ */
const state = { themeId: null, parts: null, files: {} }; // files[key] = { rel, data }

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'story', label: 'Story Builder' },
  { id: 'quiz', label: 'Quiz Builder' },
  { id: 'characters', label: 'Characters & Reveal' },
  { id: 'prompts', label: 'Prompt Builder' },
  { id: 'print', label: 'Print Layout' },
  { id: 'music', label: 'Music' },
  { id: 'raw', label: 'Raw JSON' },
];
let active = 'overview';

/* ------------------------------ boot ------------------------------ */
async function boot() {
  const themes = await listThemes();
  const sel = $('themeSelect');
  themes.forEach((t) => sel.appendChild(h('option', { value: t, text: t })));
  const q = new URLSearchParams(location.search).get('theme');
  sel.value = q && themes.includes(q) ? q : themes[0];
  sel.addEventListener('change', () => loadTheme(sel.value));

  $('validateBtn').addEventListener('click', validate);
  $('launchBtn').addEventListener('click', () => (location.href = '../index.html?theme=' + state.themeId));

  buildNav();
  await loadTheme(sel.value);
}

function buildNav() {
  const nav = $('sidenav');
  nav.innerHTML = '';
  SECTIONS.forEach((s) => {
    nav.appendChild(h('button', {
      class: 'navitem' + (s.id === active ? ' active' : ''),
      text: s.label,
      onClick: () => { active = s.id; buildNav(); render(); },
    }));
  });
}

async function loadTheme(themeId) {
  state.themeId = themeId;
  const experience = await readJson(themeId, 'experience.json');
  state.parts = experience.parts;
  const entries = [['experience', 'experience.json'], ...Object.entries(experience.parts)];
  state.files = {};
  for (const [key, rel] of entries) {
    state.files[key] = { rel, data: await readJson(themeId, rel) };
  }
  render();
}

/* ------------------------------ save helpers ------------------------------ */
async function save(key) {
  const { rel, data } = state.files[key];
  if (ENV === 'electron') {
    await writeJson(state.themeId, rel, data);
    toast(`Saved ${rel}`);
  } else {
    // Browser mode: disk is read-only, so download the file for the operator to drop in.
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: rel.split('/').pop() });
    document.body.appendChild(a); a.click(); a.remove();
    toast(`Downloaded ${rel.split('/').pop()} — replace it in themes/${state.themeId}/`);
  }
}

function toast(msg, isErr = false) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast' + (isErr ? ' err' : '');
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), 4000);
}

/* ------------------------------ render router ------------------------------ */
function render() {
  const p = $('panel');
  p.innerHTML = '';
  ({ overview, story, quiz, characters, prompts, print, music, raw }[active])(p);
}

/* ------------------------------ Overview ------------------------------ */
function overview(p) {
  const exp = state.files.experience.data;
  p.append(
    h('h1', { text: exp.name || state.themeId }),
    h('p', { class: 'sub', text: exp.description || 'Theme overview and flow.' }),
    card('Flow', [
      h('p', { class: 'hint', text: 'Order of steps the visitor moves through. Comma-separated step ids.' }),
      textField(exp, 'flow', { join: true }),
      numField(exp, 'idleTimeoutSeconds', 'Idle timeout (seconds)'),
      saveRow('experience'),
    ]),
    card('Environment', [
      h('p', { class: 'hint', html: `Running in <span class="tag">${ENV}</span> mode. ` +
        (ENV === 'electron' ? 'Saves write directly to disk.' : 'Saves download JSON to drop into the theme folder.') }),
    ])
  );
}

/* ------------------------------ Story Builder ------------------------------ */
function story(p) {
  const data = state.files.story.data;
  p.append(h('h1', { text: 'Story Builder' }), h('p', { class: 'sub', text: 'Narrative beats shown before the quiz. Drag order via the arrows.' }));
  const listEl = h('div');
  const draw = () => {
    listEl.innerHTML = '';
    data.beats.forEach((b, i) => {
      listEl.appendChild(h('div', { class: 'list-item' }, [
        h('textarea', { class: 'grow', style: '', oninput: (e) => (b.text = e.target.value), text: b.text }),
        h('button', { class: 'btn btn-sm', text: '↑', onClick: () => move(data.beats, i, -1, draw) }),
        h('button', { class: 'btn btn-sm', text: '↓', onClick: () => move(data.beats, i, 1, draw) }),
        h('button', { class: 'btn btn-sm btn-danger', text: '✕', onClick: () => { data.beats.splice(i, 1); draw(); } }),
      ]));
    });
  };
  draw();
  p.append(listEl,
    h('button', { class: 'btn btn-sm', text: '+ Add beat', onClick: () => { data.beats.push({ text: 'New beat…' }); draw(); } }),
    saveRow('story'));
}

/* ------------------------------ Quiz Builder ------------------------------ */
function quiz(p) {
  const data = state.files.quiz.data;
  p.append(h('h1', { text: 'Quiz Builder' }), h('p', { class: 'sub', text: 'Each option tags traits (trait: number). Traits drive character selection.' }));
  const wrap = h('div');
  const draw = () => {
    wrap.innerHTML = '';
    data.questions.forEach((q, qi) => {
      const optsEl = h('div');
      q.options.forEach((o, oi) => {
        optsEl.appendChild(h('div', { class: 'list-item' }, [
          h('input', { value: o.icon || '', placeholder: '🙂', style: 'width:60px', oninput: (e) => (o.icon = e.target.value) }),
          h('input', { class: 'grow', value: o.label, placeholder: 'Option label', oninput: (e) => (o.label = e.target.value) }),
          h('input', { class: 'grow', value: traitsToStr(o.traits), placeholder: 'brave:2, bold:1',
            oninput: (e) => (o.traits = strToTraits(e.target.value)) }),
          h('button', { class: 'btn btn-sm btn-danger', text: '✕', onClick: () => { q.options.splice(oi, 1); draw(); } }),
        ]));
      });
      wrap.appendChild(card(`Q${qi + 1}`, [
        h('input', { class: 'grow', value: q.prompt, style: 'width:100%;margin-bottom:8px', oninput: (e) => (q.prompt = e.target.value) }),
        optsEl,
        h('div', { class: 'row' }, [
          h('button', { class: 'btn btn-sm', text: '+ Option', onClick: () => { q.options.push({ label: 'New', traits: {} }); draw(); } }),
          h('button', { class: 'btn btn-sm btn-danger', text: 'Delete question', onClick: () => { data.questions.splice(qi, 1); draw(); } }),
        ]),
      ]));
    });
  };
  draw();
  p.append(wrap,
    h('button', { class: 'btn btn-sm', text: '+ Add question',
      onClick: () => { data.questions.push({ id: 'q' + (data.questions.length + 1), prompt: 'New question?', options: [] }); draw(); } }),
    saveRow('quiz'));
}

/* ------------------------------ Characters & Reveal ------------------------------ */
function characters(p) {
  const data = state.files.characters.data;
  p.append(h('h1', { text: 'Characters & Reveal' }),
    h('p', { class: 'sub', text: 'Weights match visitor traits. The reveal template MUST explain why this character chose the visitor.' }));
  const wrap = h('div');
  const draw = () => {
    wrap.innerHTML = '';
    data.characters.forEach((c, ci) => {
      wrap.appendChild(card(c.name || 'Character', [
        field('Name', h('input', { class: 'grow', value: c.name, oninput: (e) => (c.name = e.target.value) })),
        field('Title', h('input', { class: 'grow', value: c.title || '', oninput: (e) => (c.title = e.target.value) })),
        field('Weights (trait:number)', h('input', { class: 'grow', value: traitsToStr(c.weights), oninput: (e) => (c.weights = strToTraits(e.target.value)) })),
        field('Reveal template', h('textarea', { text: c.reveal.template, oninput: (e) => (c.reveal.template = e.target.value) })),
        h('p', { class: 'hint', text: 'Tokens: {name} {title} {topTrait} {reason}. "reason" is picked from the reasons map below by the visitor\'s strongest matching trait.' }),
        field('Reasons (one per line: trait = reason)', h('textarea', { text: reasonsToStr(c.reveal.reasons), oninput: (e) => (c.reveal.reasons = strToReasons(e.target.value)) })),
        field('Default reason (fallback)', h('input', { class: 'grow', value: c.reveal.defaultReason || '', oninput: (e) => (c.reveal.defaultReason = e.target.value) })),
        h('button', { class: 'btn btn-sm btn-danger', text: 'Delete character', onClick: () => { data.characters.splice(ci, 1); draw(); } }),
      ]));
    });
  };
  draw();
  p.append(wrap,
    h('button', { class: 'btn btn-sm', text: '+ Add character',
      onClick: () => { data.characters.push({ id: 'char' + (data.characters.length + 1), name: 'New', weights: {}, reveal: { template: 'I chose you because {reason}.', reasons: {} } }); draw(); } }),
    saveRow('characters'));
}

/* ------------------------------ Prompt Builder ------------------------------ */
function prompts(p) {
  const data = state.files.prompts.data;
  p.append(h('h1', { text: 'Prompt Builder' }),
    h('p', { class: 'sub', text: 'Per-character transformation sets: the mask overlay asset and how it anchors to the photo.' }));
  const wrap = h('div');
  const draw = () => {
    wrap.innerHTML = '';
    Object.entries(data.sets).forEach(([id, set]) => {
      wrap.appendChild(card(id, [
        field('Label', h('input', { class: 'grow', value: set.label || '', oninput: (e) => (set.label = e.target.value) })),
        layerEditor('Mask', set.mask),
        set.costume ? layerEditor('Costume', set.costume) : null,
      ]));
    });
  };
  draw();
  p.append(
    h('p', { class: 'hint', text: `Provider: ${data.provider || 'compositing'} (offline). scale=size vs anchor, offsetY negative = up.` }),
    wrap, saveRow('prompts'));
}

function layerEditor(title, layer) {
  return card(title, [
    field('Asset path', h('input', { class: 'grow', value: layer.asset, oninput: (e) => (layer.asset = e.target.value) })),
    field('Landmark anchor', selectField(layer, 'anchor', ['face', 'head', 'torso'])),
    h('div', { class: 'row' }, [
      labeledNum('scale', layer, 'scale'),
      labeledNum('offsetX', layer, 'offsetX'),
      labeledNum('offsetY', layer, 'offsetY'),
      labeledNum('rotation', layer, 'rotation'),
      labeledNum('opacity', layer, 'opacity'),
    ]),
    h('p', { class: 'hint', text: 'face follows eyes/chin; head gives crowns and headdresses more room; torso is derived below the chin.' }),
    field('Prompt (for future generative provider)', h('input', { class: 'grow', value: layer.prompt || '', oninput: (e) => (layer.prompt = e.target.value) })),
  ]);
}

/* ------------------------------ Print Layout ------------------------------ */
function print(p) {
  const data = state.files.print.data;
  p.append(h('h1', { text: 'Print Layout' }), h('p', { class: 'sub', text: 'A5 landscape keepsake with three portraits, logos, and footer copy.' }));
  const preview = h('canvas', { class: 'preview-print', width: 210, height: 297 });
  const redraw = () => drawPrintPreview(preview, data);

  p.append(card('Page', [
    h('div', { class: 'row' }, [
      field('Size', selectField(data.page, 'size', ['A5', 'A6', '4x6'], redraw)),
      field('Orientation', selectField(data.page, 'orientation', ['portrait', 'landscape'], redraw)),
      labeledNum('DPI', data.page, 'dpi'),
    ]),
  ]),
  card('Keepsake content', [
    field('Order (comma separated)', h('input', { class: 'grow', value: (data.order || []).join(', '),
      oninput: (e) => { data.order = e.target.value.split(',').map((s) => s.trim()).filter(Boolean); redraw(); } })),
    field('Background', h('input', { class: 'grow', value: data.background || '', oninput: (e) => { data.background = e.target.value; redraw(); } })),
    field('Title color', h('input', { class: 'grow', value: data.titleColor || '', oninput: (e) => { data.titleColor = e.target.value; redraw(); } })),
    field('Description color', h('input', { class: 'grow', value: data.descriptionColor || '', oninput: (e) => { data.descriptionColor = e.target.value; redraw(); } })),
    field('Footer', h('textarea', { class: 'grow', rows: '3', oninput: (e) => { data.footer = e.target.value; redraw(); } }, data.footer || '')),
  ]),
  card('Preview', [preview]),
  saveRow('print'));
  redraw();
}

function drawPrintPreview(canvas, data) {
  const ctx = canvas.getContext('2d');
  const named = { A5: [148, 210], A6: [105, 148], '4x6': [102, 152] };
  let [w, h2] = named[data.page.size] || [148, 210];
  if (data.page.orientation === 'landscape') [w, h2] = [h2, w];
  const scale = 260 / Math.max(w, h2);
  canvas.width = w * scale; canvas.height = h2 * scale;
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = data.background || '#fff'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#f1dec8'; ctx.globalAlpha = 0.55;
  for (let y = -12; y < H; y += 36) for (let x = -8; x < W; x += 36) ctx.strokeRect(x, y, 22, 28);
  ctx.globalAlpha = 1;
  const tileW = W * 0.247, tileH = H * 0.44, gap = W * 0.071;
  const x0 = (W - tileW * 3 - gap * 2) / 2, y0 = H * 0.087;
  ctx.fillStyle = '#efefef';
  for (let i = 0; i < 3; i++) ctx.fillRect(x0 + i * (tileW + gap), y0, tileW, tileH);
  ctx.fillStyle = data.titleColor || '#a51f2b';
  ctx.font = `${Math.round(H * 0.056)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Somana Kunitha', W / 2, H * 0.646);
  ctx.fillStyle = data.descriptionColor || '#8b472e';
  ctx.font = `${Math.round(H * 0.026)}px Arial, sans-serif`;
  ctx.fillText('The chosen mask and portrait text appear here.', W / 2, H * 0.712);
  ctx.fillStyle = '#1f1f1f';
  ctx.font = `${Math.round(H * 0.014)}px Arial, sans-serif`;
  ctx.fillText('Sangamam India footer copy', W * 0.69, H * 0.865);
}

/* ------------------------------ Music ------------------------------ */
function music(p) {
  const theme = state.files.theme.data;
  theme.music = theme.music || { volume: 0.4, steps: {} };
  p.append(h('h1', { text: 'Music' }), h('p', { class: 'sub', text: 'Set one looping track for the kiosk, with optional per-step overrides.' }));
  const steps = ['idle', 'story', 'quiz', 'reveal', 'camera', 'transform', 'results', 'print', 'qr'];
  const rows = steps.map((s) => field(s, h('input', { class: 'grow', value: theme.music.steps[s] || '',
    placeholder: 'optional override', oninput: (e) => { theme.music.steps[s] = e.target.value || undefined; } })));
  p.append(
    card('Loop', [
      labeledNum('volume 0–1', theme.music, 'volume'),
      field('Track', h('input', { class: 'grow', value: theme.music.track || '',
        placeholder: '/assets/Verclub_Indian_Loop.wav', oninput: (e) => { theme.music.track = e.target.value || undefined; } })),
    ]),
    card('Per-step overrides', rows),
    saveRow('theme')
  );
}

/* ------------------------------ Raw JSON ------------------------------ */
function raw(p) {
  p.append(h('h1', { text: 'Raw JSON' }), h('p', { class: 'sub', text: 'Direct edit of any config file. Validates before saving.' }));
  Object.entries(state.files).forEach(([key, f]) => {
    const ta = h('textarea', { style: 'min-height:160px', text: JSON.stringify(f.data, null, 2) });
    p.append(card(f.rel, [ta,
      h('div', { class: 'saverow' }, [
        h('button', { class: 'btn btn-primary btn-sm', text: 'Save ' + f.rel.split('/').pop(), onClick: () => {
          try { f.data = JSON.parse(ta.value); save(key); }
          catch (err) { toast('Invalid JSON: ' + err.message, true); }
        } }),
      ])]));
  });
}

/* ------------------------------ shared bits ------------------------------ */
function card(title, kids) { return h('div', { class: 'card' }, [title ? h('h3', { text: title }) : null, ...kids]); }
function field(label, control) { return h('div', { class: 'field' }, [h('label', { text: label }), control]); }
function saveRow(key) { return h('div', { class: 'saverow' }, [h('button', { class: 'btn btn-primary', text: 'Save changes', onClick: () => save(key) })]); }
function textField(obj, k, opts = {}) {
  const val = opts.join && Array.isArray(obj[k]) ? obj[k].join(', ') : obj[k];
  return h('input', { class: 'grow', value: val, style: 'width:100%',
    oninput: (e) => { obj[k] = opts.join ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : e.target.value; } });
}
function numField(obj, k, label) { return field(label, h('input', { type: 'number', value: obj[k] ?? '', oninput: (e) => (obj[k] = num(e.target.value)) })); }
function labeledNum(label, obj, k, cb) {
  return h('label', { style: 'display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted)' }, [
    label, h('input', { type: 'number', step: 'any', value: obj[k] ?? '', oninput: (e) => { obj[k] = num(e.target.value); if (cb) cb(); } }),
  ]);
}
function selectField(obj, k, options, cb) {
  const s = h('select', { onchange: (e) => { obj[k] = e.target.value; if (cb) cb(); } },
    options.map((o) => h('option', { value: o, text: o })));
  s.value = obj[k] || options[0];
  return s;
}
function move(arr, i, dir, cb) { const j = i + dir; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; cb(); }
function num(v) { const n = parseFloat(v); return Number.isNaN(n) ? undefined : n; }
function traitsToStr(t) { return Object.entries(t || {}).map(([k, v]) => `${k}:${v}`).join(', '); }
function strToTraits(s) { const o = {}; s.split(',').forEach((p) => { const [k, v] = p.split(':').map((x) => x.trim()); if (k) o[k] = num(v) ?? 1; }); return o; }
function reasonsToStr(r) { return Object.entries(r || {}).map(([k, v]) => `${k} = ${v}`).join('\n'); }
function strToReasons(s) { const o = {}; s.split('\n').forEach((line) => { const i = line.indexOf('='); if (i > 0) o[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }); return o; }

/* ------------------------------ validate ------------------------------ */
function validate() {
  const errs = [];
  const { experience, story: st, quiz: qz, characters: ch, prompts: pr, print: pt } = state.files;
  if (!experience.data.parts) errs.push('experience.json missing parts');
  if (!st.data.beats?.length) errs.push('story has no beats');
  qz.data.questions?.forEach((q, i) => { if (!q.options?.length) errs.push(`quiz Q${i + 1} has no options`); });
  ch.data.characters?.forEach((c) => { if (!c.reveal?.template) errs.push(`character ${c.name} missing reveal template`); });
  ch.data.characters?.forEach((c) => { const id = c.promptSet || c.id; if (!pr.data.sets?.[id]) errs.push(`character ${c.name} has no prompt set "${id}"`); });
  if (!pt.data.page?.size) errs.push('print missing page.size');
  toast(errs.length ? 'Problems:\n• ' + errs.join('\n• ') : '✓ Config looks valid.', errs.length > 0);
}

boot().catch((e) => toast('Failed to load: ' + e.message, true));
