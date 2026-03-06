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
  type: EmbedType;
  cleanup: () => void;
  ready: boolean;
};

function preloadKey(researchId: string, type: EmbedType): string {
  return `${researchId}:${type}`;
}

const preloaded = new Map<string, PreloadState>();

/**
 * Preload an iframe in a hidden state for a button-triggered embed.
 * Multiple preloaded iframes can coexist, keyed by researchId + type.
 * Re-preloading the same researchId + type replaces the previous one.
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

  const key = preloadKey(researchId, type);
  destroyPreloadedEntry(key);
  createPreloadedEntry(
    key,
    researchId,
    type,
    host,
    params,
    brand,
    themeOverride
  );
}

export function ensurePreloadedIframe(
  researchId: string,
  type: EmbedType,
  host: string,
  params?: Record<string, string>,
  brand?: { light?: BrandColors; dark?: BrandColors },
  themeOverride?: ThemeValue
): void {
  if (!hasDom()) return;

  const key = preloadKey(researchId, type);
  if (preloaded.has(key)) return;
  createPreloadedEntry(
    key,
    researchId,
    type,
    host,
    params,
    brand,
    themeOverride
  );
}

function createPreloadedEntry(
  key: string,
  researchId: string,
  type: EmbedType,
  host: string,
  params?: Record<string, string>,
  brand?: { light?: BrandColors; dark?: BrandColors },
  themeOverride?: ThemeValue
): void {
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

  // Set up message listener so perspective:ready is handled during preload.
  // Track ready state so callers know if callbacks need replaying after claim.
  const state: PreloadState = {
    iframe,
    researchId,
    type,
    ready: false,
    cleanup: () => {},
  };
  const msgCleanup = setupMessageListener(
    researchId,
    {
      onReady: () => {
        state.ready = true;
      },
    },
    iframe,
    host,
    { skipResize: true }
  );
  const unregister = registerIframe(iframe, host);

  document.body.appendChild(iframe);
  state.cleanup = () => {
    msgCleanup();
    unregister();
  };
  preloaded.set(key, state);

  getTimer(researchId).mark("iframe:preloadStarted");
}

export type ClaimedPreload = {
  iframe: HTMLIFrameElement;
  /** Whether perspective:ready already fired during preload */
  wasReady: boolean;
};

/**
 * Claim a preloaded iframe for use. Returns the iframe and its ready state
 * if available for the given researchId + type, or null. Caller is responsible
 * for moving it into the target container, re-setting up message listeners,
 * and replaying onReady/onAuth if wasReady is true.
 */
export function claimPreloadedIframe(
  researchId: string,
  type: EmbedType
): ClaimedPreload | null {
  const key = preloadKey(researchId, type);
  const state = preloaded.get(key);
  if (!state) return null;
  return claimState(key, state);
}

function claimState(key: string, state: PreloadState): ClaimedPreload {
  const { iframe, cleanup, ready, researchId } = state;
  iframe.removeAttribute(PRELOAD_ATTR);

  // Clean up preload-phase listeners — caller will set up their own
  cleanup();
  preloaded.delete(key);

  getTimer(researchId).mark("iframe:preloadClaimed");
  return { iframe, wasReady: ready };
}

/** Destroy a specific preloaded iframe by researchId + type */
export function destroyPreloadedByType(
  researchId: string,
  type: EmbedType
): void {
  destroyPreloadedEntry(preloadKey(researchId, type));
}

/** Destroy all preloaded iframes */
export function destroyPreloaded(): void {
  for (const [key] of preloaded) {
    destroyPreloadedEntry(key);
  }
}

function destroyPreloadedEntry(key: string): void {
  const state = preloaded.get(key);
  if (state) {
    state.cleanup();
    state.iframe.remove();
    removeTimer(state.researchId);
    preloaded.delete(key);
  }
}
