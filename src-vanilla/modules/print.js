import { screen, el, primaryButton, ghostButton, enter } from '../core/ui.js';
import { printHtml, savePng } from '../core/platform.js';

/**
 * Composes the print deliverable: an A5 sheet with configured outputs in a grid and a
 * venue-supplied frame/branding overlay drawn on top. Layout is fully config-driven
 * (print.json): page size, DPI, grid, margins, gutter, frame asset, order.
 */
const MM_PER_INCH = 25.4;

export default {
  render(stage, session, engine) {
    const cfg = engine.config;
    const print = cfg.print;

    const preview = el('canvas', { class: 'print-preview' });
    const status = el('p', { class: 'print-status', text: 'Building your sheet…' });

    const view = screen('screen-print', [
      el('div', { class: 'print-frame' }, [
        el('h2', { class: 'print-title', text: print.title || 'Your keepsake' }),
        preview,
        status,
        el('div', { class: 'print-actions' }, [
          ghostButton('Skip', () => engine.next()),
          primaryButton('Print', doPrint),
        ]),
      ]),
    ]);
    stage.appendChild(enter(view));

    let sheetDataUrl = null;

    (async () => {
      sheetDataUrl = await composeSheet(cfg, session, preview);
      status.textContent = 'Ready to print.';
    })();

    async function doPrint() {
      if (!sheetDataUrl) return;
      status.textContent = 'Sending to printer…';
      const filename = `storymachine_${Date.now()}.png`;
      try { await savePng(filename, sheetDataUrl); } catch (_) {}
      const [wmm, hmm] = pageMM(print);
      const html = `<!doctype html><html><head><style>
        @page { size: ${wmm}mm ${hmm}mm; margin: 0; }
        html,body { margin:0; padding:0; }
        img { width:${wmm}mm; height:${hmm}mm; display:block; }
      </style></head><body><img src="${sheetDataUrl}"></body></html>`;
      await printHtml(html);
      status.textContent = 'Printed. Thank you!';
      setTimeout(() => engine.next(), 1200);
    }
  },
};

function pageMM(print) {
  const named = { A5: [148, 210], A6: [105, 148], '4x6': [102, 152] };
  if (print.page.size && named[print.page.size]) {
    let [w, h] = named[print.page.size];
    if (print.page.orientation === 'landscape') [w, h] = [h, w];
    return [w, h];
  }
  return [print.page.widthMm || 148, print.page.heightMm || 210];
}

async function composeSheet(cfg, session, previewCanvas) {
  const print = cfg.print;
  const dpi = print.page.dpi || 300;
  const [wmm, hmm] = pageMM(print);
  const W = Math.round((wmm / MM_PER_INCH) * dpi);
  const H = Math.round((hmm / MM_PER_INCH) * dpi);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = print.background || '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const grid = print.grid || { cols: 2, rows: 2 };
  const margin = frac(print.marginPct, 0.05) * Math.min(W, H);
  const gutter = frac(print.gutterPct, 0.03) * Math.min(W, H);
  const cellW = (W - margin * 2 - gutter * (grid.cols - 1)) / grid.cols;
  const cellH = (H - margin * 2 - gutter * (grid.rows - 1)) / grid.rows;

  const order = (print.order || ['original', 'mask', 'costume', 'combined']).filter((k) => session.outputs[k]);
  const imgs = await Promise.all(order.map((k) => loadImage(session.outputs[k])));

  imgs.forEach((img, i) => {
    const col = i % grid.cols;
    const row = Math.floor(i / grid.cols);
    const x = margin + col * (cellW + gutter);
    const y = margin + row * (cellH + gutter);
    drawCover(ctx, img, x, y, cellW, cellH);
    if (print.labels && print.labels[order[i]]) {
      ctx.fillStyle = print.labelColor || 'rgba(0,0,0,0.6)';
      ctx.font = `${Math.round(cellH * 0.06)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(print.labels[order[i]], x + cellW / 2, y + cellH - cellH * 0.03);
    }
  });

  // Venue frame/branding overlay on top (transparent PNG covering full sheet).
  if (print.frame) {
    try {
      const frameUrl = await cfg.asset(print.frame);
      const frame = await loadImage(frameUrl);
      ctx.drawImage(frame, 0, 0, W, H);
    } catch (_) { /* frame optional; sheet still valid without it */ }
  }

  // Downscale into the on-screen preview.
  const pctx = previewCanvas.getContext('2d');
  const pw = 360, ph = Math.round((H / W) * 360);
  previewCanvas.width = pw;
  previewCanvas.height = ph;
  pctx.drawImage(canvas, 0, 0, pw, ph);

  return canvas.toDataURL('image/png');
}

function drawCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const iw = img.width * scale, ih = img.height * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  ctx.restore();
}

function frac(v, dflt) { return v === undefined ? dflt : v; }

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('load fail'));
    img.src = src;
  });
}
