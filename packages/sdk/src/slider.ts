/**
 * Slider/drawer embed - slides in from the right
 * SSR-safe - returns no-op handle on server
 */

import type { EmbedConfig, EmbedHandle, ThemeConfig } from "./types";
import { hasDom, getHost } from "./config";
import {
  createIframe,
  appearanceToParams,
  setupMessageListener,
  registerIframe,
  ensureGlobalListeners,
} from "./iframe";
import { createLoadingIndicator } from "./loading";
import { injectStyles, CLOSE_ICON } from "./styles";
import { setPersistedOpenState } from "./state";
import { cn, getThemeClass } from "./utils";

function createNoOpHandle(researchId: string): EmbedHandle {
  return {
    unmount: () => {},
    update: () => {},
    destroy: () => {},
    researchId,
    type: "slider",
    iframe: null,
    container: null,
  };
}

type SliderConfig = EmbedConfig & { _themeConfig?: ThemeConfig };

export function openSlider(config: SliderConfig): EmbedHandle {
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

  // Create close button (hidden when disableClose is enabled)
  const closeBtn = document.createElement("button");
  closeBtn.className = "perspective-close";
  closeBtn.innerHTML = CLOSE_ICON;
  closeBtn.setAttribute("aria-label", "Close");
  if (config.disableClose) {
    closeBtn.style.display = "none";
  }

  // Create loading indicator with theme and brand colors
  const loading = createLoadingIndicator({
    theme: config.theme,
    brand: config.brand,
  });

  // Create iframe (hidden initially)
  const overrides = appearanceToParams(config._themeConfig?.embedSettings);
  const iframe = createIframe(
    researchId,
    "slider",
    host,
    config.params,
    config.brand,
    config.theme,
    overrides
  );
  iframe.style.opacity = "0";
  iframe.style.transition = "opacity 0.3s ease";

  slider.appendChild(closeBtn);
  slider.appendChild(loading);
  slider.appendChild(iframe);
  document.body.appendChild(backdrop);
  document.body.appendChild(slider);

  // Mutable config reference for updates
  let currentConfig = { ...config };
  let isOpen = true;
  let messageCleanup: (() => void) | null = null;
  const persistOpenState = (open: boolean) => {
    setPersistedOpenState({
      researchId,
      type: "slider",
      host: config.host,
      open,
    });
  };

  // Register iframe for theme change notifications
  const unregisterIframe = registerIframe(iframe, host);

  persistOpenState(true);

  const removeSlider = () => {
    if (!isOpen) return;
    isOpen = false;
    messageCleanup?.();
    unregisterIframe();
    slider.remove();
    backdrop.remove();
    document.removeEventListener("keydown", escHandler);
    currentConfig.onClose?.();
  };

  const destroy = () => {
    persistOpenState(false);
    removeSlider();
  };

  const unmount = () => {
    removeSlider();
  };

  // Set up message listener with loading state handling
  messageCleanup = setupMessageListener(
    researchId,
    {
      get onReady() {
        return () => {
          loading.style.opacity = "0";
          iframe.style.opacity = "1";
          setTimeout(() => loading.remove(), 300);
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
        return destroy;
      },
      get onError() {
        return currentConfig.onError;
      },
    },
    iframe,
    host,
    { skipResize: true, hasCloseButton: !config.disableClose }
  );

  // Close handlers (disabled when disableClose is enabled)
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      destroy();
    }
  };

  if (!config.disableClose) {
    closeBtn.addEventListener("click", destroy);
    backdrop.addEventListener("click", destroy);
    document.addEventListener("keydown", escHandler);
  }

  return {
    unmount,
    update: (options: Parameters<EmbedHandle["update"]>[0]) => {
      currentConfig = { ...currentConfig, ...options };
    },
    destroy,
    researchId,
    type: "slider" as const,
    iframe,
    container: slider,
  };
}
