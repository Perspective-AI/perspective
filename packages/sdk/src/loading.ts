/**
 * Loading indicator for embed iframes
 * SSR-safe - returns no-op on server
 */

import type { BrandColors, ThemeValue } from "./types";
import { hasDom } from "./config";
import { resolveTheme, hexToRgba } from "./utils";

/** Default colors matching codebase theme */
const DEFAULT_COLORS = {
  light: {
    bg: "#ffffff",
    primary: "#7629C8",
  },
  dark: {
    bg: "#02040a",
    primary: "#B170FF",
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

/** Get colors for loading indicator based on theme and brand */
function getLoadingColors(options?: LoadingOptions): {
  bg: string;
  primary: string;
} {
  const theme = resolveTheme(options?.theme);
  const isDark = theme === "dark";

  // Get brand colors for current theme
  const brandColors = isDark ? options?.brand?.dark : options?.brand?.light;

  return {
    bg:
      brandColors?.bg ||
      (isDark ? DEFAULT_COLORS.dark.bg : DEFAULT_COLORS.light.bg),
    primary:
      brandColors?.primary ||
      (isDark ? DEFAULT_COLORS.dark.primary : DEFAULT_COLORS.light.primary),
  };
}

export function createLoadingIndicator(options?: LoadingOptions): HTMLElement {
  // SSR safety - return empty div on server
  if (!hasDom()) {
    return { remove: () => {}, style: {} } as unknown as HTMLElement;
  }

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
    align-items: center;
    justify-content: center;
    background: ${colors.bg};
    transition: opacity 0.3s ease;
    z-index: 1;
  `;

  // Create spinner (keyframes defined in styles.ts)
  const spinner = document.createElement("div");
  spinner.style.cssText = `
    width: 2.5rem;
    height: 2.5rem;
    border: 3px solid ${hexToRgba(colors.primary, 0.15)};
    border-top-color: ${colors.primary};
    border-radius: 50%;
    animation: perspective-spin 0.8s linear infinite;
  `;

  container.appendChild(spinner);
  return container;
}
