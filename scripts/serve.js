#!/usr/bin/env node
'use strict';
/**
 * Browser-mode launcher. Runs the SAME internal server the desktop app uses, on a
 * fixed port, so you can test the whole kiosk in a normal browser:
 *   npm run web   ->  http://localhost:4173
 * Camera falls back to a file picker if the browser blocks it; everything else is
 * identical to the desktop app.
 */
const path = require('path');
const { createServer } = require('../electron/server');

const ROOT = path.join(__dirname, '..');
const PORT = parseInt(process.env.PORT || '4173', 10);

const server = createServer(ROOT);

function start(port) {
  server.listen(port, () => {
    console.log(`\nStory Machine (web mode) -> http://localhost:${port}\n`);
    console.log('Camera uses your webcam if permitted, else a file picker. Ctrl+C to stop.\n');
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${err.port} is busy, trying port ${err.port + 1}...`);
    start(err.port + 1);
  } else {
    console.error('Server error:', err);
  }
});

start(PORT);
