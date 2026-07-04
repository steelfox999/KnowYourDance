#!/usr/bin/env node
'use strict';
/**
 * Know Your Dance ships authored SVG artwork in the theme folder.
 *
 * This script intentionally does not generate replacement art because the masks
 * are named cultural assets and should be edited or replaced deliberately.
 */
const path = require('path');

const themeDir = process.argv[2] || 'themes/know-your-dance';
console.log(`Assets for ${path.normalize(themeDir)} are checked in; no generated assets needed.`);
