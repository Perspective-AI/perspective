/**
 * Loading overlay for embed iframes: the research's scene image behind a
 * frosted card, with a circular loader centered in the card — the
 * interview's stable chrome, not a skeleton that drifts when the app UI
 * changes.
 *
 * Lives in the host page DOM (the iframe is cross-origin), so layout uses
 * container queries on the consumer's slot, not viewport media queries.
 * SSR-safe: no-op without a DOM.
 */

import type { BrandColors, ThemeConfig, ThemeValue } from "./types";
import { hasDom, getHost } from "./config";
import { DEFAULT_THEME } from "./embed-api";
import { resolveTheme, readableTextColor } from "./utils";

/**
 * Card layout breakpoints, matched to the interview app's container queries so
 * the card doesn't jump at handoff. In px, not the app's rem: this overlay
 * lives in the *host* page, so a rem breakpoint would resolve against the
 * host's root font-size — which we don't control — while the iframe's card
 * resolves against our app's (16px). px keeps the overlay locked to the
 * iframe's fixed pixels regardless of the host. Browser zoom scales px too, so
 * zoomed users still match; only a rare non-default browser font-size setting
 * wouldn't (keep the interview root at 16px to stay exact there).
 */
const CARD_WIDTH_BP_PX = 672; // @2xl / max-w-2xl (42rem): full-bleed below, boxed at/above
const CARD_H_BP_MID_PX = 448; // @hsm (28rem): py-1 (4px) -> py-12 (48px)
const CARD_H_BP_LG_PX = 768; // @hlg (48rem): py-12 (48px) -> py-20 (80px)

/**
 * Matches the app's default surface (`bg-interview-bg`) and translucent card,
 * so nothing flashes at handoff. `brand.bg` overrides the background; the
 * panel palette follows the background's luminance (see getLoadingColors).
 */
const DEFAULT_COLORS = {
  light: {
    bg: "#f5f2f0",
    panel: "rgba(255, 255, 255, 0.55)",
    panelBorder: "rgba(0, 0, 0, 0.08)",
  },
  dark: {
    bg: "#15171e",
    panel: "rgba(21, 23, 30, 0.55)",
    panelBorder: "rgba(255, 255, 255, 0.08)",
  },
};

export interface LoadingOptions {
  /** Theme override: 'dark', 'light', or 'system' (uses system preference) */
  theme?: ThemeValue;
  /** Brand colors */
  brand?: {
    light?: BrandColors;
    dark?: BrandColors;
  };
  /** Enables the scene image behind the card */
  researchId?: string;
  /** Embed host for the scene URL (defaults via getHost) */
  host?: string;
  /** API embed config — loader tint fallback when `brand.primary` is unset */
  apiConfig?: Partial<ThemeConfig>;
  /**
   * @deprecated Ignored — resolved server-side, and the loading state renders
   * none of these. Kept so existing TS callers compile.
   */
  appearance?: {
    hideBranding?: boolean;
    hideProgress?: boolean;
    hideGreeting?: boolean;
  };
}

function getLoadingColors(options?: LoadingOptions): {
  bg: string;
  panel: string;
  panelBorder: string;
  primary: string;
} {
  const theme = resolveTheme(options?.theme);
  const isDark = theme === "dark";
  const brandColors = isDark ? options?.brand?.dark : options?.brand?.light;
  const bg = brandColors?.bg;

  // Tint precedence (same as the float launcher): brand → API config → default.
  // `||`, not `??`, so empty strings fall through to the next source.
  const api = options?.apiConfig;
  const primary =
    brandColors?.primary ||
    (isDark ? api?.darkPrimaryColor : api?.primaryColor) ||
    (isDark ? DEFAULT_THEME.darkPrimaryColor : DEFAULT_THEME.primaryColor);

  // Panel palette follows the bg's luminance, so a dark brand.bg under a
  // light theme still gets a readable card. Non-hex bg → theme default.
  const fg = bg ? readableTextColor(bg) : undefined;
  const useDarkPalette = fg ? fg === "#ffffff" : isDark;
  const defaults = useDarkPalette ? DEFAULT_COLORS.dark : DEFAULT_COLORS.light;

  return {
    bg: bg || defaults.bg,
    panel: defaults.panel,
    panelBorder: defaults.panelBorder,
    primary,
  };
}
function buildSceneUrl(researchId: string, host: string): string {
  return `${host}/interview/${encodeURIComponent(researchId)}/scene-image`;
}

