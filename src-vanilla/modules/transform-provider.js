import { detectFaceLandmarks } from './face-landmarks.js';

/**
 * Transformation providers.
 *
 * The flow depends only on the TransformProvider contract:
 *     transform(photoDataUrl, promptSet, resolveAsset) -> keyed PNG data URLs
 *
 * CompositingProvider runs fully offline. It uses vendored MediaPipe face
 * landmarks when available, then falls back to browser FaceDetector or a
 * proportional kiosk-headshot layout.
 */

const TARGET = 900; // square working canvas per output

const LANDMARKS = {
  rightEye: [33, 133, 159, 145],
  leftEye: [362, 263, 386, 374],
  nose: [1, 4],
  mouth: [13, 14],
  chin: [152],
  forehead: [10],
  leftCheek: [234],
  rightCheek: [454],
};

const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454,
  323, 361, 288, 397, 365, 379, 378, 400, 377,
  152, 148, 176, 149, 150, 136, 172, 58, 132,
  93, 234, 127, 162, 21, 54, 103, 67, 109,
];

export class CompositingProvider {
  constructor() {
    this.name = 'compositing';
  }

  async transform(photoDataUrl, promptSet, resolveAsset) {
    const photo = await loadImage(photoDataUrl);
    const placement = coverPlacement(photo);
    const subject = await detectSubject(photo, placement);

    const maskUrl = await resolveAsset(promptSet.mask.asset);
    const costumeUrl = promptSet.costume?.asset ? await resolveAsset(promptSet.costume.asset) : null;
    const [maskImg, costumeImg] = await Promise.all([
      loadImage(maskUrl).catch(() => null),
      costumeUrl ? loadImage(costumeUrl).catch(() => null) : Promise.resolve(null),
    ]);

    const original = drawBase(photo, placement);
    const mask = drawBase(photo, placement);
    const costume = drawBase(photo, placement);
    const combined = drawBase(photo, placement);

    const anchors = computeAnchors(subject);

    if (costumeImg) {
      placeOverlay(costume, costumeImg, pickAnchor(anchors, promptSet.costume, 'torso'), promptSet.costume);
      placeOverlay(combined, costumeImg, pickAnchor(anchors, promptSet.costume, 'torso'), promptSet.costume);
    }
    if (maskImg) {
      placeOverlay(mask, maskImg, pickAnchor(anchors, promptSet.mask, 'face'), promptSet.mask);
      placeOverlay(combined, maskImg, pickAnchor(anchors, promptSet.mask, 'face'), promptSet.mask);
    }

    const outputs = {
      original: original.toDataURL('image/png'),
      mask: mask.toDataURL('image/png'),
    };
    if (costumeImg) {
      outputs.costume = costume.toDataURL('image/png');
      outputs.combined = combined.toDataURL('image/png');
    } else {
      outputs.combined = outputs.mask;
    }
    return outputs;
  }
}

async function detectSubject(photo, placement) {
  const landmarks = await detectFaceLandmarks(photo);
  if (landmarks?.length) return subjectFromLandmarks(landmarks, photo, placement);

  const faceBox = await detectFaceBox(photo);
  if (faceBox) return subjectFromFaceBox(faceBox, placement);

  return null;
}

function subjectFromLandmarks(landmarks, photo, placement) {
  const feature = (name) => averagePoints((LANDMARKS[name] || []).map((i) => mapLandmark(landmarks[i], photo, placement)).filter(Boolean));
  const oval = FACE_OVAL.map((i) => mapLandmark(landmarks[i], photo, placement)).filter(Boolean);
  const box = bounds(oval);

  const eyeA = feature('rightEye');
  const eyeB = feature('leftEye');
  const [leftEye, rightEye] = eyeA && eyeB && eyeA.x <= eyeB.x ? [eyeA, eyeB] : [eyeB, eyeA];
  const eyeDistance = leftEye && rightEye ? distance(leftEye, rightEye) : box.w * 0.38;
  const angle = leftEye && rightEye ? Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) : 0;

  const forehead = feature('forehead') || point(box.cx, box.y);
  const chin = feature('chin') || point(box.cx, box.y + box.h);
  const nose = feature('nose') || point(box.cx, box.cy);
  const mouth = feature('mouth') || point(box.cx, box.cy + box.h * 0.18);
  const leftCheek = feature('leftCheek');
  const rightCheek = feature('rightCheek');

  const cheekWidth = leftCheek && rightCheek ? distance(leftCheek, rightCheek) : 0;
  const faceWidth = Math.max(box.w, cheekWidth, eyeDistance * 2.45);
  const faceHeight = Math.max(box.h, distance(forehead, chin), faceWidth * 1.18);
  const faceCenter = point((forehead.x + chin.x) / 2, (forehead.y + chin.y) / 2);

  return {
    source: 'landmarks',
    angle,
    faceWidth,
    faceHeight,
    faceCenter,
    forehead,
    chin,
    nose,
    mouth,
    leftEye,
    rightEye,
  };
}

