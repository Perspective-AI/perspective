/**
 * Floating bubble embed - floating button that opens a chat window
 * SSR-safe - returns no-op handle on server
 */

import type { EmbedConfig, FloatHandle, ThemeConfig } from "./types";
import { hasDom, getHost } from "./config";
import {
  createIframe,
  setupMessageListener,
  registerIframe,
  ensureGlobalListeners,
} from "./iframe";
import { createLoadingIndicator } from "./loading";
import { injectStyles, MIC_ICON, CLOSE_ICON } from "./styles";
import { cn, getThemeClass, resolveIsDark } from "./utils";

type FloatConfig = EmbedConfig & { _themeConfig?: ThemeConfig };

function createNoOpHandle(researchId: string): FloatHandle {
  return {
    unmount: () => {},
    update: () => {},
    destroy: () => {},
    open: () => {},
    close: () => {},
    toggle: () => {},
    isOpen: false,
    researchId,
    type: "float",
    iframe: null,
    container: null,
  };
}

export function createFloatBubble(config: FloatConfig): FloatHandle {
  const { researchId, _themeConfig, theme, brand } = config;

  // SSR safety: return no-op handle
  if (!hasDom()) {
    return createNoOpHandle(researchId);
  }
  const host = getHost(config.host);

  injectStyles();
  ensureGlobalListeners();

  // Create bubble button
  const bubble = document.createElement("button");
  bubble.className = cn(
    "perspective-float-bubble perspective-embed-root",
    getThemeClass(config.theme)
  );
  bubble.innerHTML = MIC_ICON;
  bubble.setAttribute("aria-label", "Open chat");
  bubble.setAttribute("data-perspective", "float-bubble");

  // Apply theme color if available
  if (_themeConfig || brand) {
    const isDark = resolveIsDark(theme);
    const bg = isDark
      ? (brand?.dark?.primary ?? _themeConfig?.darkPrimaryColor ?? "#a78bfa")
      : (brand?.light?.primary ?? _themeConfig?.primaryColor ?? "#7c3aed");
    bubble.style.setProperty("--perspective-float-bg", bg);
    bubble.style.setProperty(
      "--perspective-float-shadow",
      `0 4px 12px ${bg}66`
    );
    bubble.style.setProperty(
      "--perspective-float-shadow-hover",
      `0 6px 16px ${bg}80`
    );
    bubble.style.backgroundColor = bg;
    bubble.style.boxShadow = `0 4px 12px ${bg}66`;
  }

  document.body.appendChild(bubble);

  let floatWindow: HTMLElement | null = null;
  let iframe: HTMLIFrameElement | null = null;
  let cleanup: (() => void) | null = null;
  let unregisterIframe: (() => void) | null = null;
  let isOpen = false;

  // Mutable config reference for updates
  let currentConfig = { ...config };

  const openFloat = () => {
    if (isOpen) return;
    isOpen = true;

    // Create float window
    floatWindow = document.createElement("div");
    floatWindow.className = cn(
      "perspective-float-window perspective-embed-root",
      getThemeClass(currentConfig.theme)
    );

    // Create close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "perspective-close";
    closeBtn.innerHTML = CLOSE_ICON;
    closeBtn.setAttribute("aria-label", "Close chat");
    closeBtn.addEventListener("click", closeFloat);

    // Create loading indicator with theme and brand colors
    const loading = createLoadingIndicator({
      theme: currentConfig.theme,
      brand: currentConfig.brand,
    });
    loading.style.borderRadius = "16px";

    // Create iframe (hidden initially)
    iframe = createIframe(
      researchId,
      "float",
      host,
      currentConfig.params,
      currentConfig.brand,
      currentConfig.theme
    );
    iframe.style.opacity = "0";
    iframe.style.transition = "opacity 0.3s ease";

    floatWindow.appendChild(closeBtn);
    floatWindow.appendChild(loading);
    floatWindow.appendChild(iframe);
    document.body.appendChild(floatWindow);

    // Set up message listener with loading state handling
    cleanup = setupMessageListener(
      researchId,
      {
        get onReady() {
          return () => {
            loading.style.opacity = "0";
            iframe!.style.opacity = "1";
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
          return closeFloat;
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
    if (iframe) {
      unregisterIframe = registerIframe(iframe, host);
    }

    // Update bubble icon to close
    bubble.innerHTML = CLOSE_ICON;
    bubble.setAttribute("aria-label", "Close chat");
  };

  const closeFloat = () => {
    if (!isOpen) return;
    isOpen = false;

    cleanup?.();
    unregisterIframe?.();
    floatWindow?.remove();
    floatWindow = null;
    iframe = null;
    cleanup = null;
    unregisterIframe = null;

    // Restore bubble icon
    bubble.innerHTML = MIC_ICON;
    bubble.setAttribute("aria-label", "Open chat");

    currentConfig.onClose?.();
  };

  // Toggle on bubble click
  bubble.addEventListener("click", () => {
    if (isOpen) {
      closeFloat();
    } else {
      openFloat();
    }
  });

  const unmount = () => {
    closeFloat();
    bubble.remove();
  };

  return {
    unmount,
    update: (options: Parameters<FloatHandle["update"]>[0]) => {
      currentConfig = { ...currentConfig, ...options };
    },
    destroy: unmount,
    open: openFloat,
    close: closeFloat,
    toggle: () => {
      if (isOpen) {
        closeFloat();
      } else {
        openFloat();
      }
    },
    get isOpen() {
      return isOpen;
    },
    researchId,
    type: "float" as const,
    get iframe() {
      return iframe;
    },
    container: bubble,
  };
}

/** @deprecated Use createFloatBubble instead */
export const createChatBubble = createFloatBubble;
