"use client";
import { useState, useEffect } from "react";

type Theme = "light" | "dark";
type ThemeInput = "light" | "dark" | "system";

/**
 * Hook to resolve theme based on override and system preference.
 * Listens for system preference changes when theme is "system".
 */
export function useThemeSync(theme: ThemeInput = "system"): Theme {
  // Always start with a deterministic value for SSR hydration safety.
  // The actual system preference is synced in useEffect.
  const [resolved, setResolved] = useState<Theme>(
    theme !== "system" ? theme : "light"
  );

  useEffect(() => {
    if (theme !== "system") {
      setResolved(theme);
      return;
    }

    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    // Set initial value
    setResolved(mq.matches ? "dark" : "light");

    const handler = (e: MediaQueryListEvent) =>
      setResolved(e.matches ? "dark" : "light");

    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return resolved;
}
