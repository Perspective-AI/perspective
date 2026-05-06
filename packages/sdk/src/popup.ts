/**
 * Popup/modal embed - opens in a centered modal overlay
 * SSR-safe - returns no-op handle on server
 */

import type { EmbedHandle, InternalEmbedConfig } from "./types";
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
import { enrichContainer } from "./attribution";
import { perfLog } from "./perf";

function createNoOpHandle(researchId: string): EmbedHandle {
  return {
    unmount: () => {},
    update: () => {},
    destroy: () => {},
    researchId,
    type: "popup",
    iframe: null,
    container: null,
  };
}

export function openPopup(config: InternalEmbedConfig): EmbedHandle {
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
    appearance: config._apiConfig?.embedSettings?.appearance,
  });
  loading.style.borderRadius = "16px";

  // Create iframe (hidden initially)
  const overrides = appearanceToParams(config._apiConfig?.embedSettings);
  const iframe = createIframe(
    researchId,
    "popup",
    host,
    config.params,
    config.brand,
    config.theme,
    overrides
  );
  iframe.style.opacity = "0";
  iframe.style.transition = "opacity 0.15s ease";

  modal.appendChild(closeBtn);
  modal.appendChild(loading);
  modal.appendChild(iframe);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  enrichContainer(overlay, "popup", config);

  // Mutable config reference for updates
  let currentConfig = { ...config };
  let isOpen = true;
  let messageCleanup: (() => void) | null = null;

  // See widget.ts — hide skeleton on first `visual-ready`, with `ready` fallback.
  let skeletonHidden = false;
  const hideSkeleton = () => {
    if (skeletonHidden) return;
    skeletonHidden = true;
    perfLog("SDK", "skeleton hide started (popup)", { researchId });
    loading.style.opacity = "0";
    iframe.style.opacity = "1";
    setTimeout(() => loading.remove(), 150);
  };
  const persistOpenState = (open: boolean) => {
    setPersistedOpenState({
      researchId,
      type: "popup",
      host: config.host,
      open,
    });
  };

  // Register iframe for theme change notifications
  const unregisterIframe = registerIframe(iframe, host);

  persistOpenState(true);

  const removePopup = () => {
    if (!isOpen) return;
    isOpen = false;
    messageCleanup?.();
    unregisterIframe();
    overlay.remove();
    document.removeEventListener("keydown", escHandler);
    currentConfig.onClose?.();
  };

  const destroy = () => {
    persistOpenState(false);
    removePopup();
  };

  const unmount = () => {
    removePopup();
  };

  // Set up message listener with loading state handling
  messageCleanup = setupMessageListener(
    researchId,
    {
      get onVisualReady() {
        return hideSkeleton;
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
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) destroy();
    });
    document.addEventListener("keydown", escHandler);
  }

  return {
    unmount,
    update: (options: Parameters<EmbedHandle["update"]>[0]) => {
      currentConfig = { ...currentConfig, ...options };
    },
    destroy,
    researchId,
    type: "popup" as const,
    iframe,
    container: overlay,
  };
}
