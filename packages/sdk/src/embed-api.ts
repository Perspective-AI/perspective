/**
 * Embed config API — fetch theme/appearance/launcher config from the API
 * Shared between CDN (browser.ts) and NPM (React hooks) entry points
 */

import type { ThemeConfig } from "./types";
import { getHost } from "./config";

export type EmbedApiConfig = ThemeConfig & {
  allowedChannels?: ThemeConfig["allowedChannels"];
  welcomeMessage?: string;
};

export const DEFAULT_THEME: ThemeConfig = {
  primaryColor: "#7c3aed",
  textColor: "#ffffff",
  darkPrimaryColor: "#a78bfa",
  darkTextColor: "#ffffff",
};

const configCache: Map<string, EmbedApiConfig> = new Map();
const configInflight: Map<string, Promise<EmbedApiConfig>> = new Map();

/**
 * Fetch embed config from API (cached, deduplicates in-flight requests)
 */
export async function fetchEmbedConfig(
  researchId: string,
  host?: string
): Promise<EmbedApiConfig> {
  if (configCache.has(researchId)) {
    return configCache.get(researchId)!;
  }

  if (configInflight.has(researchId)) {
    return configInflight.get(researchId)!;
  }

  const promise = (async () => {
    try {
      const resolvedHost = getHost(host);
      const res = await fetch(
        `${resolvedHost}/api/v1/embed/config/${researchId}`
      );
      if (!res.ok) return DEFAULT_THEME;
      const config = (await res.json()) as EmbedApiConfig;
      configCache.set(researchId, config);
      return config;
    } catch {
      return DEFAULT_THEME;
    } finally {
      configInflight.delete(researchId);
    }
  })();

  configInflight.set(researchId, promise);
  return promise;
}
