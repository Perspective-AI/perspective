/**
 * Fullpage embed - takes over entire viewport
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
import { injectStyles } from "./styles";
import { cn, getThemeClass } from "./utils";

function createNoOpHandle(researchId: string): EmbedHandle {
  return {
    unmount: () => {},
    update: () => {},
    destroy: () => {},
    researchId,
    type: "fullpage" as const,
    iframe: null,
    container: null,
  };
}

export function createFullpage(config: InternalEmbedConfig): EmbedHandle {
  const { researchId } = config;

  // SSR safety: return no-op handle
  if (!hasDom()) {
    return createNoOpHandle(researchId);
  }
  const host = getHost(config.host);

  injectStyles();
  ensureGlobalListeners();

  // Create fullpage container
  const container = document.createElement("div");
  container.className = cn(
    "perspective-embed-root perspective-fullpage",
    getThemeClass(config.theme)
  );

  // Create loading indicator with theme and brand colors
  const loading = createLoadingIndicator({
    theme: config.theme,
    brand: config.brand,
  });
  container.appendChild(loading);

  // Create iframe (hidden initially)
  const overrides = appearanceToParams(config._themeConfig?.embedSettings);
  const iframe = createIframe(
    researchId,
    "fullpage",
    host,
    config.params,
    config.brand,
    config.theme,
    overrides
  );
  iframe.style.opacity = "0";
  iframe.style.transition = "opacity 0.3s ease";

  container.appendChild(iframe);
  document.body.appendChild(container);

  // Mutable config reference for updates
  let currentConfig = { ...config };
  let messageCleanup: (() => void) | null = null;

  // Register iframe for theme change notifications
  const unregisterIframe = registerIframe(iframe, host);

  const unmount = () => {
    messageCleanup?.();
    unregisterIframe();
    container.remove();
    currentConfig.onClose?.();
  };

  // Set up message listener
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
        return unmount;
      },
      get onError() {
        return currentConfig.onError;
      },
    },
    iframe,
    host,
    { skipResize: true }
  );

  return {
    unmount,
    update: (options) => {
      currentConfig = { ...currentConfig, ...options };
    },
    destroy: unmount,
    researchId,
    type: "fullpage" as const,
    iframe,
    container,
  };
}
