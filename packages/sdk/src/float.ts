/**
 * Floating bubble embed - floating button that opens a chat window
 * SSR-safe - returns no-op handle on server
 */

import type {
  AIAssistantChannel,
  EmbedConfig,
  FloatHandle,
  ThemeConfig,
} from "./types";
import { hasDom, getHost } from "./config";
import {
  createIframe,
  setupMessageListener,
  registerIframe,
  ensureGlobalListeners,
  getCachedAuthToken,
} from "./iframe";
import { claimPreloadedIframe } from "./preload";
import { removeTimer } from "./timing";
import { createLoadingIndicator } from "./loading";
import { injectStyles, MIC_ICON, MESSAGES_ICON, CLOSE_ICON } from "./styles";
import { cn, getThemeClass, resolveIsDark } from "./utils";

type FloatConfig = EmbedConfig & { _themeConfig?: ThemeConfig };
type ChannelMode = "voice" | "text" | "both";

const SOUND_DELAY_MS = 2000;
const TEASER_DELAY_MS = 3000;
const TYPEWRITER_SPEED_MS = 40;
const DEFAULT_WELCOME_MESSAGE = "Have a question? I'm here to help.";
const noopNavigate = () => {};

function getChannelMode(
  channel?: AIAssistantChannel | AIAssistantChannel[] | null
): ChannelMode {
  const entries = Array.isArray(channel) ? channel : channel ? [channel] : [];
  const hasVoice = entries.includes("VOICE");
  const hasText = entries.includes("TEXT");

  if (hasVoice && hasText) return "both";
  if (hasText) return "text";
  return "voice";
}

function resolveChannel(
  config: FloatConfig
): AIAssistantChannel | AIAssistantChannel[] | undefined {
  return (
    config.channel ??
    config._themeConfig?.allowedChannels ??
    config._themeConfig?.channel ??
    undefined
  );
}

function resolveWelcomeMessage(config: FloatConfig): string {
  const message = config.welcomeMessage ?? config._themeConfig?.welcomeMessage;
  const trimmed = typeof message === "string" ? message.trim() : "";
  return trimmed.length > 0 ? trimmed : DEFAULT_WELCOME_MESSAGE;
}

function resolveBubbleIcon(config: FloatConfig): string {
  return getChannelMode(resolveChannel(config)) === "text"
    ? MESSAGES_ICON
    : MIC_ICON;
}

