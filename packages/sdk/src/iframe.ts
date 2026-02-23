/**
 * iframe creation and postMessage communication
 * SSR-safe - all DOM access is guarded
 */

import type {
  BrandColors,
  EmbedConfig,
  EmbedMessage,
  EmbedType,
} from "./types";
import { hasDom } from "./config";
import {
  RESERVED_PARAMS,
  PARAM_KEYS,
  BRAND_KEYS,
  MESSAGE_TYPES,
  THEME_VALUES,
  PARAM_VALUES,
  STORAGE_KEYS,
  SDK_VERSION,
  CURRENT_FEATURES,
  ERROR_CODES,
} from "./constants";
import { normalizeHex } from "./utils";

/** Validate redirect URL - allow https, http localhost, and relative URLs */
function isAllowedRedirectUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  // Relative URLs (path, query, hash) are always safe — same origin by definition
  // Exclude protocol-relative URLs (// prefix) which resolve to an external origin
  if (
    (url.startsWith("/") && !url.startsWith("//")) ||
    url.startsWith("?") ||
    url.startsWith("#")
  )
    return true;
  try {
    const parsed = new URL(url, window.location.origin);
    const protocol = parsed.protocol.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();

    if (protocol === "https:") return true;
    if (
      protocol === "http:" &&
      (hostname === "localhost" || hostname === "127.0.0.1")
    )
      return true;

    return false;
  } catch {
    return false;
  }
}

/** Get or create persistent anonymous ID */
function getOrCreateAnonId(): string {
  if (!hasDom()) return "";

  try {
    let id = localStorage.getItem(STORAGE_KEYS.anonId);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEYS.anonId, id);
    }
    return id;
  } catch {
    // localStorage might be blocked
    return crypto.randomUUID();
  }
}

/** Collect all search params from the parent page URL (excluding reserved SDK params) */
function getParentSearchParams(): Record<string, string> {
  if (!hasDom()) return {};

  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(window.location.search);

  for (const [key, value] of searchParams.entries()) {
    if (!RESERVED_PARAMS.has(key)) {
      params[key] = value;
    }
  }

  return params;
}

/** Build iframe URL with all params */
function buildIframeUrl(
  researchId: string,
  type: EmbedType,
  host: string,
  customParams?: Record<string, string>,
  brand?: { light?: BrandColors; dark?: BrandColors },
  themeOverride?: "dark" | "light" | "system"
): string {
  const url = new URL(`${host}/interview/${researchId}`);

  // Base embed params
  url.searchParams.set(PARAM_KEYS.embed, PARAM_VALUES.true);
  url.searchParams.set(PARAM_KEYS.embedType, type === "float" ? "chat" : type);

  // Detect and pass system theme preference (can be overridden)
  if (hasDom()) {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (themeOverride && themeOverride !== THEME_VALUES.system) {
      url.searchParams.set(PARAM_KEYS.theme, themeOverride);
    } else {
      url.searchParams.set(
        PARAM_KEYS.theme,
        isDark ? THEME_VALUES.dark : THEME_VALUES.light
      );
    }
  } else {
    // SSR fallback
    url.searchParams.set(PARAM_KEYS.theme, themeOverride || THEME_VALUES.light);
  }

  // Auto-forward all parent page search params (e.g. ?ref=pricing-enterprise)
  // These are added first so that explicit customParams can override them
  const parentParams = getParentSearchParams();
  for (const [key, value] of Object.entries(parentParams)) {
    url.searchParams.set(key, value);
  }

  // Helper to set param only if color is valid
  const setColor = (key: string, color: string | undefined) => {
    if (!color) return;
    const normalized = normalizeHex(color);
    if (normalized) url.searchParams.set(key, normalized);
  };

  // Add brand colors using short keys
  if (brand?.light) {
    setColor(BRAND_KEYS.primary, brand.light.primary);
    setColor(BRAND_KEYS.secondary, brand.light.secondary);
    setColor(BRAND_KEYS.bg, brand.light.bg);
    setColor(BRAND_KEYS.text, brand.light.text);
  }

  // Add dark mode brand colors
  if (brand?.dark) {
    setColor(BRAND_KEYS.darkPrimary, brand.dark.primary);
    setColor(BRAND_KEYS.darkSecondary, brand.dark.secondary);
    setColor(BRAND_KEYS.darkBg, brand.dark.bg);
    setColor(BRAND_KEYS.darkText, brand.dark.text);
  }

  // Add custom params, filtering out reserved keys
  if (customParams) {
    for (const [key, value] of Object.entries(customParams)) {
      if (!RESERVED_PARAMS.has(key)) {
        url.searchParams.set(key, value);
      }
    }
  }

  return url.toString();
}

