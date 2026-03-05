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
import { claimPreloadedIframe } from "./preload";
import { injectStyles, CLOSE_ICON } from "./styles";
import { cn, getThemeClass } from "./utils";

function createNoOpHandle(researchId: string): ToggleableHandle {
  return {
    unmount: () => {},
    update: () => {},
    destroy: () => {},
    show: () => {},
    hide: () => {},
    isOpen: false,
    researchId,
    type: "slider",
    iframe: null,
    container: null,
  };
}

export function openSlider(config: EmbedConfig): ToggleableHandle {
  const { researchId } = config;

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
  let isOpen = true;
  let messageCleanup: (() => void) | null = null;

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
    if (wasOpen) currentConfig.onClose?.();
  };

  // Set up message listener with loading state handling
  messageCleanup = setupMessageListener(
    researchId,
    {
      get onReady() {
        return () => {
          if (loading) {
            loading.style.opacity = "0";
            iframe.style.opacity = "1";
            setTimeout(() => loading!.remove(), 300);
          }
          currentConfig.onReady?.();
        };
      },
      get onSubmit() {
        return currentConfig.onSubmit;
      },
      get onNavigate() {
        return currentConfig.onNavigate;
      },
      get onClose() {
        return hide;
      },
      get onError() {
        return currentConfig.onError;
      },
    },
    iframe,
    host,
    { skipResize: true }
  );

  // Preloaded iframe already fired perspective:ready — replay consumer callbacks
  if (claimed?.wasReady) {
    currentConfig.onReady?.();
    const cachedToken = getCachedAuthToken(researchId);
    if (cachedToken) {
      currentConfig.onAuth?.({ researchId, token: cachedToken });
    }
  }

  // Close handlers
  closeBtn.addEventListener("click", hide);
  backdrop.addEventListener("click", hide);

  document.addEventListener("keydown", escHandler);

  return {
    unmount: fullDestroy,
    update: (options: Parameters<EmbedHandle["update"]>[0]) => {
      currentConfig = { ...currentConfig, ...options };
    },
    destroy: fullDestroy,
    show,
    hide,
    get isOpen() {
      return isOpen;
    },
    researchId,
    type: "slider" as const,
    iframe,
    container: slider,
  };
}
