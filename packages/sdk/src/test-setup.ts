/**
 * Suppress happy-dom teardown noise in stderr.
 *
 * Happy-dom tries to fetch iframe URLs and load resources when tests set
 * iframe.src. During teardown, vitest calls happyDOM.abort() which destroys
 * in-flight HTTP streams, producing DOMException errors. Between tests,
 * destroyed async task managers produce "startTask()" errors when queued
 * operations fire after cleanup.
 *
 * These are cosmetic errors from the vitest/happy-dom integration that
 * cannot be suppressed through happy-dom settings or process-level error
 * handlers (vitest's internal Traces system bypasses both).
 *
 * This filter intercepts stderr writes and drops the specific happy-dom
 * patterns while allowing all other output through.
 *
 * @see https://github.com/capricorn86/happy-dom/issues/1663
 */
const originalWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = function (chunk: any, ...args: any[]) {
  const str = typeof chunk === "string" ? chunk : (chunk?.toString?.() ?? "");
  if (
    str.includes("Fetch.onAsyncTaskManagerAbort") ||
    (str.includes("Fetch.onError") &&
      str.includes("The operation was aborted")) ||
    str.includes("The asynchronous task manager has been destroyed")
  ) {
    return true;
  }
  return originalWrite(chunk, ...args);
} as typeof process.stderr.write;
