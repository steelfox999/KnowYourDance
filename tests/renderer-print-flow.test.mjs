import test from 'node:test';
import assert from 'node:assert/strict';

import { withTimeout } from '../src/core/async.mjs';
import { shouldStartAutoPrint } from '../src/modules/print-flow.mjs';
import {
  ELECTRON_PRINT_TIMEOUT_MS,
  PRINT_STAGE_COUNT,
  PRINT_TIMEOUT_BUFFER_MS,
  RENDERER_PRINT_TIMEOUT_MS,
} from '../src/modules/print-timeouts.mjs';

test('renderer withTimeout rejects unresolved work instead of leaving a screen spinning', async () => {
  await assert.rejects(
    () => withTimeout(new Promise(() => {}), 5, 'Composing print sheet'),
    /Composing print sheet timed out after 5ms/
  );
});

test('auto print starts only once for a rendered sheet', () => {
  assert.equal(shouldStartAutoPrint({
    sheetDataUrl: 'data:image/png;base64,abc',
    isPrinting: false,
    hasAttemptedPrint: false,
  }), true);

  assert.equal(shouldStartAutoPrint({
    sheetDataUrl: 'data:image/png;base64,abc',
    isPrinting: false,
    hasAttemptedPrint: true,
  }), false);

  assert.equal(shouldStartAutoPrint({
    sheetDataUrl: null,
    isPrinting: false,
    hasAttemptedPrint: false,
  }), false);
});

test('renderer print timeout budget covers Electron silent print fallback stages', () => {
  assert.equal(
    RENDERER_PRINT_TIMEOUT_MS,
    ELECTRON_PRINT_TIMEOUT_MS * PRINT_STAGE_COUNT + PRINT_TIMEOUT_BUFFER_MS
  );
  assert.ok(RENDERER_PRINT_TIMEOUT_MS > ELECTRON_PRINT_TIMEOUT_MS * PRINT_STAGE_COUNT);
});
