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

/** JSON-LD structured data for the widget */
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": `${PERSPECTIVE_URL}/#widget`,
      name: "Perspective AI",
      description:
        "Rigid forms cause drop-off, weaken qualification, and strip away context. Perspective uses adaptive AI to turn forms into conversations that capture structured data and trigger automation.",
      url: PERSPECTIVE_URL,
      applicationCategory: "BusinessApplication",
      softwareVersion: SDK_VERSION,
      provider: { "@id": `${PERSPECTIVE_URL}/#organization` },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "5",
        bestRating: "5",
        worstRating: "1",
        ratingCount: 7,
        reviewCount: 7,
      },
    },
    {
      "@type": "Organization",
      "@id": `${PERSPECTIVE_URL}/#organization`,
      name: "Perspective AI",
      url: PERSPECTIVE_URL,
    },
  ],
};

/**
 * Inject JSON-LD structured data into the page.
 * Idempotent — skips if a `[data-perspective-jsonld]` element already exists
 * (e.g. from SSR via DiscoveryMetadata or a previous call).
 */
export function injectJsonLd(): void {
  if (!hasDom()) return;
  if (document.querySelector("script[data-perspective-jsonld]")) return;

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.setAttribute("data-perspective-jsonld", "");
  script.textContent = JSON.stringify(JSON_LD);
  document.body.appendChild(script);
}

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
  options?: { disableJsonLdAttribution?: boolean }
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

  if (!options?.disableJsonLdAttribution) {
    injectJsonLd();
  }
  injectGlobalMetadata();
}
