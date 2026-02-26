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

// ---------------------------------------------------------------------------
// Embed Auth Token Caching
//
// Tokens are JWTs scoped to a specific research, minted by the Perspective
// server after OAuth/email auth. They're cached in the PARENT page's
// first-party localStorage (not the iframe's) because:
//   1. Safari blocks/partitions third-party iframe localStorage
//   2. The parent page is first-party → localStorage is reliable
//   3. On next page load, the cached token is relayed back to the iframe
//      via postMessage (see perspective:ready handler below)
// This is the "session persistence" layer — there are no cookies for
// cross-origin embeds.
// ---------------------------------------------------------------------------

/** Decode JWT payload without verification (client-side — server verifies) */
function decodeTokenExpiry(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]!));
    return payload.data?.expiresAt ?? null;
  } catch {
    return null;
  }
}

function authTokenKey(researchId: string): string {
  return `${STORAGE_KEYS.embedAuthToken}:${researchId}`;
}

/** Get cached embed auth token for a research (returns null if expired) */
function getCachedAuthToken(researchId: string): string | null {
  if (!hasDom()) return null;
  try {
    const key = authTokenKey(researchId);
    const token = localStorage.getItem(key);
    if (!token) return null;
    const expiresAt = decodeTokenExpiry(token);
    if (expiresAt && expiresAt > Date.now()) return token;
    // Expired — clean up
    localStorage.removeItem(key);
    return null;
  } catch {
    return null;
  }
}

/** Cache embed auth token for a research */
function cacheAuthToken(researchId: string, token: string): void {
  if (!hasDom()) return;
  try {
    localStorage.setItem(authTokenKey(researchId), token);
  } catch {
    // localStorage blocked
  }
}

