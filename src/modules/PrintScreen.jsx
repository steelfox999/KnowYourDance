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
      <GlassCard className="glass-card-md print-card">
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

  if (print.layout === 'wide-polaroid-triptych') {
    await composeWidePolaroidSheet(cfg, session, print, canvas, previewCanvas, W, H);
    return canvas.toDataURL('image/png');
  }

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

async function composeWidePolaroidSheet(cfg, session, print, canvas, previewCanvas, W, H) {
  const ctx = canvas.getContext('2d');
  const order = (print.order || ['maskVar1', 'original', 'maskVar2']).filter((key) => session.outputs?.[key]);
  const images = await Promise.all(order.map((key) => loadImage(session.outputs[key])));
  const labels = print.labels || {};
  const character = session.character || {};
  const alignment = session.outputs?._alignment;

  drawSubtleBackground(ctx, W, H);

  const cardX = Math.round(W * 0.055);
  const cardY = Math.round(H * 0.06);
  const cardW = W - cardX * 2;
  const cardH = H - cardY * 2;

  ctx.save();
  ctx.shadowColor = 'rgba(44, 36, 27, 0.12)';
  ctx.shadowBlur = Math.round(W * 0.02);
  ctx.shadowOffsetY = Math.round(H * 0.014);
  ctx.fillStyle = '#fffdf7';
  ctx.fillRect(cardX, cardY, cardW, cardH);
  ctx.restore();

  ctx.strokeStyle = '#E2D7C1';
  ctx.lineWidth = Math.max(2, Math.round(W * 0.0009));
  ctx.strokeRect(cardX, cardY, cardW, cardH);

  const innerX = Math.round(cardW * 0.046);
  const topInset = Math.round(cardH * 0.075);
  const photoX = cardX + innerX;
  const photoY = cardY + topInset;
  const photoW = cardW - innerX * 2;
  const photoH = Math.round(cardH * 0.575);
  const paneGap = Math.max(10, Math.round(W * 0.004));
  const paneCount = Math.max(images.length, 1);
  const paneW = (photoW - paneGap * (paneCount - 1)) / paneCount;

  ctx.fillStyle = '#1F1916';
  ctx.fillRect(photoX, photoY, photoW, photoH);

  images.forEach((img, index) => {
    const pane = {
      x: photoX + index * (paneW + paneGap),
      y: photoY,
      w: paneW,
      h: photoH,
    };
    drawTriptychPane(ctx, img, pane, labels[order[index]] || order[index], order[index] === 'original', alignment);
  });

  for (let i = 1; i < paneCount; i++) {
    const x = photoX + i * paneW + (i - 0.5) * paneGap;
    ctx.fillStyle = '#fffdf7';
    ctx.fillRect(x - paneGap / 2, photoY, paneGap, photoH);
  }

  ctx.strokeStyle = '#C09A3F';
  ctx.lineWidth = Math.max(3, Math.round(W * 0.0012));
  ctx.strokeRect(photoX, photoY, photoW, photoH);

  const captionY = photoY + photoH + Math.round(cardH * 0.095);
  const textX = cardX + innerX;
  const textW = cardW - innerX * 2;

  ctx.strokeStyle = '#E2D7C1';
  ctx.lineWidth = Math.max(1, Math.round(W * 0.0006));
  ctx.beginPath();
  ctx.moveTo(textX, captionY - Math.round(H * 0.042));
  ctx.lineTo(textX + textW, captionY - Math.round(H * 0.042));
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#8E341B';
  ctx.font = `${Math.round(H * 0.036)}px "Didact Gothic", sans-serif`;
  ctx.fillText('Know Your Dance', textX, captionY);

  ctx.fillStyle = '#C09A3F';
  ctx.font = `600 ${Math.round(H * 0.014)}px "Albert Sans", sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText(character.name || 'Your Chosen Mask', textX + textW, captionY);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#2C241B';
  ctx.font = `500 ${Math.round(H * 0.017)}px "Albert Sans", sans-serif`;
  ctx.fillText('MASK VAR 1  /  ORIGINAL PORTRAIT  /  MASK VAR 2', textX, captionY + Math.round(H * 0.035));

  ctx.font = `${Math.round(H * 0.018)}px "Albert Sans", sans-serif`;
  const description = [
    session.revealText || `Your answers aligned with ${character.name || 'this mask'}.`,
    character.title ? `Chosen mask: ${character.title}.` : '',
  ].filter(Boolean).join(' ');
  wrapText(ctx, description, textX, captionY + Math.round(H * 0.075), textW, Math.round(H * 0.029), 3);

  ctx.fillStyle = '#8A7B6E';
  ctx.font = `500 ${Math.round(H * 0.012)}px "Albert Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('EXHIBIT SOUVENIR - A5 LANDSCAPE INSTANT PRINT', cardX + cardW / 2, cardY + cardH - Math.round(H * 0.028));

  drawPreview(canvas, previewCanvas);
}

