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
    const filename = `know_your_dance_${Date.now()}.png`;

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
          {print.title || 'Your Know Your Dance Keepsake'}
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
  return [print.page?.widthMm || 210, print.page?.heightMm || 148];
}

async function composeSheet(cfg, session, previewCanvas) {
  const print = cfg.print || {};
  const dpi = print.page?.dpi || 300;
  const [wmm, hmm] = pageMM(print);
  const W = Math.round((wmm / MM_PER_INCH) * dpi);
  const H = Math.round((hmm / MM_PER_INCH) * dpi);

  await document.fonts?.ready;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = print.background || '#FFFDF8';
  ctx.fillRect(0, 0, W, H);
  drawBackgroundPattern(ctx, W, H);

  const order = print.order || ['maskVar1', 'original', 'maskVar2'];
  const images = await Promise.all(order.map((key) => loadOptionalImage(session.outputs?.[key])));
  const logos = await Promise.all((print.logos || []).map((logo) => loadOptionalImage(logo.src)));
  const alignment = session.outputs?._alignment;

  drawPortraitRow(ctx, images, W, H, alignment);
  drawCaption(ctx, session, print, W, H);
  drawLogos(ctx, logos, print.logos || [], W, H);
  drawFooter(ctx, print, W, H);
  drawPreview(canvas, previewCanvas);

  return canvas.toDataURL('image/png');
}

function drawBackgroundPattern(ctx, W, H) {
  const motifW = W * 0.085;
  const motifH = H * 0.13;
  const gapX = W * 0.006;
  const gapY = H * 0.023;

  ctx.save();
  ctx.strokeStyle = '#F1DEC8';
  ctx.lineWidth = Math.max(1, W * 0.00065);
  ctx.globalAlpha = 0.48;

  for (let y = -motifH * 0.35; y < H + motifH; y += motifH + gapY) {
    for (let x = -motifW * 0.5; x < W + motifW; x += motifW + gapX) {
      drawRoundedMotif(ctx, x, y, motifW, motifH);
    }
  }
  ctx.restore();
}

function drawRoundedMotif(ctx, x, y, w, h) {
  const r = Math.min(w, h) * 0.28;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r * 1.35);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r * 1.35);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.stroke();
}

function drawPortraitRow(ctx, images, W, H, alignment) {
  const tileW = W * 0.247;
  const tileH = H * 0.44;
  const gap = W * 0.071;
  const x0 = (W - tileW * 3 - gap * 2) / 2;
  const y = H * 0.087;

  images.forEach((img, index) => {
    const x = x0 + index * (tileW + gap);
    ctx.fillStyle = '#EFEFEF';
    ctx.fillRect(x, y, tileW, tileH);

    if (img) {
      drawAlignedCover(ctx, img, x, y, tileW, tileH, alignment);
    } else {
      drawPortraitPlaceholder(ctx, x, y, tileW, tileH);
    }
  });
}

function drawPortraitPlaceholder(ctx, x, y, w, h) {
  const centerX = x + w / 2;
  const headR = w * 0.19;

  ctx.save();
  ctx.fillStyle = '#D5D5D5';
  ctx.beginPath();
  ctx.arc(centerX, y + h * 0.47, headR, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centerX, y + h * 0.98, w * 0.39, Math.PI, Math.PI * 2);
  ctx.lineTo(centerX + w * 0.39, y + h);
  ctx.lineTo(centerX - w * 0.39, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCaption(ctx, session, print, W, H) {
  const character = session.character || {};
  const title = character.name || print.defaultTitle || 'Know Your Dance';
  const copy = session.revealText || `Your portrait carries the presence of ${title}.`;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = print.titleColor || '#A51F2B';
  ctx.font = `500 ${Math.round(H * 0.056)}px "Cinzel", serif`;
  ctx.fillText(title, W / 2, H * 0.646);

  ctx.fillStyle = print.descriptionColor || '#8B472E';
  ctx.font = `${Math.round(H * 0.027)}px "Inter", sans-serif`;
  wrapText(ctx, copy, W / 2, H * 0.712, W * 0.68, H * 0.037, 3, 'center');
  ctx.restore();
}

function drawLogos(ctx, logoImages, logoConfig, W, H) {
  const box = H * 0.145;
  const gap = W * 0.028;
  const x0 = W * 0.12;
  const y = H * 0.805;

  logoImages.forEach((img, index) => {
    if (!img) return;
    const cfg = logoConfig[index] || {};
    const boxW = cfg.widthPct ? W * cfg.widthPct : box;
    const boxH = cfg.heightPct ? H * cfg.heightPct : box;
    const x = cfg.xPct ? W * cfg.xPct : x0 + index * (boxW + gap);
    drawContain(ctx, img, x, y, boxW, boxH);
  });
}

function drawFooter(ctx, print, W, H) {
  const footer = print.footer || '';
  if (!footer) return;

  ctx.save();
  ctx.fillStyle = print.footerColor || '#1F1F1F';
  ctx.textAlign = 'center';
  ctx.font = `${Math.round(H * 0.014)}px "Inter", sans-serif`;
  wrapText(ctx, footer, W * 0.69, H * 0.865, W * 0.48, H * 0.019, 4, 'center');
  ctx.restore();
}

function drawAlignedCover(ctx, img, x, y, w, h, alignment) {
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

  let cropH = Math.max(faceH * 2.2, (faceW * 1.75) / targetAspect);
  cropH = clamp(cropH, img.height * 0.62, img.height);
  let cropW = cropH * targetAspect;

  if (cropW > img.width) {
    cropW = img.width;
    cropH = cropW / targetAspect;
  }

  const x = clamp(cx - cropW * 0.5, 0, img.width - cropW);
  const y = clamp(cy - cropH * 0.43, 0, img.height - cropH);
  return { x, y, w: cropW, h: cropH };
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

function drawContain(ctx, img, x, y, w, h) {
  const scale = Math.min(w / img.width, h / img.height);
  const iw = img.width * scale;
  const ih = img.height * scale;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = Infinity, align = 'left') {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  let line = '';
  let lines = 0;

  ctx.textAlign = align;
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
  const previewW = 596;
  const previewH = Math.round((canvas.height / canvas.width) * previewW);
  previewCanvas.width = previewW;
  previewCanvas.height = previewH;
  previewCtx.drawImage(canvas, 0, 0, previewW, previewH);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function loadOptionalImage(src) {
  if (!src) return Promise.resolve(null);
  return loadImage(src).catch((err) => {
    console.warn('Unable to load print asset:', src, err);
    return null;
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('load fail'));
    img.src = src;
  });
}
