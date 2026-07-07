/**
 * Platform abstraction. The engine calls these and never knows whether it runs in
 * Electron (window.platform present) or a plain browser. Both serve the app over
 * http (Electron uses an internal loopback server), so reads/assets are identical
 * and only disk writes + printing differ.
 */
const hasNative = typeof window !== 'undefined' && !!window.platform;

export const ENV = hasNative ? window.platform.env : 'web';

export async function listThemes() {
  if (hasNative) return window.platform.listThemes();
  const res = await fetch('/themes/themes.json');
  return res.ok ? res.json() : ['know-your-dance'];
}

// Reads always go over http (same-origin), so JSON parses identically everywhere.
export async function readJson(themeId, relPath) {
  const res = await fetch(`/themes/${themeId}/${relPath}`);
  if (!res.ok) throw new Error(`Cannot load ${relPath} (${res.status})`);
  return res.json();
}

// Assets resolve to same-origin relative URLs — no file:// canvas tainting.
export function assetUrl(themeId, relPath) {
  return `/themes/${themeId}/${relPath}`;
}

export async function writeJson(themeId, relPath, data) {
  if (hasNative) return window.platform.writeJson(themeId, relPath, data);
  throw new Error('Saving to disk requires the desktop app.');
}

export async function savePng(filename, base64) {
  if (hasNative) return window.platform.savePng(filename, base64);
  triggerDownload(filename, base64);
  return filename;
}

export async function printHtml(html, options = {}) {
  if (hasNative) return window.platform.printSheet(html, options);
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
  return true;
}

function triggerDownload(filename, dataUrl) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : false;
}
