import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
type ThemeInput = "light" | "dark" | "system";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeToSystemTheme(onChange: () => void): () => void {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const subscribeNoop = () => () => {};
const getSystemPrefersDark = () => window.matchMedia(DARK_QUERY).matches;
// The server and hydration render always see light, so markup matches.
const getServerPrefersDark = () => false;

/**
 * Hook to resolve theme based on override and system preference.
 * Listens for system preference changes when theme is "system".
 */
export function useThemeSync(theme: ThemeInput = "system"): Theme {
  const followSystem = theme === "system";
  const prefersDark = useSyncExternalStore(
    followSystem ? subscribeToSystemTheme : subscribeNoop,
    followSystem ? getSystemPrefersDark : getServerPrefersDark,
    getServerPrefersDark
  );

  if (!followSystem) return theme;
  return prefersDark ? "dark" : "light";
}
