/**
 * Popup/modal embed - opens in a centered modal overlay
 * SSR-safe - returns no-op handle on server
 */

import type { EmbedConfig, EmbedHandle, ToggleableHandle } from "./types";
import { hasDom, getHost } from "./config";
import {
  createIframe,
  setupMessageListener,
  registerIframe,
  ensureGlobalListeners,
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
    type: "popup",
    iframe: null,
    container: null,
  };
}

export function openPopup(config: EmbedConfig): ToggleableHandle {
  const { researchId } = config;

  // SSR safety: return no-op handle
  if (!hasDom()) {
    return createNoOpHandle(researchId);
  }
  const host = getHost(config.host);

  injectStyles();
  ensureGlobalListeners();

  // Create overlay
  const overlay = document.createElement("div");
  overlay.className = cn(
    "perspective-overlay perspective-embed-root",
    getThemeClass(config.theme)
  );

  // Create modal container
  const modal = document.createElement("div");
  modal.className = "perspective-modal";

  // Create close button
  const closeBtn = document.createElement("button");
  closeBtn.className = "perspective-close";
  closeBtn.innerHTML = CLOSE_ICON;
  closeBtn.setAttribute("aria-label", "Close");

  // Reuse preloaded iframe or create new one
  const preloaded = claimPreloadedIframe(researchId);
  const iframe =
    preloaded ??
    createIframe(
      researchId,
      "popup",
      host,
      config.params,
      config.brand,
      config.theme
    );

  // Only show loading indicator if no preloaded iframe
  let loading: HTMLElement | null = null;
  if (!preloaded) {
    loading = createLoadingIndicator({
      theme: config.theme,
      brand: config.brand,
    });
    loading.style.borderRadius = "16px";
  }

  // Style iframe
  if (preloaded) {
    iframe.style.cssText = "border:none;";
    iframe.style.opacity = "1";
  } else {
    iframe.style.opacity = "0";
    iframe.style.transition = "opacity 0.3s ease";
  }

  modal.appendChild(closeBtn);
  if (loading) {
    modal.appendChild(loading);
  }
  modal.appendChild(iframe);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

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
    overlay.style.display = "none";
    document.removeEventListener("keydown", escHandler);
    currentConfig.onClose?.();
  };

  const show = () => {
    if (isOpen) return;
    isOpen = true;
    overlay.style.display = "";
    document.addEventListener("keydown", escHandler);
  };

  const fullDestroy = () => {
    const wasOpen = isOpen;
    isOpen = false;
    messageCleanup?.();
    unregisterIframe();
    overlay.remove();
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

  // Close handlers
  closeBtn.addEventListener("click", hide);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) hide();
  });

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
    type: "popup" as const,
    iframe,
    container: overlay,
  };
}
