/**
 * Floating bubble embed - floating button that opens a chat window
 * SSR-safe - returns no-op handle on server
 */

import type {
  AIAssistantChannel,
  FloatHandle,
  InternalEmbedConfig,
  LauncherIcon,
  TeaserConfig,
  ThemeConfig,
} from "./types";
import { hasDom, getHost } from "./config";
import {
  createIframe,
  setupMessageListener,
  registerIframe,
  ensureGlobalListeners,
  ensureHostPreconnect,
} from "./iframe";
import { createLoadingIndicator, prefetchSceneImage } from "./loading";
import { injectStyles, AUDIO_ICON, MESSAGES_ICON, CLOSE_ICON } from "./styles";
import { getPersistedOpenState, setPersistedOpenState } from "./state";
import {
  cn,
  getThemeClass,
  resolveIsDark,
  readableTextColor,
  isValidDelayMs,
} from "./utils";
import { enrichContainer } from "./attribution";
import { perfLog } from "./perf";

/** Merge API launcher config over a base launcher (API is source of truth) */
function mergeApiLauncher(
  base: InternalEmbedConfig,
  apiLauncher: NonNullable<ThemeConfig["embedSettings"]>["launcher"]
): InternalEmbedConfig {
  if (!apiLauncher) return base;
  const customerLauncher = base.launcher ?? {};
  return {
    ...base,
    launcher: {
      ...customerLauncher,
      ...apiLauncher,
      style: { ...customerLauncher.style, ...apiLauncher.style },
    },
  };
}
type ChannelMode = "voice" | "text" | "both";

/** How long the chime leads the teaser bubble */
const SOUND_LEAD_MS = 1000;
const DEFAULT_TEASER_DELAY_MS = 3000;
const TYPEWRITER_SPEED_MS = 40;
const DEFAULT_WELCOME_MESSAGE = "Have a question? I'm here to help.";

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
  config: InternalEmbedConfig
): AIAssistantChannel | AIAssistantChannel[] | undefined {
  return (
    config.channel ??
    config._apiConfig?.allowedChannels ??
    config._apiConfig?.channel ??
    undefined
  );
}

function resolveWelcomeMessage(config: InternalEmbedConfig): string {
  const message = config.welcomeMessage ?? config._apiConfig?.welcomeMessage;
  const trimmed = typeof message === "string" ? message.trim() : "";
  return trimmed.length > 0 ? trimmed : DEFAULT_WELCOME_MESSAGE;
}

/** Merge API teaser settings over customer config (API is source of truth) */
function resolveTeaserConfig(
  config: InternalEmbedConfig
): Required<TeaserConfig> {
  const merged: TeaserConfig = {
    ...config.teaser,
    ...config._apiConfig?.embedSettings?.teaser,
  };
  const delay = isValidDelayMs(merged.delay)
    ? merged.delay
    : DEFAULT_TEASER_DELAY_MS;
  return {
    enabled: merged.enabled !== false,
    delay,
    sound: merged.sound !== false,
  };
}

export function getDefaultIconHtml(config: InternalEmbedConfig): string {
  return getChannelMode(resolveChannel(config)) === "text"
    ? MESSAGES_ICON
    : AUDIO_ICON;
}

export function createIconImg(
  src: string,
  fallbackHtml: string
): HTMLImageElement {
  const img = document.createElement("img");
  img.src = src;
  img.alt = "";
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "cover";
  img.style.borderRadius = "inherit";
  img.onerror = () => {
    const parent = img.parentElement;
    if (parent) {
      img.remove();
      parent.innerHTML = fallbackHtml;
    }
  };
  return img;
}

