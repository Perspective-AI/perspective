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
  const [state, setState] = useState<
    { researchId: string; config: ThemeConfig } | undefined
  >();

  useEffect(() => {
    let cancelled = false;
    fetchEmbedConfig(researchId, host).then((result) => {
      if (!cancelled) setState({ researchId, config: result });
    });
    return () => {
      cancelled = true;
    };
  }, [researchId, host]);

  // Return undefined if config is for a different researchId (stale)
  return state?.researchId === researchId ? state.config : undefined;
}
