/**
 * Slider/drawer embed - slides in from the right
 * SSR-safe - returns no-op handle on server
 */

import type { EmbedConfig, EmbedHandle, ToggleableHandle } from "./types";
import { hasDom, getHost } from "./config";
import {
  createIframe,
  setupMessageListener,
  registerIframe,
  ensureGlobalListeners,
  getCachedAuthToken,
} from "./iframe";
import { createLoadingIndicator } from "./loading";
import { removeTimer } from "./timing";
import { claimPreloadedIframe } from "./preload";
import { getReusableEmbedSignature } from "./reuse";
import { injectStyles, CLOSE_ICON } from "./styles";
import { cn, getThemeClass } from "./utils";

function createNoOpHandle(researchId: string): ToggleableHandle {
  return {
    unmount: () => {},
    update: () => {},
    destroy: () => {},
    show: () => {},
    hide: () => {},
    canReuse: () => false,
    replayOpenCallbacks: () => {},
    isOpen: false,
    researchId,
    type: "slider",
    iframe: null,
    container: null,
  };
}

const noopNavigate = () => {};

export function openSlider(
  config: EmbedConfig & { _startHidden?: boolean }
): ToggleableHandle {
  const { researchId, _startHidden } = config;

  // SSR safety: return no-op handle
  if (!hasDom()) {
    return createNoOpHandle(researchId);
  }
  const host = getHost(config.host);

  injectStyles();
  ensureGlobalListeners();

  // Create backdrop
  const backdrop = document.createElement("div");
  backdrop.className = cn(
    "perspective-slider-backdrop perspective-embed-root",
    getThemeClass(config.theme)
  );

  // Create slider container
  const slider = document.createElement("div");
  slider.className = cn(
    "perspective-slider perspective-embed-root",
    getThemeClass(config.theme)
  );

  // Create close button
  const closeBtn = document.createElement("button");
  closeBtn.className = "perspective-close";
  closeBtn.innerHTML = CLOSE_ICON;
  closeBtn.setAttribute("aria-label", "Close");

  // Reuse preloaded iframe or create new one
  const claimed = claimPreloadedIframe(researchId, "slider");
  const iframe =
    claimed?.iframe ??
    createIframe(
      researchId,
      "slider",
      host,
      config.params,
      config.brand,
      config.theme
    );

  // Show loading indicator unless preloaded iframe is already ready
  let loading: HTMLElement | null = null;
  if (!claimed?.wasReady) {
    loading = createLoadingIndicator({
      theme: config.theme,
      brand: config.brand,
    });
  }

  // Style iframe — show immediately only if preloaded and ready
  if (claimed?.wasReady) {
    iframe.style.cssText = "border:none;";
    iframe.style.opacity = "1";
  } else {
    if (claimed) iframe.style.cssText = "border:none;";
    iframe.style.opacity = "0";
    iframe.style.transition = "opacity 0.3s ease";
  }

  slider.appendChild(closeBtn);
  if (loading) {
    slider.appendChild(loading);
  }
  slider.appendChild(iframe);
  document.body.appendChild(backdrop);
  document.body.appendChild(slider);

  // Mutable config reference for updates
  let currentConfig = { ...config };
  const reuseSignature = getReusableEmbedSignature(config);
  let isOpen = !_startHidden;
  let isReady = Boolean(claimed?.wasReady);
  let lastAuthToken = getCachedAuthToken(researchId);
  let messageCleanup: (() => void) | null = null;

  if (_startHidden) {
    slider.style.display = "none";
    backdrop.style.display = "none";
  }

  // Register iframe for theme change notifications
  const unregisterIframe = registerIframe(iframe, host);

  // ESC key handler (added/removed on show/hide)
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") hide();
  };

  const hide = () => {
    if (!isOpen) return;
    isOpen = false;
    slider.style.display = "none";
    backdrop.style.display = "none";
    document.removeEventListener("keydown", escHandler);
    currentConfig.onClose?.();
  };

  const show = () => {
    if (isOpen) return;
    isOpen = true;
    slider.style.display = "";
    backdrop.style.display = "";
    document.addEventListener("keydown", escHandler);
  };

  const fullDestroy = () => {
    const wasOpen = isOpen;
    isOpen = false;
    messageCleanup?.();
    unregisterIframe();
    slider.remove();
    backdrop.remove();
    document.removeEventListener("keydown", escHandler);
    removeTimer(researchId);
    if (wasOpen) currentConfig.onClose?.();
  };

  const replayOpenCallbacks = () => {
    if (!isReady) return;

    currentConfig.onReady?.();
    const cachedToken = lastAuthToken ?? getCachedAuthToken(researchId);
    if (cachedToken) {
      currentConfig.onAuth?.({ researchId, token: cachedToken });
    }
  };

  // Set up message listener with loading state handling
  messageCleanup = setupMessageListener(
    researchId,
    {
      get onReady() {
        return () => {
          isReady = true;
          if (loading) {
            loading.style.opacity = "0";
            iframe.style.opacity = "1";
            const el = loading;
            setTimeout(() => el.remove(), 300);
            loading = null;
          }
          currentConfig.onReady?.();
        };
      },
      get onSubmit() {
        return isOpen ? currentConfig.onSubmit : undefined;
      },
      get onNavigate() {
        return isOpen ? currentConfig.onNavigate : noopNavigate;
      },
      get onClose() {
        return hide;
      },
      get onAuth() {
        return ({ token }: { researchId: string; token: string }) => {
          lastAuthToken = token;
          currentConfig.onAuth?.({ researchId, token });
        };
      },
      get onError() {
        return isOpen ? currentConfig.onError : undefined;
      },
    },
    iframe,
    host,
    { skipResize: true }
  );

  // Preloaded iframe already fired perspective:ready — replay consumer callbacks
  if (claimed?.wasReady) {
    replayOpenCallbacks();
  }

  // Close handlers
  closeBtn.addEventListener("click", hide);
  backdrop.addEventListener("click", hide);

  if (!_startHidden) {
    document.addEventListener("keydown", escHandler);
  }

  return {
    unmount: fullDestroy,
    update: (options: Parameters<EmbedHandle["update"]>[0]) => {
      currentConfig = { ...currentConfig, ...options };
    },
    destroy: fullDestroy,
    show,
    hide,
    canReuse: (nextConfig: EmbedConfig) =>
      getReusableEmbedSignature(nextConfig) === reuseSignature,
    replayOpenCallbacks,
    get isOpen() {
      return isOpen;
    },
    researchId,
    type: "slider" as const,
    iframe,
    container: slider,
  };
}
