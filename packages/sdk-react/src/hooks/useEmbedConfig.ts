import { useState, useEffect } from "react";
import { fetchEmbedConfig, type ThemeConfig } from "@perspective-ai/sdk";

/**
 * Fetch embed config (theme, appearance, launcher) from the API.
 * Returns undefined while loading, then the resolved config.
 * Results are cached and deduplicated across hooks sharing a researchId.
 */
export function useEmbedConfig(
  researchId: string,
  host?: string
): ThemeConfig | undefined {
  const [config, setConfig] = useState<ThemeConfig | undefined>();

  useEffect(() => {
    let cancelled = false;
    fetchEmbedConfig(researchId, host).then((result) => {
      if (!cancelled) setConfig(result);
    });
    return () => {
      cancelled = true;
    };
  }, [researchId, host]);

  return config;
}
