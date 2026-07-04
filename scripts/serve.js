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
const PORT = process.env.PORT || 4173;

createServer(ROOT).listen(PORT, () => {
  console.log(`\nStory Machine (web mode) -> http://localhost:${PORT}\n`);
  console.log('Camera uses your webcam if permitted, else a file picker. Ctrl+C to stop.\n');
});
