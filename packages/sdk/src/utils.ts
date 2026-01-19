/**
 * Shared utilities for the Perspective Embed SDK
 * SSR-safe - DOM access is guarded
 */

import { THEME_VALUES, type ThemeValue } from "./constants";
import { hasDom } from "./config";

/**
 * Join class names, filtering out falsy values
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes
    .map((c) => (c || "").split(" "))
    .flat()
    .filter(Boolean)
    .join(" ");
}

/**
 * Get the perspective theme class based on the theme value
 * Returns "perspective-{theme}-theme" when theme is available, undefined otherwise
 */
export function getThemeClass(theme: string | undefined): string | undefined {
  return theme && theme !== THEME_VALUES.system
    ? `perspective-${theme}-theme`
    : undefined;
}

/**
 * Resolve whether dark mode should be used.
 * Priority: 1) explicit theme override, 2) system preference
 * SSR-safe: defaults to light theme on server
 */
export function resolveIsDark(theme?: ThemeValue | string): boolean {
  if (theme === THEME_VALUES.dark) return true;
  if (theme === THEME_VALUES.light) return false;
  // system or undefined → use system preference (or light on server)
  if (!hasDom()) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Resolve effective theme based on override and system preference
 * Returns the theme string ('light' or 'dark')
 */
export function resolveTheme(themeOverride?: ThemeValue): "light" | "dark" {
  return resolveIsDark(themeOverride) ? "dark" : "light";
}

/**
 * Normalize and validate hex color. Returns undefined for invalid colors.
 */
export function normalizeHex(color: string): string | undefined {
  const trimmed = color.trim();
  if (!trimmed) return undefined;

  const normalized = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;

  // Validate hex format (#RGB, #RRGGBB, or #RRGGBBAA)
  if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(normalized)) {
    return normalized;
  }

  // Try to extract valid hex chars
  const hexChars = normalized.slice(1).replace(/[^0-9a-fA-F]/g, "");
  if (hexChars.length >= 6) return `#${hexChars.slice(0, 6)}`;
  if (hexChars.length >= 3) return `#${hexChars.slice(0, 3)}`;

  return undefined;
}

/**
 * Convert hex to rgba for spinner track
 */
export function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result || !result[1] || !result[2] || !result[3]) {
    return `rgba(118, 41, 200, ${alpha})`;
  }

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
