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

/** Default background + semi-transparent shimmer that works on any bg */
const DEFAULT_COLORS = {
  light: {
    bg: "#ffffff",
    shimmer: "rgba(0, 0, 0, 0.06)",
    shimmerHighlight: "rgba(0, 0, 0, 0.10)",
    border: "rgba(0, 0, 0, 0.08)",
  },
  dark: {
    bg: "#02040a",
    shimmer: "rgba(255, 255, 255, 0.08)",
    shimmerHighlight: "rgba(255, 255, 255, 0.13)",
    border: "rgba(255, 255, 255, 0.08)",
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
  /** Appearance overrides from API config */
  appearance?: {
    hideBranding?: boolean;
    hideProgress?: boolean;
    hideGreeting?: boolean;
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
  const appearance = options?.appearance;

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

  // -- Header: logo placeholder + progress bar --
  if (!appearance?.hideBranding || !appearance?.hideProgress) {
    const header = document.createElement("div");
    header.style.cssText = `display:flex;flex-direction:column;align-items:center;gap:0.5rem;margin-bottom:1rem;`;
    if (!appearance?.hideBranding) {
      const logo = shimmer("7rem", "1.25rem");
      logo.style.margin = "0 auto";
      header.appendChild(logo);
    }
    if (!appearance?.hideProgress) {
      const progressBar = shimmer("100%", "0.25rem");
      progressBar.style.borderRadius = "9999px";
      header.appendChild(progressBar);
    }
    container.appendChild(header);
  }

  // -- Welcome card: avatar + name, title, body lines --
  if (!appearance?.hideGreeting) {
    const card = document.createElement("div");
    card.style.cssText = `border:1px solid ${colors.border};border-radius:16px;padding:1.25rem;margin-bottom:1.25rem;`;

    // Avatar row: circle + name
    const avatarRow = document.createElement("div");
    avatarRow.style.cssText = `display:flex;align-items:center;gap:0.625rem;margin-bottom:0.875rem;`;
    const avatar = shimmer("2.25rem", "2.25rem");
    avatar.style.borderRadius = "50%";
    avatar.style.flexShrink = "0";
    avatar.style.marginBottom = "0";
    const name = shimmer("6rem", "0.875rem");
    name.style.marginBottom = "0";
    avatarRow.appendChild(avatar);
    avatarRow.appendChild(name);
    card.appendChild(avatarRow);

    // Title line
    const title = shimmer("60%", "1.125rem");
    title.style.marginBottom = "0.875rem";
    card.appendChild(title);

    // Body lines (3 lines — welcome message paragraph)
    card.appendChild(shimmer("95%", "0.75rem"));
    card.appendChild(shimmer("90%", "0.75rem"));
    const lastBodyLine = shimmer("75%", "0.75rem");
    lastBodyLine.style.marginBottom = "0";
    card.appendChild(lastBodyLine);

    container.appendChild(card);
  }

  // -- Chat message: greeting text + small icon --
  const message = document.createElement("div");
  message.style.cssText = `padding:0 0.25rem;margin-bottom:auto;`;
  message.appendChild(shimmer("92%", "0.75rem"));
  const msgLine2 = shimmer("50%", "0.75rem");
  msgLine2.style.marginBottom = "0.75rem";
  message.appendChild(msgLine2);
  const icon = shimmer("1.5rem", "1.5rem");
  icon.style.marginBottom = "0";
  message.appendChild(icon);
  container.appendChild(message);

  // -- Input area: reply field + talk button pill --
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
  const buttonPill = shimmer("4.5rem", "2.25rem");
  buttonPill.style.borderRadius = "9999px";
  buttonPill.style.marginBottom = "0";
  inputArea.appendChild(buttonPill);
  container.appendChild(inputArea);

  // -- Footer: centered hint text --
  // const footer = shimmer("14rem", "0.75rem");
  // footer.style.margin = "0.75rem auto 0";
  // container.appendChild(footer);

  return container;
}