function drawSubtleBackground(ctx, W, H) {
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#F8F5F0');
  bg.addColorStop(0.55, '#fffaf0');
  bg.addColorStop(1, '#EDE1CA');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(192, 154, 63, 0.08)';
  for (let i = 0; i < 32; i++) {
    const x = (i * 521) % W;
    const y = (i * 283) % H;
    const r = 5 + (i % 4) * 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTriptychPane(ctx, img, pane, label, isOriginal, alignment) {
  drawFaceAlignedCover(ctx, img, pane.x, pane.y, pane.w, pane.h, alignment);

  const labelH = Math.round(pane.h * 0.085);
  const gradient = ctx.createLinearGradient(0, pane.y + pane.h - labelH * 1.8, 0, pane.y + pane.h);
  gradient.addColorStop(0, 'rgba(31, 25, 22, 0)');
  gradient.addColorStop(1, 'rgba(31, 25, 22, 0.66)');
  ctx.fillStyle = gradient;
  ctx.fillRect(pane.x, pane.y + pane.h - labelH * 1.8, pane.w, labelH * 1.8);

  if (isOriginal) {
    ctx.strokeStyle = '#F3C969';
    ctx.lineWidth = Math.max(3, Math.round(pane.w * 0.01));
    ctx.strokeRect(pane.x + 1, pane.y + 1, pane.w - 2, pane.h - 2);
  }

  ctx.fillStyle = '#FFF8E9';
  ctx.textAlign = 'center';
  ctx.font = `600 ${Math.round(pane.h * 0.032)}px "Albert Sans", sans-serif`;
  ctx.fillText(label.toUpperCase(), pane.x + pane.w / 2, pane.y + pane.h - Math.round(labelH * 0.42));
}

function drawFaceAlignedCover(ctx, img, x, y, w, h, alignment) {
  const crop = faceCrop(img, w / h, alignment);
  if (!crop) {
    drawCover(ctx, img, x, y, w, h);
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, x, y, w, h);
  ctx.restore();
}

function faceCrop(img, targetAspect, alignment) {
  const face = alignment?.face;
  const target = alignment?.target;
  if (!face || !target?.width || !target?.height) return null;

  const scaleX = img.width / target.width;
  const scaleY = img.height / target.height;
  const cx = face.cx * scaleX;
  const cy = face.cy * scaleY;
  const faceW = face.w * scaleX;
  const faceH = face.h * scaleY;
  if (![cx, cy, faceW, faceH].every(Number.isFinite) || faceW <= 0 || faceH <= 0) return null;

  let cropH = Math.max(faceH * 2.22, (faceW * 1.82) / targetAspect);
  cropH = clamp(cropH, img.height * 0.62, img.height);
  let cropW = cropH * targetAspect;

  if (cropW > img.width) {
    cropW = img.width;
    cropH = cropW / targetAspect;
  }

  const faceYInPane = 0.43;
  const x = clamp(cx - cropW * 0.5, 0, img.width - cropW);
  const y = clamp(cy - cropH * faceYInPane, 0, img.height - cropH);
  return { x, y, w: cropW, h: cropH };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = Infinity) {
  const words = String(text).split(/\s+/);
  let line = '';
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines++;
      if (lines >= maxLines) {
        ctx.fillText(`${line.replace(/[,.]$/, '')}...`, x, y);
        return;
      }
      ctx.fillText(line, x, y);
      line = words[i];
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line && lines < maxLines) ctx.fillText(line, x, y);
}

function drawPreview(canvas, previewCanvas) {
  const previewCtx = previewCanvas.getContext('2d');
  const previewW = 520;
  const previewH = Math.round((canvas.height / canvas.width) * previewW);
  previewCanvas.width = previewW;
  previewCanvas.height = previewH;
  previewCtx.drawImage(canvas, 0, 0, previewW, previewH);
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
