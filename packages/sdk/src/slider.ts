/**
 * Slider/drawer embed - slides in from the right
 * SSR-safe - returns no-op handle on server
 */

import type { EmbedHandle, InternalEmbedConfig } from "./types";
import { hasDom, getHost } from "./config";
import {
  createIframe,
  setupMessageListener,
  registerIframe,
  ensureGlobalListeners,
  ensureHostPreconnect,
} from "./iframe";
import { createLoadingIndicator } from "./loading";
import { injectStyles, CLOSE_ICON } from "./styles";
import { setPersistedOpenState } from "./state";
import { cn, getThemeClass } from "./utils";
import { enrichContainer } from "./attribution";
import { perfLog } from "./perf";

/** Below this viewport width, "push" mode falls back to "overlay" so content isn't shoved off-screen. */
const PUSH_MIN_VIEWPORT = 640;

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

export function openSlider(config: InternalEmbedConfig): EmbedHandle {
  const { researchId } = config;

  // SSR safety: return no-op handle
  if (!hasDom()) {
    return createNoOpHandle(researchId);
  }
  const host = getHost(config.host);

  ensureHostPreconnect(host);
  injectStyles();
  ensureGlobalListeners();

  // Push mode shifts page content aside instead of overlaying it. Falls back
  // to overlay on narrow viewports where there's no room to push.
  const isPush =
    config.sliderMode === "push" && window.innerWidth >= PUSH_MIN_VIEWPORT;

  // Create backdrop (overlay mode only — push mode keeps the page interactive)
  const backdrop = document.createElement("div");
  backdrop.className = cn(
    "perspective-slider-backdrop perspective-embed-root",
    getThemeClass(config.theme)
  );

  // Create slider container
  const slider = document.createElement("div");
  slider.className = cn(
    "perspective-slider perspective-embed-root",
    isPush && "perspective-slider-push",
    getThemeClass(config.theme)
  );

  // Temporary X over the loading skeleton, removed at skeleton-hide once the
  // app draws its own (see hideSkeleton). Hidden when disableClose is set.
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

  // Create iframe (hidden initially). Appearance overrides resolved server-side.
  const iframe = createIframe(
    researchId,
    "slider",
    host,
    config.params,
    config.brand,
    config.theme
  );
  iframe.style.opacity = "0";
  iframe.style.transition = "opacity 0.15s ease";

  slider.appendChild(closeBtn);
  slider.appendChild(loading);
  slider.appendChild(iframe);
  if (!isPush) {
    document.body.appendChild(backdrop);
  }
  document.body.appendChild(slider);
  enrichContainer(slider, "slider", config);

  // Push mode: shrink the page by the slider's width, animated in sync with the
  // slide-in. Margin lives on <html> to avoid clobbering site-set body margins.
  const root = document.documentElement;
  const prevRootMarginRight = root.style.marginRight;
  const prevRootTransition = root.style.transition;
  const syncPush = () => {
    const fits = window.innerWidth >= PUSH_MIN_VIEWPORT;
    root.style.marginRight = fits
      ? `${slider.getBoundingClientRect().width}px`
      : "0px";
  };
  if (isPush) {
    root.style.transition = "margin-right 0.3s ease-out";
    syncPush();
    window.addEventListener("resize", syncPush);
  }
  const removePush = () => {
    if (!isPush) return;
    window.removeEventListener("resize", syncPush);
    root.style.marginRight = prevRootMarginRight;
    setTimeout(() => {
      root.style.transition = prevRootTransition;
    }, 300);
  };

  // Mutable config reference for updates
  let currentConfig = { ...config };
  let isOpen = true;
  let messageCleanup: (() => void) | null = null;

  // See widget.ts — hide skeleton on first `visual-ready`, with `ready` fallback.
  let skeletonHidden = false;
  const hideSkeleton = () => {
    if (skeletonHidden) return;
    skeletonHidden = true;
    perfLog("SDK", "skeleton hide started (slider)", { researchId });
    loading.style.opacity = "0";
    iframe.style.opacity = "1";
    setTimeout(() => loading.remove(), 150);
    // The app now draws its own X, so drop ours. A brief no-X gap reads as
    // loading; an SDK X left over the app's avatar/menu looks like a bug.
    closeBtn.remove();
  };
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
    removePush();
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
      get onVisualReady() {
        return () => {
          hideSkeleton();
          currentConfig.onVisualReady?.();
        };
      },
      get onReady() {
        return () => {
          hideSkeleton();
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
    { skipResize: true, renderCloseButton: !config.disableClose }
  );

  // Close handlers (disabled when disableClose is enabled)
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      destroy();
    }
  };

  if (!config.disableClose) {
    closeBtn.addEventListener("click", destroy);
    // Push mode has no backdrop — page stays interactive and clicks don't close.
    if (!isPush) {
      backdrop.addEventListener("click", destroy);
    }
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