function applyBubbleIcon(
  bubble: HTMLButtonElement,
  config: InternalEmbedConfig
): void {
  const icon: LauncherIcon = config.launcher?.icon ?? "default";
  const fallbackHtml = getDefaultIconHtml(config);

  if (icon === "default") {
    bubble.innerHTML = fallbackHtml;
    return;
  }

  if (icon === "avatar") {
    const avatarUrl = config._apiConfig?.avatarUrl;
    if (avatarUrl) {
      bubble.innerHTML = "";
      bubble.appendChild(createIconImg(avatarUrl, fallbackHtml));
    } else {
      bubble.innerHTML = fallbackHtml;
    }
    return;
  }

  if (typeof icon === "object" && icon !== null) {
    if ("url" in icon) {
      bubble.innerHTML = "";
      bubble.appendChild(createIconImg(icon.url, fallbackHtml));
      return;
    }

    if ("svg" in icon) {
      bubble.innerHTML = icon.svg;
      return;
    }
  }

  // Exhaustive — should never reach here
  bubble.innerHTML = fallbackHtml;
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

export function createFloatBubble(config: InternalEmbedConfig): FloatHandle {
  const { researchId, _apiConfig, theme, brand } = config;

  // SSR safety: return no-op handle
  if (!hasDom()) {
    return createNoOpHandle(researchId);
  }
  const host = getHost(config.host);

  ensureHostPreconnect(host);
  injectStyles();
  ensureGlobalListeners();

  // Create bubble button
  const bubble = document.createElement("button");
  bubble.className = cn(
    "perspective-float-bubble perspective-embed-root",
    getThemeClass(config.theme)
  );
  applyBubbleIcon(bubble, config);
  bubble.setAttribute("aria-label", "Open chat");
  bubble.setAttribute("data-perspective", "float-bubble");

  // Apply theme color if available
  if (_apiConfig || brand) {
    const isDark = resolveIsDark(theme);
    const bg = isDark
      ? (brand?.dark?.primary ?? _apiConfig?.darkPrimaryColor ?? "#a78bfa")
      : (brand?.light?.primary ?? _apiConfig?.primaryColor ?? "#7c3aed");
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
    // Keep the icon (currentColor) readable on a light brand.primary; the CSS
    // default is white, so fall back to white when bg isn't a parseable hex.
    bubble.style.color = readableTextColor(bg) ?? "#ffffff";
    bubble.style.boxShadow = `0 4px 12px ${bg}66`;
  }

  // Merge API launcher config over customer config (API is source of truth)
  let mergedConfig = mergeApiLauncher(
    config,
    _apiConfig?.embedSettings?.launcher
  );
  if (mergedConfig !== config) {
    applyBubbleIcon(bubble, mergedConfig);
  }

  // Apply launcher style overrides (highest precedence)
  if (mergedConfig.launcher?.style) {
    Object.assign(bubble.style, mergedConfig.launcher.style);
  }

  // Apply launcher className (additive)
  if (mergedConfig.launcher?.className) {
    for (const cls of mergedConfig.launcher.className
      .split(/\s+/)
      .filter(Boolean)) {
      bubble.classList.add(cls);
    }
  }

  document.body.appendChild(bubble);
  enrichContainer(bubble, "float", config);

  // Auto-fetch config when avatar icon is requested but no _apiConfig provided
  // (programmatic API — browser.ts auto-init handles this separately)
  if (config.launcher?.icon === "avatar" && !_apiConfig?.avatarUrl) {
    fetch(`${host}/api/v1/embed/config/${researchId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((fetchedConfig) => {
        if (!fetchedConfig) return;
        currentConfig = {
          ...currentConfig,
          _apiConfig: { ...currentConfig._apiConfig, ...fetchedConfig },
        };
        if (fetchedConfig.avatarUrl && !isOpen) {
          applyBubbleIcon(bubble, currentConfig);
        }
        // The fetched config may carry teaser settings (e.g. a dashboard
        // disable) that must cancel the sequence armed at mount.
        syncTeaserState();
      })
      .catch(() => {
        // Silently fall back to default icon
      });
  }

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
  let welcomeTimers: number[] = [];
  const persistOpenState = (open: boolean) => {
    setPersistedOpenState({
      researchId,
      type: "float",
      host: config.host,
      open,
    });
  };
  const shouldRestoreOpen =
    getPersistedOpenState({
      researchId,
      type: "float",
      host: config.host,
    }) === true;

  // Mutable config reference for updates
  let currentConfig = { ...mergedConfig };

  const setBubbleClosedState = () => {
    applyBubbleIcon(bubble, currentConfig);
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
    teaserEl.addEventListener("click", () => openFloat());

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

  const maybeStartWelcomeSequence = (
    teaserConfig = resolveTeaserConfig(currentConfig)
  ) => {
    if (welcomeSequenceStarted || isOpen) return;

    // Not marked as started, so a later update() that enables the teaser
    // (e.g. async API config arriving) can still kick off the sequence.
    if (!teaserConfig.enabled) return;

    welcomeSequenceStarted = true;

    if (teaserConfig.sound) {
      // The chime tracks the teaser: it announces the bubble 1s ahead of it
      // (or as early as possible when the delay is shorter than the lead)
      const soundTimer = window.setTimeout(
        () => {
          if (isOpen) return;
          playChime();
        },
        Math.max(0, teaserConfig.delay - SOUND_LEAD_MS)
      );
      welcomeTimers.push(soundTimer);
    }

    const teaserTimer = window.setTimeout(() => {
      if (isOpen) return;
      renderTeaser(resolveWelcomeMessage(currentConfig));
    }, teaserConfig.delay);

    welcomeTimers.push(teaserTimer);
  };

  // Re-evaluate the teaser after a config change: a disable cancels any
  // pending or visible teaser (and re-arms on a later enable); otherwise
  // start the sequence if it hasn't run yet.
  const syncTeaserState = () => {
    const teaserConfig = resolveTeaserConfig(currentConfig);
    if (!teaserConfig.enabled) {
      clearWelcomeTimers();
      removeTeaser();
      welcomeSequenceStarted = false;
      return;
    }
    maybeStartWelcomeSequence(teaserConfig);
  };

  const openFloat = () => {
    if (isOpen) return;
    isOpen = true;
    persistOpenState(true);
    clearWelcomeTimers();
    removeTeaser();

    // Create float window
    floatWindow = document.createElement("div");
    floatWindow.className = cn(
      "perspective-float-window perspective-embed-root",
      getThemeClass(currentConfig.theme)
    );

    // Temporary X over the loading skeleton, removed at skeleton-hide once the
    // app draws its own in its header (see hideSkeleton). Hidden if disableClose.
    const closeBtn = document.createElement("button");
    closeBtn.className = "perspective-close";
    closeBtn.innerHTML = CLOSE_ICON;
    closeBtn.setAttribute("aria-label", "Close chat");
    closeBtn.addEventListener("click", () => closeFloat());
    if (currentConfig.disableClose) {
      closeBtn.style.display = "none";
    }

    // Create loading indicator with theme and brand colors
    const loading = createLoadingIndicator({
      theme: currentConfig.theme,
      brand: currentConfig.brand,
      apiConfig: currentConfig._apiConfig,
      researchId,
      host,
    });
    loading.style.borderRadius = "16px";

    // Create iframe (hidden initially). Appearance overrides resolved server-side.
    iframe = createIframe(
      researchId,
      "float",
      host,
      currentConfig.params,
      currentConfig.brand,
      currentConfig.theme
    );
    iframe.style.opacity = "0"; // snaps visible at handoff — see widget.ts

    floatWindow.appendChild(closeBtn);
    floatWindow.appendChild(loading);
    floatWindow.appendChild(iframe);
    document.body.appendChild(floatWindow);

    // See widget.ts — hide skeleton on first `visual-ready`, with `ready` fallback.
    let skeletonHidden = false;
    const hideSkeleton = () => {
      if (skeletonHidden) return;
      skeletonHidden = true;
      perfLog("SDK", "skeleton hide started (float)", { researchId });
      loading.style.opacity = "0";
      iframe!.style.opacity = "1";
      setTimeout(() => loading.remove(), 150);
      // The app now draws its own X in its header, so drop ours. The launcher
      // bubble still closes the window.
      closeBtn.remove();
    };

    // Set up message listener with loading state handling
    cleanup = setupMessageListener(
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
          return closeFloat;
        },
        get onError() {
          return currentConfig.onError;
        },
      },
      iframe,
      host,
      { skipResize: true, renderCloseButton: !currentConfig.disableClose }
    );

    // Register iframe for theme change notifications
    if (iframe) {
      unregisterIframe = registerIframe(iframe, host);
    }

    // Update bubble icon to close
    setBubbleOpenState();
  };

  const closeFloat = (options?: { persistState?: boolean }) => {
    if (!isOpen) return;
    if (options?.persistState !== false) {
      persistOpenState(false);
    }
    isOpen = false;

    cleanup?.();
    unregisterIframe?.();
    floatWindow?.remove();
    floatWindow = null;
    iframe = null;
    cleanup = null;
    unregisterIframe = null;

    // Restore bubble icon
    setBubbleClosedState();

    currentConfig.onClose?.();
  };

  // Warm the scene image on intent so it's cached when the window opens.
  const warmScene = () => prefetchSceneImage(researchId, host);
  bubble.addEventListener("pointerenter", warmScene, { once: true });
  bubble.addEventListener("focus", warmScene, { once: true });

  // Toggle on bubble click
  bubble.addEventListener("click", () => {
    if (isOpen) {
      closeFloat();
    } else {
      openFloat();
    }
  });

  const unmount = () => {
    clearWelcomeTimers();
    removeTeaser();
    closeFloat({ persistState: false });
    bubble.remove();
    void audioCtx?.close();
    audioCtx = null;
  };

  const destroy = () => {
    persistOpenState(false);
    unmount();
  };

  if (shouldRestoreOpen) {
    welcomeSequenceStarted = true;
    openFloat();
  } else {
    maybeStartWelcomeSequence();
  }

  return {
    unmount,
    update: (
      options: Parameters<FloatHandle["update"]>[0] & {
        _apiConfig?: ThemeConfig;
      }
    ) => {
      const prevApiTeaser = currentConfig._apiConfig?.embedSettings?.teaser;
      currentConfig = { ...currentConfig, ...options };

      // An _apiConfig refresh that omits teaser settings keeps the previous
      // ones — a later payload must not silently undo an earlier API disable.
      if (
        options._apiConfig &&
        prevApiTeaser &&
        !options._apiConfig.embedSettings?.teaser
      ) {
        currentConfig = {
          ...currentConfig,
          _apiConfig: {
            ...currentConfig._apiConfig!,
            embedSettings: {
              ...currentConfig._apiConfig!.embedSettings,
              teaser: prevApiTeaser,
            },
          },
        };
      }

      // Recompute bubble color from updated API config or brand
      const apiCfg = currentConfig._apiConfig;
      if (apiCfg || currentConfig.brand) {
        const isDark = resolveIsDark(currentConfig.theme);
        const bg = isDark
          ? (currentConfig.brand?.dark?.primary ??
            apiCfg?.darkPrimaryColor ??
            "#a78bfa")
          : (currentConfig.brand?.light?.primary ??
            apiCfg?.primaryColor ??
            "#7c3aed");
        // Only update if launcher.style didn't override backgroundColor
        if (!currentConfig.launcher?.style?.backgroundColor) {
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
          bubble.style.color = readableTextColor(bg) ?? "#ffffff";
          bubble.style.boxShadow = `0 4px 12px ${bg}66`;
        }
      }

      // Apply API launcher config when _apiConfig is updated (e.g. from async config fetch)
      currentConfig = mergeApiLauncher(
        currentConfig,
        currentConfig._apiConfig?.embedSettings?.launcher
      );

      // Re-apply bubble icon from merged launcher config
      applyBubbleIcon(bubble, currentConfig);

      // Re-apply launcher style to bubble DOM (e.g. borderRadius from API)
      if (currentConfig.launcher?.style) {
        Object.assign(bubble.style, currentConfig.launcher.style);
      }

      if (!isOpen) {
        setBubbleClosedState();
      }

      syncTeaserState();
    },
    destroy,
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
