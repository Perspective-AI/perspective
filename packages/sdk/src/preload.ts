/**
 * Preload iframe document to eliminate network latency from the critical path.
 *
 * Injects a `<link rel="preload" as="document">` into `<head>` so the browser
 * begins fetching the iframe HTML before the iframe element is created.
 * When `createWidget` later sets the same URL as iframe.src, the browser
 * reuses the already-in-flight (or cached) response.
 *
 * SSR-safe - no-ops on server.
 */

import type { BrandColors, EmbedType } from "./types";
import type { ThemeValue } from "./constants";
import { buildIframeUrl } from "./iframe";
import { getHost, hasDom } from "./config";

/** Track preloaded URLs to avoid duplicate link elements */
const preloaded = new Set<string>();

export interface PreloadOptions {
  /** Embed type (default: "widget") */
  type?: EmbedType;
  /** Custom params to pass to the interview */
  params?: Record<string, string>;
  /** Brand colors */
  brand?: { light?: BrandColors; dark?: BrandColors };
  /** Theme override */
  theme?: ThemeValue;
  /** Override the default host */
  host?: string;
}

/**
 * Preload an interview iframe document.
 *
 * Call this as early as possible — ideally at render time (not in useEffect)
 * or during autoInit — to give the browser a head start on fetching the
 * iframe HTML document.
 *
 * Safe to call multiple times with the same arguments (idempotent).
 * Safe to call on the server (no-ops).
 */
export function preload(researchId: string, options?: PreloadOptions): void {
  if (!hasDom()) return;

  const host = getHost(options?.host);
  const url = buildIframeUrl(
    researchId,
    options?.type ?? "widget",
    host,
    options?.params,
    options?.brand,
    options?.theme
  );

  // Don't preload the same URL twice
  if (preloaded.has(url)) return;
  preloaded.add(url);

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "document";
  link.href = url;
  document.head.appendChild(link);
}
