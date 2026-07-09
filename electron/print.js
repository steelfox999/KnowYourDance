'use strict';

const DEFAULT_PRINT_TIMEOUT_MS = 30000;

function normalizePageSize(size) {
  const width = Number(size?.width);
  const height = Number(size?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { width: Math.round(width), height: Math.round(height) };
}

function getPrintTimeoutMs(env = process.env) {
  return parsePositiveInteger(env.SM_PRINT_TIMEOUT_MS, DEFAULT_PRINT_TIMEOUT_MS);
}

function shouldFallbackToDialog(env = process.env) {
  return env.SM_PRINT_DIALOG_FALLBACK !== '0';
}

function withTimeout(promise, timeoutMs, label) {
  const ms = parsePositiveInteger(timeoutMs, DEFAULT_PRINT_TIMEOUT_MS);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);

    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function printOnce(webContents, options, timeoutMs = DEFAULT_PRINT_TIMEOUT_MS) {
  const ms = parsePositiveInteger(timeoutMs, DEFAULT_PRINT_TIMEOUT_MS);

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (err, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) reject(err);
      else resolve(value);
    };

    const timer = setTimeout(() => {
      settle(new Error(`Print job timed out after ${ms}ms`));
    }, ms);

    try {
      webContents.print(options, (ok, failureReason) => {
        if (ok) settle(null, true);
        else settle(new Error(failureReason || 'Print job failed'));
      });
    } catch (err) {
      settle(err);
    }
  });
}

async function printWithFallback(printWindow, printOptions, opts = {}) {
  const timeoutMs = parsePositiveInteger(opts.timeoutMs, DEFAULT_PRINT_TIMEOUT_MS);
  const fallbackToDialog = opts.fallbackToDialog !== false;
  const logger = opts.logger || console;

  if (printOptions.silent === false) revealPrintWindow(printWindow);

  try {
    return await printOnce(printWindow.webContents, printOptions, timeoutMs);
  } catch (err) {
    if (!printOptions.silent || !fallbackToDialog) throw err;

    logger?.warn?.('[print] Silent printing failed; opening print dialog fallback:', err.message || err);
    revealPrintWindow(printWindow);

    const dialogOptions = { ...printOptions, silent: false };
    delete dialogOptions.deviceName;
    return printOnce(printWindow.webContents, dialogOptions, timeoutMs);
  }
}

function revealPrintWindow(printWindow) {
  if (typeof printWindow.show === 'function') printWindow.show();
  if (typeof printWindow.focus === 'function') printWindow.focus();
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

module.exports = {
  DEFAULT_PRINT_TIMEOUT_MS,
  getPrintTimeoutMs,
  normalizePageSize,
  printOnce,
  printWithFallback,
  shouldFallbackToDialog,
  withTimeout,
};
