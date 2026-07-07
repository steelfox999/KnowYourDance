'use strict';
/**
 * Preload bridge. Renderer reads themes/assets over the internal http server
 * (same as web mode), so only disk + printer operations need native access here.
 * In web mode `window.platform` is absent and platform.js uses browser fallbacks.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('platform', {
  env: 'electron',
  listThemes: () => ipcRenderer.invoke('themes:list'),
  writeJson: (themeId, relPath, data) => ipcRenderer.invoke('themes:writeJson', themeId, relPath, data),
  savePng: (filename, base64) => ipcRenderer.invoke('output:savePng', filename, base64),
  printSheet: (html, options) => ipcRenderer.invoke('print:sheet', html, options),
});