function createChimeSound(audioCtx: AudioContext): void {
  const t = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.setValueAtTime(1175, t + 0.1);
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.linearRampToValueAtTime(0.18, t + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + 0.65);

  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1175, t + 0.15);
  osc2.frequency.setValueAtTime(1400, t + 0.25);
  gain2.gain.setValueAtTime(0, t);
  gain2.gain.setValueAtTime(0.12, t + 0.15);
  gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  osc2.connect(gain2).connect(audioCtx.destination);
  osc2.start(t + 0.15);
  osc2.stop(t + 0.6);
}

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
  bubble.innerHTML = resolveBubbleIcon(config);
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
  let teaser: HTMLElement | null = null;
  let teaserTypewriter: number | null = null;
  let notificationDot: HTMLElement | null = null;
  let audioCtx: AudioContext | null = null;
  let welcomeSequenceStarted = false;
  let welcomeDismissed = false;
  let welcomeTimers: number[] = [];

  // Mutable config reference for updates
  let currentConfig = { ...config };

  const setBubbleClosedState = () => {
    bubble.innerHTML = resolveBubbleIcon(currentConfig);
    bubble.setAttribute("aria-label", "Open chat");
    bubble.classList.remove("perspective-float-bubble-open");
  };

  const setBubbleOpenState = () => {
    bubble.innerHTML = CLOSE_ICON;
    bubble.setAttribute("aria-label", "Close chat");
    bubble.classList.add("perspective-float-bubble-open");
  };

  const clearWelcomeTimers = () => {
    for (const timer of welcomeTimers) {
      window.clearTimeout(timer);
    }
    welcomeTimers = [];

    if (teaserTypewriter !== null) {
      window.clearInterval(teaserTypewriter);
      teaserTypewriter = null;
    }
  };

  const removeNotificationDot = () => {
    notificationDot?.remove();
    notificationDot = null;
  };

  const removeTeaser = () => {
    if (teaserTypewriter !== null) {
      window.clearInterval(teaserTypewriter);
      teaserTypewriter = null;
    }
    teaser?.remove();
    teaser = null;
    removeNotificationDot();
  };

  const showNotificationDot = () => {
    if (notificationDot || isOpen) return;
    notificationDot = document.createElement("span");
    notificationDot.className = "perspective-float-notification-dot";
    bubble.appendChild(notificationDot);
  };

  const playChime = () => {
    try {
      const AudioContextCtor =
        window.AudioContext ||
        (
          window as Window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextCtor) return;

      if (!audioCtx) {
        audioCtx = new AudioContextCtor();
      }

      if (audioCtx.state === "suspended") {
        void audioCtx.resume();
      }
      createChimeSound(audioCtx);
    } catch {
      // Browser may block autoplayed audio until user gesture.
    }
  };

  const renderTeaser = (message: string) => {
    removeTeaser();
    if (isOpen) return;

    const teaserEl = document.createElement("div");
    teaserEl.className = cn(
      "perspective-float-teaser perspective-embed-root",
      getThemeClass(currentConfig.theme)
    );

    const messageEl = document.createElement("div");
    messageEl.className = "perspective-float-teaser-message";
    const textEl = document.createElement("span");
    messageEl.appendChild(textEl);

    teaserEl.appendChild(messageEl);
    teaserEl.addEventListener("click", openFloat);

    document.body.appendChild(teaserEl);
    teaser = teaserEl;
    showNotificationDot();

    let charIndex = 0;
    teaserTypewriter = window.setInterval(() => {
      charIndex += 1;
      textEl.textContent = message.slice(0, charIndex);

      if (charIndex >= message.length) {
        if (teaserTypewriter !== null) {
          window.clearInterval(teaserTypewriter);
          teaserTypewriter = null;
        }
      }
    }, TYPEWRITER_SPEED_MS);
  };

  const maybeStartWelcomeSequence = () => {
    if (welcomeSequenceStarted || welcomeDismissed || isOpen) return;

    welcomeSequenceStarted = true;

    const soundTimer = window.setTimeout(() => {
      if (isOpen || welcomeDismissed) return;
      playChime();
    }, SOUND_DELAY_MS);

    const teaserTimer = window.setTimeout(() => {
      if (isOpen || welcomeDismissed) return;
      renderTeaser(resolveWelcomeMessage(currentConfig));
    }, TEASER_DELAY_MS);

    welcomeTimers.push(soundTimer, teaserTimer);
  };

  // Eagerly create chat window + iframe (hidden) so iframe loads in background.
  // On open, just show — instant, no iframe reparenting or reload.
  floatWindow = document.createElement("div");
  floatWindow.className = cn(
    "perspective-float-window perspective-embed-root",
    getThemeClass(currentConfig.theme)
  );
  floatWindow.style.display = "none";

  const closeBtn = document.createElement("button");
  closeBtn.className = "perspective-close";
  closeBtn.innerHTML = CLOSE_ICON;
  closeBtn.setAttribute("aria-label", "Close chat");

  const claimed = claimPreloadedIframe(researchId, "float");
  iframe =
    claimed?.iframe ??
    createIframe(
      researchId,
      "float",
      host,
      currentConfig.params,
      currentConfig.brand,
      currentConfig.theme
    );

  let loading: HTMLElement | null = null;
  if (!claimed?.wasReady) {
    loading = createLoadingIndicator({
      theme: currentConfig.theme,
      brand: currentConfig.brand,
    });
    loading.style.borderRadius = "16px";
  }

  if (claimed) {
    iframe.style.cssText = "border:none;";
  }

  if (claimed?.wasReady) {
    iframe.style.opacity = "1";
  } else {
    iframe.style.opacity = "0";
    iframe.style.transition = "opacity 0.3s ease";
  }

  floatWindow.appendChild(closeBtn);
  if (loading) {
    floatWindow.appendChild(loading);
  }
  floatWindow.appendChild(iframe);
  document.body.appendChild(floatWindow);

  // Set up message listener with loading state handling
  cleanup = setupMessageListener(
    researchId,
    {
      get onReady() {
        return () => {
          if (loading) {
            loading.style.opacity = "0";
            iframe!.style.opacity = "1";
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
        return closeFloat;
      },
      get onError() {
        return isOpen ? currentConfig.onError : undefined;
      },
    },
    iframe,
    host,
    { skipResize: true }
  );

  unregisterIframe = registerIframe(iframe, host);

  if (claimed?.wasReady) {
    currentConfig.onReady?.();
    const cachedToken = getCachedAuthToken(researchId);
    if (cachedToken) {
      currentConfig.onAuth?.({ researchId, token: cachedToken });
    }
  }

  const openFloat = () => {
    if (isOpen) return;
    isOpen = true;
    clearWelcomeTimers();
    removeTeaser();

    floatWindow!.style.display = "";
    setBubbleOpenState();
  };

  const closeFloat = () => {
    if (!isOpen) return;
    isOpen = false;

    floatWindow!.style.display = "none";
    setBubbleClosedState();

    currentConfig.onClose?.();
  };

  closeBtn.addEventListener("click", closeFloat);

  // Toggle on bubble click
  const bubbleClickHandler = () => {
    if (isOpen) {
      closeFloat();
    } else {
      openFloat();
    }
  };
  bubble.addEventListener("click", bubbleClickHandler);

  const unmount = () => {
    const wasOpen = isOpen;
    isOpen = false;
    clearWelcomeTimers();
    removeTeaser();
    closeBtn.removeEventListener("click", closeFloat);
    bubble.removeEventListener("click", bubbleClickHandler);
    cleanup?.();
    unregisterIframe?.();
    floatWindow?.remove();
    bubble.remove();
    void audioCtx?.close();
    audioCtx = null;
    removeTimer(researchId);
    if (wasOpen) currentConfig.onClose?.();
  };

  maybeStartWelcomeSequence();

  return {
    unmount,
    update: (options: Parameters<FloatHandle["update"]>[0]) => {
      currentConfig = { ...currentConfig, ...options };
      if (!isOpen) {
        setBubbleClosedState();
      }

      maybeStartWelcomeSequence();
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
