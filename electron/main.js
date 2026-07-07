'use strict';
/**
 * Story Machine — Electron main process.
 * Starts an internal loopback server, opens the kiosk window against it, and
 * exposes a minimal IPC surface for disk writes + printing. NO business logic
 * lives here; the engine and all theme behaviour run in the renderer, driven by JSON.
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { startServer } = require('./server');

const ROOT = path.join(__dirname, '..');
const THEMES_DIR = path.join(ROOT, 'themes');
const OUTPUT_DIR = path.join(app.getPath('pictures'), 'StoryMachine');
const KIOSK = process.env.SM_KIOSK !== '0';

let mainWindow = null;
let baseUrl = null;

async function createWindow() {
  const started = await startServer(ROOT);
  baseUrl = started.url;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#141013',
    fullscreen: KIOSK,
    kiosk: KIOSK,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(baseUrl + '/index.html');

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape' && KIOSK) {
      mainWindow.setKiosk(false);
      mainWindow.setFullScreen(false);
    }
  });
}

/* ------------------------------- IPC ------------------------------- */

ipcMain.handle('themes:list', () => {
  if (!fs.existsSync(THEMES_DIR)) return [];
  return fs.readdirSync(THEMES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(THEMES_DIR, d.name, 'experience.json')))
    .map((d) => d.name);
});

// Persist a JSON config back to disk (admin builders).
ipcMain.handle('themes:writeJson', (_e, themeId, relPath, data) => {
  const full = safeThemePath(themeId, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(data, null, 2), 'utf-8');
  return true;
});

// Save a finished print sheet (base64 PNG) to the user's Pictures folder.
ipcMain.handle('output:savePng', (_e, filename, base64) => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const clean = String(base64).replace(/^data:image\/png;base64,/, '');
  const dest = path.join(OUTPUT_DIR, sanitize(filename));
  fs.writeFileSync(dest, Buffer.from(clean, 'base64'));
  return dest;
});

// Print an isolated print page (built by the renderer).
ipcMain.handle('print:sheet', async (_e, html, options = {}) => {
  const printWin = new BrowserWindow({ show: false });
  try {
    await printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    await printWin.webContents.executeJavaScript(`
      Promise.all([
        document.fonts?.ready || Promise.resolve(),
        ...Array.from(document.images).map((img) => img.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
            }))
      ])
    `);

    const printOptions = {
      silent: true,
      printBackground: true,
      landscape: options.landscape === true,
      margins: { marginType: 'none' },
    };
    const pageSize = normalizePageSize(options.pageSizeMicrons);
    if (pageSize) printOptions.pageSize = pageSize;
    if (process.env.SM_PRINTER) printOptions.deviceName = process.env.SM_PRINTER;

    return await new Promise((resolve, reject) => {
      printWin.webContents.print(printOptions, (ok, failureReason) => {
        if (ok) resolve(true);
        else reject(new Error(failureReason || 'Silent print failed'));
      });
    });
  } finally {
    if (!printWin.isDestroyed()) {
      printWin.close();
    }
  }
});

function normalizePageSize(size) {
  const width = Number(size?.width);
  const height = Number(size?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { width: Math.round(width), height: Math.round(height) };
}

function safeThemePath(themeId, relPath) {
  const base = path.join(THEMES_DIR, sanitize(themeId));
  const full = path.normalize(path.join(base, relPath || ''));
  if (!full.startsWith(base)) throw new Error('Path escapes theme sandbox: ' + relPath);
  return full;
}
function sanitize(name) { return String(name).replace(/[^a-zA-Z0-9._-]/g, '_'); }

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