/**
 * Dedupes prefetch kick-offs. A mount still creates its own Image() — it
 * needs the load event — but a prior prefetch makes it resolve from the
 * browser cache, so nothing is fetched twice.
 *
 * Bounded so a long-lived SPA that surfaces many research ids can't grow it
 * without limit; evicting the oldest only lets a very old URL be re-prefetched,
 * which is harmless.
 */
const MAX_REMEMBERED_SCENE_URLS = 50;
const requestedSceneUrls = new Set<string>();
function rememberSceneUrl(url: string): void {
  requestedSceneUrls.add(url);
  if (requestedSceneUrls.size > MAX_REMEMBERED_SCENE_URLS) {
    const oldest = requestedSceneUrls.values().next().value;
    if (oldest !== undefined) requestedSceneUrls.delete(oldest);
  }
}

/**
 * Warm the scene image on intent signals (float-bubble hover, popup/slider
 * triggers) so it's cached when the embed opens. 404 is harmless. Returns
 * the URL, or null when skipped (no DOM/researchId, or already requested).
 */
export function prefetchSceneImage(
  researchId?: string,
  host?: string
): string | null {
  if (!hasDom() || !researchId) return null;
  const sceneUrl = buildSceneUrl(researchId, getHost(host));
  if (requestedSceneUrls.has(sceneUrl)) return null;
  rememberSceneUrl(sceneUrl);
  new Image().src = sceneUrl;
  return sceneUrl;
}

/**
 * Injected once — per-instance colors arrive as CSS custom properties on
 * each root, so one stylesheet serves every embed.
 */
