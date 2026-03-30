/**
 * Loading skeleton for embed iframes
 *
 * Shows a skeleton that matches the conversation UI layout (welcome card +
 * input area) instead of a generic spinner. This makes the loading feel
 * faster because it sets visual expectations.
 *
 * SSR-safe - returns no-op on server
 */

import type { BrandColors, ThemeValue } from "./types";
import { hasDom } from "./config";
import { resolveTheme } from "./utils";

/** Default colors matching codebase theme */
const DEFAULT_COLORS = {
  light: {
    bg: "#ffffff",
    shimmer: "#f3f4f6",
    shimmerHighlight: "#e5e7eb",
    border: "#f0f0f0",
  },
  dark: {
    bg: "#02040a",
    shimmer: "#1a1d23",
    shimmerHighlight: "#2a2d33",
    border: "#1a1d23",
  },
};

export interface LoadingOptions {
  /** Theme override: 'dark', 'light', or 'system' (uses system preference) */
  theme?: ThemeValue;
  /** Brand colors - uses primary color for spinner */
  brand?: {
    light?: BrandColors;
    dark?: BrandColors;
  };
}

/** Get colors for loading skeleton based on theme and brand */
function getLoadingColors(options?: LoadingOptions): {
  bg: string;
  shimmer: string;
  shimmerHighlight: string;
  border: string;
} {
  const theme = resolveTheme(options?.theme);
  const isDark = theme === "dark";

  const brandColors = isDark ? options?.brand?.dark : options?.brand?.light;
  const defaults = isDark ? DEFAULT_COLORS.dark : DEFAULT_COLORS.light;

  return {
    bg: brandColors?.bg || defaults.bg,
    shimmer: defaults.shimmer,
    shimmerHighlight: defaults.shimmerHighlight,
    border: defaults.border,
  };
}

/** Inject shimmer keyframes once globally (shared across all embed instances) */
let shimmerInjected = false;
function injectShimmerKeyframes(): void {
  if (shimmerInjected || !hasDom()) return;
  shimmerInjected = true;

  const styleEl = document.createElement("style");
  styleEl.id = "perspective-shimmer-keyframes";
  styleEl.textContent = `
    @keyframes perspective-shimmer {
      0% { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
  `;
  document.head.appendChild(styleEl);
}

export function createLoadingIndicator(options?: LoadingOptions): HTMLElement {
  // SSR safety - return empty div on server
  if (!hasDom()) {
    return { remove: () => {}, style: {} } as unknown as HTMLElement;
  }

  injectShimmerKeyframes();

  const colors = getLoadingColors(options);

  const container = document.createElement("div");
  container.className = "perspective-loading";
  container.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    background: ${colors.bg};
    transition: opacity 0.15s ease;
    z-index: 1;
    overflow: hidden;
    padding: 1.5rem;
    box-sizing: border-box;
  `;

  const shimmerBg = `linear-gradient(90deg, ${colors.shimmer} 25%, ${colors.shimmerHighlight} 50%, ${colors.shimmer} 75%)`;
  const shimmer = (width: string, height: string): HTMLElement => {
    const el = document.createElement("div");
    el.style.cssText = `background:${shimmerBg};background-size:800px 100%;animation:perspective-shimmer 1.5s infinite linear;border-radius:8px;height:${height};width:${width};margin-bottom:0.5rem;`;
    return el;
  };

  // Welcome card skeleton — matches the greeting card with rounded corners
  const card = document.createElement("div");
  card.style.cssText = `border:1px solid ${colors.border};border-radius:16px;padding:1.25rem;margin-bottom:auto;`;

  // Title line (bold, wider)
  const title = shimmer("55%", "1.25rem");
  title.style.marginBottom = "0.875rem";
  card.appendChild(title);

  // Body lines (3 lines mimicking welcome message text)
  card.appendChild(shimmer("92%", "0.75rem"));
  card.appendChild(shimmer("88%", "0.75rem"));
  const lastLine = shimmer("70%", "0.75rem");
  lastLine.style.marginBottom = "0";
  card.appendChild(lastLine);

  container.appendChild(card);

  // Chat input skeleton — matches rounded-[28px] input with pill button
  const inputArea = document.createElement("div");
  inputArea.style.cssText = `
    margin-top: 1rem;
    border: 1px solid ${colors.border};
    border-radius: 28px;
    height: 3rem;
    padding: 0.375rem 0.375rem 0.375rem 1rem;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    box-sizing: border-box;
  `;

  // Talk button pill skeleton
  const buttonSkeleton = shimmer("4.5rem", "2.25rem");
  buttonSkeleton.style.borderRadius = "9999px";
  buttonSkeleton.style.marginBottom = "0";
  inputArea.appendChild(buttonSkeleton);

  container.appendChild(inputArea);

  return container;
}
