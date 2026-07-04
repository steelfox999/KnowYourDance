'use strict';
/**
 * Internal static server used by BOTH the Electron app and `npm run web`.
 * Serving over http://127.0.0.1 (instead of file://) keeps every asset same-origin,
 * so drawing theme SVGs/PNGs into a canvas never taints it — the print engine's
 * toDataURL() works identically on Windows, macOS, and in a plain browser.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp3': 'audio/mpeg',
  '.wasm': 'application/wasm', '.task': 'application/octet-stream',
};

function createServer(root) {
  return http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';
    let filePath = (urlPath.startsWith('/themes/') || urlPath.startsWith('/vendor/'))
      ? path.join(root, urlPath)
      : path.join(root, 'dist', urlPath);
    filePath = path.normalize(filePath);
    if (!filePath.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found: ' + urlPath); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(filePath)] || 'application/octet-stream' });
      res.end(data);
    });
  });
}

/** Start on an ephemeral port bound to loopback; resolve with the base URL. */
function startServer(root) {
  return new Promise((resolve) => {
    const server = createServer(root);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

module.exports = { createServer, startServer };