let stylesInjected = false;
function injectStyles(): void {
  if (stylesInjected || !hasDom()) return;
  stylesInjected = true;

  const styleEl = document.createElement("style");
  styleEl.id = "perspective-loading-styles";
  // Queries target descendants — an element can't be styled by the container
  // it establishes. `container-type: size` (both axes) mirrors the app's
  // `[container-type:size]` scene so the card's width AND height breakpoints
  // match; the root has a definite size from its inset:0. Rounded float/popup
  // windows are clipped by the root's overflow:hidden.
  styleEl.textContent = `
    .perspective-loading {
      position: absolute;
      inset: 0;
      container-type: size;
      overflow: hidden;
      box-sizing: border-box;
      transition: opacity 0.15s ease;
      z-index: 1;
    }
    .perspective-loading__scene {
      position: absolute;
      inset: 0;
      background-position: center;
      background-size: cover;
      background-repeat: no-repeat;
      transform: scale(1.1);
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .perspective-loading__content {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: stretch;
      justify-content: center;
      box-sizing: border-box;
    }
    .perspective-loading__card {
      flex: 1 1 auto;
      width: 100%;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--pl-panel);
      -webkit-backdrop-filter: blur(22px) saturate(1.15);
      backdrop-filter: blur(22px) saturate(1.15);
    }
    /*
     * Conic arc + faint track; ::after is the round cap at the leading edge
     * (top). Plain conic-gradient first: browsers without color-mix() keep
     * it as an arc-only fallback. No reduced-motion override — a frozen
     * spinner reads as hung.
     */
    .perspective-loading__ring {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      position: relative;
      background-image: conic-gradient(from 0turn, transparent 12%, var(--pl-primary));
      background-image:
        conic-gradient(from 0turn, transparent 12%, var(--pl-primary)),
        linear-gradient(
          color-mix(in srgb, var(--pl-primary) 16%, transparent),
          color-mix(in srgb, var(--pl-primary) 16%, transparent)
        );
      -webkit-mask: radial-gradient(closest-side, transparent calc(100% - 4.5px), #000 calc(100% - 4px));
      mask: radial-gradient(closest-side, transparent calc(100% - 4.5px), #000 calc(100% - 4px));
      animation: perspective-spin 0.9s linear infinite;
    }
    .perspective-loading__ring::after {
      content: "";
      position: absolute;
      top: 0;
      left: 50%;
      width: 4.5px;
      height: 4.5px;
      margin-left: -2.25px;
      border-radius: 50%;
      background: var(--pl-primary);
    }
    @keyframes perspective-spin {
      to { transform: rotate(1turn); }
    }
    /*
     * Card layout, matched to the interview app so the card doesn't jump at
     * handoff. Boxed at the @2xl container width; vertical padding steps up at
     * the @hsm/@hlg container heights (app: px-1/py-1 base, py-12, py-20).
     * Horizontal padding stays 4px — the app's @3xl:px-12 is a no-op for card
     * geometry (it only applies once the card is already capped and centered).
     */
    @container (min-width: ${CARD_WIDTH_BP_PX}px) {
      .perspective-loading__content {
        padding: 4px;
      }
      .perspective-loading__card {
        max-width: ${CARD_WIDTH_BP_PX}px;
        border: 1px solid var(--pl-panel-border);
        border-radius: 16px;
      }
    }
    @container (min-width: ${CARD_WIDTH_BP_PX}px) and (min-height: ${CARD_H_BP_MID_PX}px) {
      .perspective-loading__content {
        padding: 48px 4px;
      }
    }
    @container (min-width: ${CARD_WIDTH_BP_PX}px) and (min-height: ${CARD_H_BP_LG_PX}px) {
      .perspective-loading__content {
        padding: 80px 4px;
      }
    }
  `;
  document.head.appendChild(styleEl);
}

export function createLoadingIndicator(options?: LoadingOptions): HTMLElement {
  // SSR safety - return empty div on server
  if (!hasDom()) {
    return { remove: () => {}, style: {} } as unknown as HTMLElement;
  }

  injectStyles();

  const colors = getLoadingColors(options);

  // Paints the bg instantly; callers may override borderRadius (float/popup).
  const container = document.createElement("div");
  container.className = "perspective-loading";
  container.style.background = colors.bg;
  container.style.setProperty("--pl-panel", colors.panel);
  container.style.setProperty("--pl-panel-border", colors.panelBorder);
  container.style.setProperty("--pl-primary", colors.primary);

  // Scene applies only after load — a missing scene (404), slow network, or
  // blocked request leaves the solid bg, never a broken paint.
  const scene = document.createElement("div");
  scene.className = "perspective-loading__scene";
  if (options?.researchId) {
    // getHost normalizes to an origin, matching prefetchSceneImage's dedupe key.
    const sceneUrl = buildSceneUrl(options.researchId, getHost(options.host));
    rememberSceneUrl(sceneUrl);
    scene.dataset.sceneUrl = sceneUrl;
    const img = new Image();
    img.onload = () => {
      scene.style.backgroundImage = `url("${sceneUrl}")`;
      scene.style.opacity = "1";
    };
    img.src = sceneUrl;
  }
  container.appendChild(scene);

  // Card: centered box on wide slots, full-bleed on compact (@container rule).
  const content = document.createElement("div");
  content.className = "perspective-loading__content";
  const card = document.createElement("div");
  card.className = "perspective-loading__card";
  const ring = document.createElement("div");
  ring.className = "perspective-loading__ring";
  card.appendChild(ring);
  content.appendChild(card);
  container.appendChild(content);

  return container;
}
