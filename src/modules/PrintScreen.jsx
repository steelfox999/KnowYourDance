import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Loader2, Printer } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { printHtml, savePng } from '../core/platform.js';

const MM_PER_INCH = 25.4;

export default function PrintScreen({ config, session, onNext }) {
  const print = config.print || {};
  const [statusText, setStatusText] = useState('Rendering high-resolution keepsake sheet...');
  const [sheetDataUrl, setSheetDataUrl] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }
    );

    (async () => {
      if (!canvasRef.current) return;
      try {
        const url = await composeSheet(config, session, canvasRef.current);
        setSheetDataUrl(url);
        setStatusText('Ready to print your keepsake sheet.');
      } catch (err) {
        console.error('Error composing print sheet:', err);
        setStatusText('Ready to print.');
      }
    })();
  }, [config, session]);

  useEffect(() => {
    if (!sheetDataUrl || isPrinting) return undefined;
    const timer = window.setTimeout(() => {
      doPrint();
    }, 650);
    return () => window.clearTimeout(timer);
  }, [sheetDataUrl, isPrinting]);

  const doPrint = async () => {
    if (!sheetDataUrl || isPrinting) return;

    setIsPrinting(true);
    setStatusText('Sending keepsake sheet to the printer...');
    const filename = `storymachine_${Date.now()}.png`;

    try {
      await savePng(filename, sheetDataUrl);
    } catch (err) {
      console.warn('Error saving local PNG copy:', err);
    }

    const [wmm, hmm] = pageMM(print);
    const html = `<!doctype html><html><head><style>
      @page { size: ${wmm}mm ${hmm}mm; margin: 0; }
      html,body { margin:0; padding:0; }
      img { width:${wmm}mm; height:${hmm}mm; display:block; }
    </style></head><body><img src="${sheetDataUrl}"></body></html>`;

    try {
      await printHtml(html);
      setStatusText('Print job sent.');
      setTimeout(() => onNext(), 1200);
    } catch (err) {
      console.error('Printing error:', err);
      setStatusText('Printing failed. Continuing to digital copy.');
      setIsPrinting(false);
      setTimeout(() => onNext(), 1800);
    }
  };

  return (
    <section ref={containerRef} className="view-screen active">
      <GlassCard className="glass-card-sm print-card">
        <div className="card-header">
          <span>Exhibition Keepsake</span>
          <p>{statusText}</p>
        </div>

        <h2 className="print-title font-serif text-gradient-gold">
          {print.title || 'Your Keepsake Sheet'}
        </h2>

        <div className="paper-preview">
          <canvas ref={canvasRef} />
        </div>

        <div className="auto-print-status">
          {isPrinting ? <Loader2 size={18} className="spin-icon" /> : <Printer size={18} />}
          <span>{isPrinting ? 'Printing...' : 'Printing starts automatically'}</span>
        </div>
      </GlassCard>
    </section>
  );
}

function pageMM(print) {
  const named = { A5: [148, 210], A6: [105, 148], '4x6': [102, 152] };
  if (print.page?.size && named[print.page.size]) {
    let [w, h] = named[print.page.size];
    if (print.page.orientation === 'landscape') [w, h] = [h, w];
    return [w, h];
  }
  return [print.page?.widthMm || 148, print.page?.heightMm || 210];
}

async function composeSheet(cfg, session, previewCanvas) {
  const print = cfg.print || {};
  const dpi = print.page?.dpi || 300;
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

  const order = (print.order || ['original', 'mask', 'costume', 'combined']).filter((key) => session.outputs?.[key]);
  const imgs = await Promise.all(order.map((key) => loadImage(session.outputs[key])));

  imgs.forEach((img, index) => {
    const col = index % grid.cols;
    const row = Math.floor(index / grid.cols);
    const x = margin + col * (cellW + gutter);
    const y = margin + row * (cellH + gutter);
    drawCover(ctx, img, x, y, cellW, cellH);
    if (print.labels && print.labels[order[index]]) {
      ctx.fillStyle = print.labelColor || 'rgba(0,0,0,0.6)';
      ctx.font = `${Math.round(cellH * 0.06)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(print.labels[order[index]], x + cellW / 2, y + cellH - cellH * 0.03);
    }
  });

  if (print.frame) {
    try {
      const frameUrl = await cfg.asset(print.frame);
      const frame = await loadImage(frameUrl);
      ctx.drawImage(frame, 0, 0, W, H);
    } catch (_) {}
  }

  const previewCtx = previewCanvas.getContext('2d');
  const previewW = 340;
  const previewH = Math.round((H / W) * 340);
  previewCanvas.width = previewW;
  previewCanvas.height = previewH;
  previewCtx.drawImage(canvas, 0, 0, previewW, previewH);

  return canvas.toDataURL('image/png');
}

function drawCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const iw = img.width * scale;
  const ih = img.height * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  ctx.restore();
}

function frac(v, dflt) {
  return v === undefined ? dflt : v;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('load fail'));
    img.src = src;
  });
}
