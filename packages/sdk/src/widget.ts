/**
 * Inline widget embed - renders directly in a container element
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
import { injectStyles } from "./styles";
import { cn, getThemeClass } from "./utils";
import { enrichContainer } from "./attribution";
import { perfLog } from "./perf";

type WidgetResources = {
  cleanup: () => void;
  unregister: () => void;
  wrapper: HTMLElement;
};

const widgetResources = new WeakMap<HTMLIFrameElement, WidgetResources>();

function createNoOpHandle(researchId: string, type: "widget"): EmbedHandle {
  return {
    unmount: () => {},
    update: () => {},
    destroy: () => {},
    researchId,
    type,
    iframe: null,
    container: null,
  };
}

function createExistingWidgetHandle(
  container: HTMLElement,
  researchId: string
): EmbedHandle {
  const existingWrapper = container.querySelector<HTMLElement>(
    ".perspective-embed-root"
  );
  const existingIframe = container.querySelector<HTMLIFrameElement>(
    "iframe[data-perspective]"
  );

  let destroyed = false;

  const unmount = () => {
    if (destroyed) return;
    destroyed = true;

    if (existingIframe) {
      const resources = widgetResources.get(existingIframe);
      if (resources) {
        resources.cleanup();
        resources.unregister();
        widgetResources.delete(existingIframe);
      }
    }
    existingWrapper?.remove();
  };

  return {
    unmount,
    update: () => {},
    destroy: unmount,
    researchId,
    type: "widget" as const,
    iframe: existingIframe,
    container,
  };
}

export function createWidget(
  container: HTMLElement | null,
  config: InternalEmbedConfig
): EmbedHandle {
  const { researchId } = config;

  perfLog("SDK", "createWidget called", { researchId });

  // SSR safety: return no-op handle
  if (!hasDom() || !container) {
    return createNoOpHandle(researchId, "widget");
  }

  // Idempotency check for React Strict Mode
  if (container.querySelector("iframe[data-perspective]")) {
    return createExistingWidgetHandle(container, researchId);
  }

  const host = getHost(config.host);

  ensureHostPreconnect(host);
  injectStyles();
  ensureGlobalListeners();

  // Create wrapper for positioning
  const wrapper = document.createElement("div");
  wrapper.className = cn("perspective-embed-root", getThemeClass(config.theme));
  wrapper.style.cssText =
    "position:relative;width:100%;height:100%;min-height:500px;";

  // Create loading indicator with theme and brand colors
  const loading = createLoadingIndicator({
    theme: config.theme,
    brand: config.brand,
  });
  wrapper.appendChild(loading);

  // Create iframe (hidden initially). Workspace-level appearance overrides
  // (hideProgress / hideGreeting / hideBranding / enableFullScreen) are now
  // resolved by the iframe page server-side, so the SDK doesn't need to
  // fetch config or merge URL params before creating the iframe.
  const iframe = createIframe(
    researchId,
    "widget",
    host,
    config.params,
    config.brand,
    config.theme
  );
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.minHeight = "500px";
  iframe.style.opacity = "0";
  iframe.style.transition = "opacity 0.15s ease";

  wrapper.appendChild(iframe);
  container.appendChild(wrapper);
  enrichContainer(wrapper, "widget", config);

  // Mutable config reference for updates
  let currentConfig = { ...config };

  // Hide skeleton on the FIRST signal of visual readiness — typically
  // `perspective:visual-ready` (pre-hydration), with `perspective:ready`
  // as a fallback for older iframe versions that don't emit visual-ready.
  let skeletonHidden = false;
  const hideSkeleton = () => {
    if (skeletonHidden) return;
    skeletonHidden = true;
    perfLog("SDK", "skeleton hide started (widget)", { researchId });
    loading.style.opacity = "0";
    iframe.style.opacity = "1";
    setTimeout(() => loading.remove(), 150);
  };

  // Set up message listener with loading state handling
  const cleanup = setupMessageListener(
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
        return currentConfig.onClose;
      },
      get onError() {
        return currentConfig.onError;
      },
    },
    iframe,
    host,
    { skipResize: true }
  );

  // Register iframe for theme change notifications
  const unregisterIframe = registerIframe(iframe, host);

  widgetResources.set(iframe, {
    cleanup,
    unregister: unregisterIframe,
    wrapper,
  });

  let destroyed = false;

  const unmount = () => {
    if (destroyed) return;
    destroyed = true;

    cleanup();
    unregisterIframe();
    widgetResources.delete(iframe);
    wrapper.remove();
  };

  return {
    unmount,
    update: (options) => {
      currentConfig = { ...currentConfig, ...options };
    },
    destroy: unmount,
    researchId,
    type: "widget" as const,
    iframe,
    container,
  };
}
