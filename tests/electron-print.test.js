'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizePageSize,
  printOnce,
  printWithFallback,
  withTimeout,
} = require('../electron/print');

test('withTimeout rejects unresolved print stages instead of hanging forever', async () => {
  await assert.rejects(
    () => withTimeout(new Promise(() => {}), 5, 'Silent print'),
    /Silent print timed out after 5ms/
  );
});

test('printOnce rejects when Electron print callback never fires', async () => {
  let calls = 0;
  const webContents = {
    print(options) {
      calls += 1;
      assert.equal(options.silent, true);
    },
  };

  await assert.rejects(
    () => printOnce(webContents, { silent: true }, 5),
    /Print job timed out after 5ms/
  );
  assert.equal(calls, 1);
});

test('printWithFallback opens a visible print dialog after silent printing stalls', async () => {
  const calls = [];
  const printWindow = {
    showCount: 0,
    focusCount: 0,
    show() { this.showCount += 1; },
    focus() { this.focusCount += 1; },
    webContents: {
      print(options, callback) {
        calls.push(options);
        if (calls.length === 2) callback(true);
      },
    },
  };

  const result = await printWithFallback(
    printWindow,
    { silent: true, printBackground: true, deviceName: 'Missing_Printer' },
    { timeoutMs: 5, logger: null }
  );

  assert.equal(result, true);
  assert.deepEqual(calls.map((options) => options.silent), [true, false]);
  assert.equal('deviceName' in calls[1], false);
  assert.equal(printWindow.showCount, 1);
  assert.equal(printWindow.focusCount, 1);
});

test('printWithFallback respects disabled dialog fallback', async () => {
  const calls = [];
  const printWindow = {
    show() { throw new Error('should not show fallback dialog'); },
    focus() { throw new Error('should not focus fallback dialog'); },
    webContents: {
      print(options) {
        calls.push(options);
      },
    },
  };

  await assert.rejects(
    () => printWithFallback(printWindow, { silent: true }, {
      timeoutMs: 5,
      fallbackToDialog: false,
      logger: null,
    }),
    /Print job timed out after 5ms/
  );
  assert.equal(calls.length, 1);
});

test('normalizePageSize rounds positive micron dimensions and rejects invalid sizes', () => {
  assert.deepEqual(
    normalizePageSize({ width: 148000.4, height: 210000.5 }),
    { width: 148000, height: 210001 }
  );
  assert.equal(normalizePageSize({ width: 0, height: 210000 }), null);
  assert.equal(normalizePageSize({ width: 148000, height: Infinity }), null);
});
