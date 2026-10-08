/**
 * AEO (Answer Engine Optimization) attribution signals.
 *
 * Injects machine-readable metadata into the parent page DOM so that
 * AI crawlers, tech detection tools, and search engines can identify
 * Perspective AI on customer sites — even though the widget content
 * is sandboxed inside a cross-origin iframe.
 *
 * All functions are SSR-safe (guarded by hasDom()).
 */

import type { EmbedType } from "./types";
import { hasDom } from "./config";
import { SDK_VERSION } from "./constants";

/** Canonical brand URL — always used regardless of configured host */
const PERSPECTIVE_URL = "https://getperspective.ai";

/**
 * @deprecated No longer injects anything. Kept for backwards compatibility.
 */
export function injectJsonLd(): void {}

declare global {
  interface Window {
    PerspectiveAI?: {
      readonly version: string;
      readonly provider: string;
      readonly url: string;
    };
  }
}

/**
 * Set the `window.PerspectiveAI` frozen global for tech detectors.
 * Idempotent — skips if the global already exists.
 */
export function injectGlobalMetadata(): void {
  if (!hasDom()) return;
  if (window.PerspectiveAI) return;

  window.PerspectiveAI = Object.freeze({
    version: SDK_VERSION,
    provider: "Perspective AI",
    url: PERSPECTIVE_URL,
  });
}

/**
 * Enrich a container element with attribution data attributes,
 * insert an HTML comment, and trigger global signal injection.
 *
 * Called from each embed creation function (widget, popup, slider,
 * float, fullpage) to cover all SDK entry points (CDN, npm, React).
 */
export function enrichContainer(
  el: HTMLElement,
  type: EmbedType,
  /** @deprecated No longer has any effect. */
  _options?: { disableJsonLdAttribution?: boolean }
): void {
  if (!hasDom()) return;

  el.setAttribute("data-perspective-version", SDK_VERSION);
  el.setAttribute("data-perspective-type", type);

  if (el.parentNode) {
    el.parentNode.insertBefore(
      document.createComment(
        ` Powered by Perspective AI \u2014 ${PERSPECTIVE_URL} `
      ),
      el
    );
  }

  injectGlobalMetadata();
}