function subjectFromFaceBox(face, placement) {
  const x = face.x * placement.scale + placement.x;
  const y = face.y * placement.scale + placement.y;
  const w = face.w * placement.scale;
  const h = face.h * placement.scale;
  const faceCenter = point(x + w / 2, y + h / 2);

  return {
    source: 'box',
    angle: 0,
    faceWidth: w,
    faceHeight: h,
    faceCenter,
    forehead: point(faceCenter.x, y),
    chin: point(faceCenter.x, y + h),
    nose: faceCenter,
    mouth: point(faceCenter.x, y + h * 0.62),
    leftEye: point(x + w * 0.34, y + h * 0.42),
    rightEye: point(x + w * 0.66, y + h * 0.42),
  };
}

function computeAnchors(subject) {
  if (!subject) {
    return {
      face: { cx: TARGET * 0.5, cy: TARGET * 0.31, w: TARGET * 0.38, h: TARGET * 0.45, angle: 0 },
      head: { cx: TARGET * 0.5, cy: TARGET * 0.27, w: TARGET * 0.46, h: TARGET * 0.54, angle: 0 },
      torso: { cx: TARGET * 0.5, cy: TARGET * 0.72, w: TARGET * 0.76, h: TARGET * 0.48, angle: 0 },
    };
  }

  const faceW = subject.faceWidth;
  const faceH = subject.faceHeight;
  const headCenter = along(subject.faceCenter, subject.forehead, 0.14);
  const torsoCenter = point(
    subject.chin.x,
    subject.chin.y + faceH * 0.82
  );

  return {
    face: {
      cx: subject.faceCenter.x,
      cy: subject.faceCenter.y,
      w: faceW * 1.18,
      h: faceH * 1.1,
      angle: subject.angle,
    },
    head: {
      cx: headCenter.x,
      cy: headCenter.y,
      w: faceW * 1.42,
      h: faceH * 1.45,
      angle: subject.angle,
    },
    torso: {
      cx: torsoCenter.x,
      cy: torsoCenter.y,
      w: faceW * 2.9,
      h: faceH * 2.0,
      angle: subject.angle * 0.35,
    },
  };
}

function pickAnchor(anchors, layerCfg, fallback) {
  return anchors[layerCfg.anchor] || anchors[fallback] || anchors.face;
}

function coverPlacement(photo) {
  const scale = Math.max(TARGET / photo.width, TARGET / photo.height);
  return {
    scale,
    x: (TARGET - photo.width * scale) / 2,
    y: (TARGET - photo.height * scale) / 2,
    w: photo.width * scale,
    h: photo.height * scale,
  };
}

function drawBase(photo, placement) {
  const c = document.createElement('canvas');
  c.width = TARGET;
  c.height = TARGET;
  const ctx = c.getContext('2d');
  ctx.drawImage(photo, placement.x, placement.y, placement.w, placement.h);
  return c;
}

/** Draw an overlay image into an anchor, honoring per-layer scale/offset/rotation. */
function placeOverlay(canvas, img, anchor, layerCfg) {
  const ctx = canvas.getContext('2d');
  const scale = layerCfg.scale || 1;
  const targetW = anchor.w * scale;
  const targetH = targetW * (img.height / img.width);
  const offset = rotatePoint({
    x: (layerCfg.offsetX || 0) * anchor.w,
    y: (layerCfg.offsetY || 0) * anchor.h,
  }, anchor.angle);
  const rotation = anchor.angle + degreesToRadians(layerCfg.rotation || 0);

  ctx.save();
  if (layerCfg.opacity !== undefined) ctx.globalAlpha = layerCfg.opacity;
  ctx.translate(anchor.cx + offset.x, anchor.cy + offset.y);
  ctx.rotate(rotation);
  ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
  ctx.restore();
}

async function detectFaceBox(img) {
  try {
    if (typeof window.FaceDetector !== 'function') return null;
    const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    const faces = await detector.detect(img);
    if (faces && faces[0]) {
      const b = faces[0].boundingBox;
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    }
  } catch (_) {
    // Fall through to proportional anchoring.
  }
  return null;
}

function mapLandmark(lm, photo, placement) {
  if (!lm) return null;
  return point(
    lm.x * photo.width * placement.scale + placement.x,
    lm.y * photo.height * placement.scale + placement.y
  );
}

function averagePoints(points) {
  if (!points.length) return null;
  const sum = points.reduce((acc, p) => point(acc.x + p.x, acc.y + p.y), point(0, 0));
  return point(sum.x / points.length, sum.y / points.length);
}

function bounds(points) {
  if (!points.length) {
    return { x: TARGET * 0.32, y: TARGET * 0.12, w: TARGET * 0.36, h: TARGET * 0.42, cx: TARGET * 0.5, cy: TARGET * 0.33 };
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const w = Math.max(...xs) - x;
  const h = Math.max(...ys) - y;
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}

function along(from, to, amount) {
  return point(from.x + (to.x - from.x) * amount, from.y + (to.y - from.y) * amount);
}

function rotatePoint(p, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return point(p.x * cos - p.y * sin, p.x * sin + p.y * cos);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function degreesToRadians(deg) {
  return (deg * Math.PI) / 180;
}

function point(x, y) {
  return { x, y };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image: ' + src));
    img.src = src;
  });
}
