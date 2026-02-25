/**
 * Floating input bar embed - pill-shaped bar that opens a chat window
 * Supports engagement sequence: bar → chime → teaser → auto-open
 * SSR-safe - returns no-op handle on server
 */

import type {
  EmbedConfig,
  FloatHandle,
  FloatSequenceConfig,
  ThemeConfig,
} from "./types";
import { hasDom, getHost } from "./config";
import {
  createIframe,
  setupMessageListener,
  registerIframe,
  ensureGlobalListeners,
  sendMessage,
} from "./iframe";
import { MESSAGE_TYPES } from "./constants";
import { createLoadingIndicator } from "./loading";
import {
  injectStyles,
  MIC_ICON,
  CLOSE_ICON,
  SEND_ICON,
  getIconSvg,
} from "./styles";
import { cn, getThemeClass, resolveIsDark } from "./utils";
import { playChime } from "./audio";
import { createTeaser } from "./teaser";

type FloatConfig = EmbedConfig & { _themeConfig?: ThemeConfig };

const SEQUENCE_DEFAULTS: Required<FloatSequenceConfig> = {
  icon: "chat",
  teaserText: "Have a question? I'm here to help.",
  soundDelay: 2,
  teaserDelay: 3,
  autoOpenDelay: 20,
  typingSpeed: 40,
  placeholder: "Ask me anything...",
};

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

  // Merge sequence config with defaults
  const seq: Required<FloatSequenceConfig> = {
    ...SEQUENCE_DEFAULTS,
    ...config.sequence,
  };

  // Mutable config reference for updates
  let currentConfig = { ...config };

  // ── Build Input Bar DOM ──

  const bar = document.createElement("div");
  bar.className = cn(
    "perspective-float-bar perspective-embed-root",
    getThemeClass(config.theme)
  );
  bar.setAttribute("data-perspective", "float-bar");

  // Apply theme colors
  const applyBarColors = () => {
    if (_themeConfig || brand) {
      const isDark = resolveIsDark(theme);
      const bg = isDark
        ? (brand?.dark?.primary ?? _themeConfig?.darkPrimaryColor ?? "#a78bfa")
        : (brand?.light?.primary ?? _themeConfig?.primaryColor ?? "#7c3aed");
      bar.style.setProperty("--perspective-float-bg", bg);
      bar.style.setProperty("--perspective-float-border", `${bg}33`);
      bar.style.setProperty("--perspective-float-border-focus", `${bg}4d`);
    }
  };
  applyBarColors();

  // Mic icon button (left side)
  const micBtn = document.createElement("button");
  micBtn.className = "perspective-float-bar-icon";
  micBtn.innerHTML = MIC_ICON;
  micBtn.setAttribute("aria-label", "Open voice chat");
  micBtn.addEventListener("click", () => openFloat());

  // Divider
  const divider = document.createElement("div");
  divider.className = "perspective-float-bar-divider";

  // Input field
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = seq.placeholder;
  input.setAttribute("aria-label", "Type a message");

  input.addEventListener("focus", () => {
    bar.classList.add("perspective-float-bar--focused");
  });
  input.addEventListener("blur", () => {
    bar.classList.remove("perspective-float-bar--focused");
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      submitInput();
    }
  });
  input.addEventListener("input", () => {
    updateActionIcon();
  });

  // Action button (right side) — shows icon or send
  const actionBtn = document.createElement("button");
  actionBtn.className = "perspective-float-bar-action";
  actionBtn.innerHTML = getIconSvg(seq.icon);
  actionBtn.setAttribute("aria-label", "Send message");
  actionBtn.addEventListener("click", () => {
    if (input.value.trim()) {
      submitInput();
    } else {
      openFloat();
    }
  });

  function updateActionIcon() {
    const hasText = input.value.trim().length > 0;
    if (hasText) {
      actionBtn.innerHTML = SEND_ICON;
      actionBtn.classList.add("perspective-float-bar-action--has-text");
    } else {
      actionBtn.innerHTML = getIconSvg(seq.icon);
      actionBtn.classList.remove("perspective-float-bar-action--has-text");
    }
  }

  bar.appendChild(micBtn);
  bar.appendChild(divider);
  bar.appendChild(input);
  bar.appendChild(actionBtn);
  document.body.appendChild(bar);

  // ── State ──

  let floatWindow: HTMLElement | null = null;
  let iframe: HTMLIFrameElement | null = null;
  let cleanup: (() => void) | null = null;
  let unregisterIframe: (() => void) | null = null;
  let isOpen = false;
  let sequenceRan = false;
  let audioCtx: AudioContext | null = null;
  let teaserInstance: { element: HTMLElement; destroy: () => void } | null =
    null;

  // Timer IDs for sequence
  const timers: ReturnType<typeof setTimeout>[] = [];

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers.length = 0;
  }

  // ── Sequence Logic ──

  function startSequence() {
    if (sequenceRan) return;
    sequenceRan = true;

    // Sound chime
    if (seq.soundDelay > 0) {
      timers.push(
        setTimeout(() => {
          if (isOpen) return;
          try {
            audioCtx = playChime(audioCtx ?? undefined) ?? audioCtx;
          } catch (_) {
            // Browser autoplay policy may block — silently ignore
          }
          // Pulse ring animation
          const pulse = document.createElement("div");
          pulse.className = "perspective-float-bar-pulse";
          bar.appendChild(pulse);
          setTimeout(() => pulse.remove(), 1000);
        }, seq.soundDelay * 1000)
      );
    }

    // Teaser message
    if (seq.teaserDelay > 0 && seq.teaserText) {
      timers.push(
        setTimeout(() => {
          if (isOpen) return;
          showTeaser();
        }, seq.teaserDelay * 1000)
      );
    }

    // Auto-open dialog
    if (seq.autoOpenDelay > 0) {
      timers.push(
        setTimeout(() => {
          if (isOpen) return;
          dismissTeaser();
          openFloat();
        }, seq.autoOpenDelay * 1000)
      );
    }
  }

  function showTeaser() {
    if (teaserInstance) return;
    teaserInstance = createTeaser({
      text: seq.teaserText,
      speed: seq.typingSpeed,
      theme: currentConfig.theme,
      onDismiss: dismissTeaser,
      onClick: () => {
        dismissTeaser();
        openFloat();
      },
    });
    document.body.appendChild(teaserInstance.element);
  }

  function dismissTeaser() {
    if (teaserInstance) {
      teaserInstance.destroy();
      teaserInstance = null;
    }
  }

  // Start the sequence
  startSequence();

  // ── Submit Input ──

  let pendingInitialMessage: string | null = null;

  function submitInput() {
    const text = input.value.trim();
    if (!text) return;
    pendingInitialMessage = text;
    input.value = "";
    updateActionIcon();
    openFloat();
  }

  // ── Open / Close ──

  const openFloat = () => {
    if (isOpen) return;
    isOpen = true;
    clearTimers();
    dismissTeaser();

    // Hide bar
    bar.style.display = "none";

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

    // Build params, including initial_message if present
    const iframeParams = { ...currentConfig.params };
    if (pendingInitialMessage) {
      iframeParams.initial_message = pendingInitialMessage;
    }

    // Create iframe
    iframe = createIframe(
      researchId,
      "float",
      host,
      iframeParams,
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
            // Send initial message via postMessage if we have one
            if (pendingInitialMessage && iframe) {
              sendMessage(iframe, host, {
                type: MESSAGE_TYPES.initialMessage,
                message: pendingInitialMessage,
              });
              pendingInitialMessage = null;
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
  };

  const closeFloat = () => {
    if (!isOpen) return;
    isOpen = false;
    pendingInitialMessage = null;

    cleanup?.();
    unregisterIframe?.();
    floatWindow?.remove();
    floatWindow = null;
    iframe = null;
    cleanup = null;
    unregisterIframe = null;

    // Show bar again (sequence does NOT restart)
    bar.style.display = "flex";

    currentConfig.onClose?.();
  };

  const unmount = () => {
    clearTimers();
    dismissTeaser();
    closeFloat();
    bar.remove();
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
    container: bar,
  };
}

/** @deprecated Use createFloatBubble instead */
export const createChatBubble = createFloatBubble;