export function createIframe(
  researchId: string,
  type: EmbedType,
  host: string,
  params?: Record<string, string>,
  brand?: { light?: BrandColors; dark?: BrandColors },
  themeOverride?: "dark" | "light" | "system"
): HTMLIFrameElement {
  if (!hasDom()) {
    // Return a stub for SSR
    return {} as HTMLIFrameElement;
  }

  const iframe = document.createElement("iframe");
  iframe.src = buildIframeUrl(
    researchId,
    type,
    host,
    params,
    brand,
    themeOverride
  );
  iframe.setAttribute("allow", "microphone; camera");
  iframe.setAttribute("allowfullscreen", "true");
  iframe.setAttribute(
    "sandbox",
    "allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation"
  );
  iframe.setAttribute("data-perspective", "true");
  iframe.style.cssText = "border:none;";

  return iframe;
}

export function setupMessageListener(
  researchId: string,
  config: Partial<EmbedConfig>,
  iframe: HTMLIFrameElement,
  host: string,
  options?: { skipResize?: boolean }
): () => void {
  if (!hasDom()) {
    return () => {};
  }

  const handler = (event: MessageEvent<EmbedMessage>) => {
    // Security: Only accept messages from our embed host and from the expected iframe
    if (event.origin !== host) return;
    if (event.source !== iframe.contentWindow) return;

    // Only process messages from our embed
    if (typeof event.data?.type !== "string") return;
    if (!event.data.type.startsWith("perspective:")) return;
    if (event.data.researchId !== researchId) return;

    switch (event.data.type) {
      case MESSAGE_TYPES.ready:
        // Send scrollbar styles when iframe is ready
        sendScrollbarStyles(iframe, host);
        // Send anon_id for anonymous auth
        sendMessage(iframe, host, {
          type: MESSAGE_TYPES.anonId,
          anonId: getOrCreateAnonId(),
        });
        // Send init message with version/features for handshake
        sendMessage(iframe, host, {
          type: MESSAGE_TYPES.init,
          version: SDK_VERSION,
          features: CURRENT_FEATURES,
          researchId,
        });
        config.onReady?.();
        break;

      case MESSAGE_TYPES.resize:
        // Auto-resize iframe height (skip for fixed-container embeds)
        if (!options?.skipResize) {
          iframe.style.height = `${event.data.height}px`;
        }
        break;

      case MESSAGE_TYPES.submit:
        config.onSubmit?.({ researchId });
        break;

      case MESSAGE_TYPES.close:
        config.onClose?.();
        break;

      case MESSAGE_TYPES.error: {
        const error = new Error(
          event.data.error
        ) as import("./types").EmbedError;
        error.code =
          (event.data.code as import("./types").ErrorCode) || "UNKNOWN";

        // Always log critical errors to console
        if (error.code === ERROR_CODES.SDK_OUTDATED) {
          console.error(
            "[Perspective] SDK version outdated. Please update @perspective-ai/sdk to the latest version.",
            error.message
          );
        } else {
          console.error("[Perspective] Embed error:", error.message);
        }

        config.onError?.(error);
        break;
      }

      case MESSAGE_TYPES.redirect:
        const redirectUrl = event.data.url;
        // Security: Only allow http(s) and localhost URLs
        if (!isAllowedRedirectUrl(redirectUrl)) {
          console.warn(
            "[Perspective] Blocked unsafe redirect URL:",
            redirectUrl
          );
          return;
        }
        if (config.onNavigate) {
          config.onNavigate(redirectUrl);
        } else {
          // Fallback: auto-navigate parent page
          window.location.href = redirectUrl;
        }
        break;
    }
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}

/** Send a message to the embed iframe */
export function sendMessage(
  iframe: HTMLIFrameElement,
  host: string,
  message: { type: string; [key: string]: unknown }
): void {
  if (!hasDom()) return;
  iframe.contentWindow?.postMessage(message, host);
}

/** Track all active iframes for theme change notifications */
const activeIframes = new Map<HTMLIFrameElement, string>();

export function registerIframe(
  iframe: HTMLIFrameElement,
  host: string
): () => void {
  activeIframes.set(iframe, host);
  return () => {
    activeIframes.delete(iframe);
    if (activeIframes.size === 0) {
      teardownGlobalListeners();
    }
  };
}

/** Get scrollbar CSS styles */
function getScrollbarStyles(): string {
  if (!hasDom()) return "";

  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const borderColor = isDark ? "hsl(217 33% 17%)" : "hsl(240 6% 90%)";

  return `
    * {
      scrollbar-width: thin;
      scrollbar-color: ${borderColor} transparent;
    }
    *::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }
    *::-webkit-scrollbar-track {
      background: transparent;
    }
    *::-webkit-scrollbar-thumb {
      background-color: ${borderColor};
      border-radius: 9999px;
      border: 2px solid transparent;
      background-clip: padding-box;
    }
    *::-webkit-scrollbar-thumb:hover {
      background-color: color-mix(in srgb, ${borderColor} 80%, currentColor);
    }
  `;
}

/** Send scrollbar styles to an iframe */
export function sendScrollbarStyles(
  iframe: HTMLIFrameElement,
  host: string
): void {
  const styles = getScrollbarStyles();
  sendMessage(iframe, host, {
    type: MESSAGE_TYPES.injectStyles,
    styles,
  });
}

/** Notify all active iframes of theme change */
export function notifyThemeChange(): void {
  if (!hasDom()) return;

  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  activeIframes.forEach((host, iframe) => {
    const message = {
      type: MESSAGE_TYPES.themeChange,
      theme: isDark ? THEME_VALUES.dark : THEME_VALUES.light,
    };
    sendMessage(iframe, host, message);
    sendScrollbarStyles(iframe, host);
  });
}

let themeListener: ((e: MediaQueryListEvent) => void) | null = null;
let themeMediaQuery: MediaQueryList | null = null;
let globalMessageHandler: ((event: MessageEvent) => void) | null = null;
let globalListenersInitialized = false;

function setupThemeListener(): void {
  if (themeListener || !hasDom()) return;

  themeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  themeListener = () => notifyThemeChange();
  themeMediaQuery.addEventListener("change", themeListener);
}

function teardownThemeListener(): void {
  if (themeListener && themeMediaQuery) {
    themeMediaQuery.removeEventListener("change", themeListener);
    themeListener = null;
    themeMediaQuery = null;
  }
}

function setupGlobalListeners(): void {
  if (!hasDom() || globalMessageHandler) return;

  setupThemeListener();

  globalMessageHandler = (event: MessageEvent) => {
    if (!event.data?.type?.startsWith("perspective:")) return;
    if (event.data.type === MESSAGE_TYPES.requestScrollbarStyles) {
      const iframes = Array.from(
        document.querySelectorAll("iframe[data-perspective]")
      );
      const sourceIframe = iframes.find(
        (iframe) => (iframe as HTMLIFrameElement).contentWindow === event.source
      ) as HTMLIFrameElement | undefined;
      if (sourceIframe) {
        const host = activeIframes.get(sourceIframe);
        if (host && event.origin === host) {
          sendScrollbarStyles(sourceIframe, host);
        }
      }
    }
  };

  window.addEventListener("message", globalMessageHandler);
}

function teardownGlobalListeners(): void {
  if (globalMessageHandler) {
    window.removeEventListener("message", globalMessageHandler);
    globalMessageHandler = null;
  }
  teardownThemeListener();
  globalListenersInitialized = false;
}

export function ensureGlobalListeners(): void {
  if (globalListenersInitialized) return;
  globalListenersInitialized = true;
  setupGlobalListeners();
}
