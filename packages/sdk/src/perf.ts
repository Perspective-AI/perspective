/**
 * Opt-in performance instrumentation.
 *
 * Logs are off by default — enable via either of:
 *   - `localStorage.setItem("perspective-perf-debug", "1")` in the browser console
 *   - URL param `?perfDebug=1` on the parent page (auto-forwarded to the iframe)
 *
 * Each log line carries `perf.now()` (ms since this page's nav start) AND
 * `Date.now()` (wall-clock) so the parent's and iframe's logs can be
 * correlated across origins by absolute time.
 */
import { hasDom } from "./config";

const PERF_DEBUG_LS_KEY = "perspective-perf-debug";
const PERF_DEBUG_URL_PARAM = "perfDebug";

let cached: boolean | null = null;

export function isPerfDebug(): boolean {
  if (cached !== null) return cached;
  if (!hasDom()) {
    cached = false;
    return false;
  }
  try {
    const fromLs = localStorage.getItem(PERF_DEBUG_LS_KEY) === "1";
    const fromUrl =
      new URLSearchParams(window.location.search).get(PERF_DEBUG_URL_PARAM) ===
      "1";
    cached = fromLs || fromUrl;
  } catch {
    cached = false;
  }
  return cached;
}

/** Scope label — `"SDK"` and `"SDK-React"` for the embed runtime, `"iframe"` for the embedded interview app. */
export type PerfScope = "SDK" | "SDK-React" | "iframe" | (string & {});

/** Cheap no-op when disabled. */
export function perfLog(
  scope: PerfScope,
  label: string,
  extra?: Record<string, unknown>
): void {
  if (!isPerfDebug() || !hasDom()) return;
  const navMs = Math.round(performance.now());
  // eslint-disable-next-line no-console
  console.log(`[Perspective Perf ${scope}] ${label}`, {
    "+nav (ms)": navMs,
    wallMs: Date.now(),
    ...extra,
  });
}