/** Clear cached embed auth token for a research */
function clearAuthToken(researchId: string): void {
  if (!hasDom()) return;
  try {
    localStorage.removeItem(authTokenKey(researchId));
  } catch {
    // localStorage blocked
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

  // Track active auth flow cleanup for concurrent request prevention and embed teardown
  let activeAuthCleanup: (() => void) | null = null;

  const handler = (event: MessageEvent<EmbedMessage>) => {
    // Security: Only accept messages from our embed host and from the expected iframe
    if (event.origin !== host) return;
    if (event.source !== iframe.contentWindow) return;

    // Only process messages from our embed
    if (typeof event.data?.type !== "string") return;
    if (!event.data.type.startsWith("perspective:")) return;
    if (event.data.researchId !== researchId) {
      console.info("[perspective-sdk] researchId mismatch, dropping:", {
        expected: researchId,
        got: event.data.researchId,
        type: event.data.type,
      });
      return;
    }
    console.info("[perspective-sdk] message:", event.data.type, {
      researchId: event.data.researchId,
    });

    switch (event.data.type) {
      case MESSAGE_TYPES.ready: {
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
        // Session persistence: on iframe load, relay any cached (non-expired)
        // token so the user doesn't have to re-authenticate on page navigation.
        // This is the only path for restoring auth state — there are no cookies.
        const cachedToken = getCachedAuthToken(researchId);
        console.info("[perspective-sdk] on ready: cached token?", {
          researchId,
          found: !!cachedToken,
        });
        if (cachedToken) {
          sendMessage(iframe, host, {
            type: MESSAGE_TYPES.authComplete,
            token: cachedToken,
            researchId,
          });
        }
        config.onReady?.();
        break;
      }

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

      case MESSAGE_TYPES.redirect: {
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

      case MESSAGE_TYPES.authRequest: {
        // The iframe can't do OAuth itself (cross-origin context, third-party
        // cookie blocking). So the iframe asks the SDK to open auth in a
        // first-party window (popup or new tab) where cookies work normally.
        //
        // Two token delivery paths back to the SDK:
        //   1. postMessage (popup mode, desktop) — callback page sends token
        //      via window.opener.postMessage, SDK receives via onPopupMessage
        //   2. Hash fragment (redirect mode, mobile/blocked popups) — callback
        //      redirects to parent URL with #embed-auth-token=xxx, SDK picks
        //      it up via hashchange listener
        // Both paths converge in relayToken() which caches + relays to iframe.
        const { authUrl } = event.data;
        if (!authUrl || typeof authUrl !== "string") return;

        const expectedOrigin = new URL(host).origin;

        // Security: ensure authUrl points to the expected host origin
        try {
          const parsedAuthUrl = new URL(authUrl);
          if (parsedAuthUrl.origin !== expectedOrigin) {
            console.warn(
              "[Perspective] Blocked auth URL with unexpected origin:",
              authUrl
            );
            return;
          }
        } catch {
          console.warn("[Perspective] Blocked malformed auth URL:", authUrl);
          return;
        }

        // Clean up any previous auth flow before starting a new one
        activeAuthCleanup?.();

        // Open auth window — user completes OAuth on perspective.ai (first-party)
        // After completion, token comes back via postMessage (popup) or hash fragment (redirect fallback)
        const returnUrl =
          window.location.href.split("#")[0] ?? window.location.href;
        const fullAuthUrl = `${authUrl}&return_url=${encodeURIComponent(returnUrl)}`;

        // Try popup with features (centered, sized) — browsers show this as a
        // proper popup window rather than a new tab. Falls back to new tab if
        // popups are blocked; hashchange redirect mode still works in that case.
        const width = 500;
        const height = 700;
        const left =
          (window.screen.width - width) / 2 +
          (window.screenLeft ?? window.screenX ?? 0);
        const top =
          (window.screen.height - height) / 2 +
          (window.screenTop ?? window.screenY ?? 0);
        const popupFeatures = `width=${width},height=${height},top=${top},left=${left},menubar=no,toolbar=no,location=no,status=no,scrollbars=yes`;
        const authWindow = window.open(
          fullAuthUrl,
          "perspective-auth",
          popupFeatures
        );

        // Single codepath for token handling: cache in parent's first-party
        // localStorage, relay to iframe for auth state, and notify host app
        const relayToken = (token: string) => {
          console.info("[perspective-sdk] OAuth relayToken:", {
            researchId,
            key: `${STORAGE_KEYS.embedAuthToken}:${researchId}`,
          });
          cacheAuthToken(researchId, token);
          sendMessage(iframe, host, {
            type: MESSAGE_TYPES.authComplete,
            token,
            researchId,
          });
          config.onAuth?.({ researchId, token });
        };

        // Prevents stale listeners if user starts a new auth flow or closes
        // the popup — ensures only one auth flow is active at a time
        const cleanupAuthListeners = () => {
          clearInterval(pollPopupClosed);
          window.removeEventListener("hashchange", onHashChange);
          window.removeEventListener("message", onPopupMessage);
          activeAuthCleanup = null;
        };

        // Listen for hash fragment containing the token (redirect mode)
        const onHashChange = () => {
          const hash = window.location.hash;
          if (!hash.includes("embed-auth-token=")) return;

          const params = new URLSearchParams(hash.slice(1));
          const token = params.get("embed-auth-token");

          // Clear hash synchronously before any async work
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search
          );

          if (token) {
            relayToken(token);
          }

          cleanupAuthListeners();
        };
        window.addEventListener("hashchange", onHashChange);

        // Also listen for postMessage from popup (popup mode)
        const onPopupMessage = (popupEvent: MessageEvent) => {
          if (
            popupEvent.source !== authWindow ||
            popupEvent.data?.type !== MESSAGE_TYPES.popupAuthComplete ||
            popupEvent.origin !== expectedOrigin
          )
            return;
          const token = popupEvent.data?.token;
          if (token) {
            relayToken(token);
          }
          cleanupAuthListeners();
        };
        window.addEventListener("message", onPopupMessage);

        // Poll for popup close only if popup actually opened (not blocked)
        // If blocked, hashchange redirect mode is still available as fallback
        const pollPopupClosed = authWindow
          ? setInterval(() => {
              if (authWindow.closed) {
                cleanupAuthListeners();
              }
            }, 500)
          : undefined;

        activeAuthCleanup = cleanupAuthListeners;
        break;
      }

      case MESSAGE_TYPES.authComplete: {
        // Iframe completed auth internally (e.g. email verification in mobile
        // direct iframe fallback) and sends token to SDK for caching in
        // first-party localStorage. This ensures the token persists even if
        // iframe localStorage is blocked (Safari third-party storage).
        const { token } = event.data;
        console.info("[perspective-sdk] authComplete from iframe:", {
          hasToken: !!token,
          researchId,
        });
        if (token) {
          cacheAuthToken(researchId, token);
          console.info(
            "[perspective-sdk] cached token in parent localStorage:",
            { key: `${STORAGE_KEYS.embedAuthToken}:${researchId}` }
          );
          config.onAuth?.({ researchId, token });
        }
        break;
      }

      case MESSAGE_TYPES.authSignout:
        // User signed out in iframe — clear cached token so the next visit
        // requires re-authentication (no stale session)
        clearAuthToken(researchId);
        break;
    }
  };

  window.addEventListener("message", handler);
  return () => {
    window.removeEventListener("message", handler);
    activeAuthCleanup?.();
  };
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
