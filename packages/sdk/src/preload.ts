/**
 * Hidden iframe preloading for button-triggered embeds
 * SSR-safe - all DOM access is guarded
 */

import type { BrandColors, EmbedType, ThemeValue } from "./types";
import { hasDom } from "./config";
import {
  createIframe,
  setupMessageListener,
  registerIframe,
  ensureGlobalListeners,
} from "./iframe";
import { getTimer, removeTimer } from "./timing";

const PRELOAD_ATTR = "data-perspective-preload";

type PreloadState = {
  iframe: HTMLIFrameElement;
  researchId: string;
  cleanup: () => void;
};

let preloaded: PreloadState | null = null;

/**
 * Preload an iframe in a hidden state for a button-triggered embed.
 * Only one preloaded iframe at a time — subsequent calls replace the previous.
 */
export function preloadIframe(
  researchId: string,
  type: EmbedType,
  host: string,
  params?: Record<string, string>,
  brand?: { light?: BrandColors; dark?: BrandColors },
  themeOverride?: ThemeValue
): void {
  if (!hasDom()) return;

  destroyPreloaded();

  ensureGlobalListeners();

  const iframe = createIframe(
    researchId,
    type,
    host,
    params,
    brand,
    themeOverride
  );
  iframe.setAttribute(PRELOAD_ATTR, researchId);
  iframe.style.position = "fixed";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.overflow = "hidden";

  // Set up message listener so perspective:ready is handled during preload
  const msgCleanup = setupMessageListener(researchId, {}, iframe, host, {
    skipResize: true,
  });
  const unregister = registerIframe(iframe, host);

  document.body.appendChild(iframe);
  preloaded = {
    iframe,
    researchId,
    cleanup: () => {
      msgCleanup();
      unregister();
    },
  };

  getTimer(researchId).mark("iframe:preloadStarted");
}

/**
 * Claim a preloaded iframe for use. Returns the iframe if available for the
 * given researchId, or null. Caller is responsible for moving it into the
 * target container and re-setting up message listeners.
 */
export function claimPreloadedIframe(
  researchId: string
): HTMLIFrameElement | null {
  if (!preloaded || preloaded.researchId !== researchId) {
    return null;
  }

  const { iframe, cleanup } = preloaded;
  iframe.removeAttribute(PRELOAD_ATTR);

  // Clean up preload-phase listeners — caller will set up their own
  cleanup();
  preloaded = null;

  getTimer(researchId).mark("iframe:preloadClaimed");
  return iframe;
}

/** Destroy any preloaded iframe */
export function destroyPreloaded(): void {
  if (preloaded) {
    preloaded.cleanup();
    preloaded.iframe.remove();
    removeTimer(preloaded.researchId);
    preloaded = null;
  }
}
