export const DEFAULT_TIMEOUT_MS = 30000;

export function withTimeout(promise, timeoutMs = DEFAULT_TIMEOUT_MS, label = 'Operation') {
  const ms = parsePositiveInteger(timeoutMs, DEFAULT_TIMEOUT_MS);

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

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
