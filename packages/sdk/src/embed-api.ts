/**
 * Embed config API — fetch theme/appearance/launcher config from the API
 * Shared between CDN (browser.ts) and NPM (React hooks) entry points
 */

import type { ThemeConfig } from "./types";
import { getHost } from "./config";

export type EmbedApiConfig = ThemeConfig;

export const DEFAULT_THEME: ThemeConfig = {
  primaryColor: "#7c3aed",
  textColor: "#ffffff",
  darkPrimaryColor: "#a78bfa",
  darkTextColor: "#ffffff",
};

/** Timeout before falling back to defaults (ms) */
const CONFIG_TIMEOUT_MS = 3000;

const configCache: Map<string, EmbedApiConfig> = new Map();
const configInflight: Map<string, Promise<EmbedApiConfig>> = new Map();

function cacheKey(researchId: string, host?: string): string {
  return `${getHost(host)}::${researchId}`;
}

/**
 * Fetch embed config from API (cached, deduplicates in-flight requests).
 * Falls back to DEFAULT_THEME on timeout, network error, or non-200 response.
 */
export async function fetchEmbedConfig(
  researchId: string,
  host?: string
): Promise<EmbedApiConfig> {
  const key = cacheKey(researchId, host);

  if (configCache.has(key)) {
    return configCache.get(key)!;
  }

  if (configInflight.has(key)) {
    return configInflight.get(key)!;
  }

  const promise = (async () => {
    try {
      const resolvedHost = getHost(host);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CONFIG_TIMEOUT_MS);
      const res = await fetch(
        `${resolvedHost}/api/v1/embed/config/${researchId}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      if (!res.ok) return DEFAULT_THEME;
      const config = (await res.json()) as EmbedApiConfig;
      configCache.set(key, config);
      return config;
    } catch {
      return DEFAULT_THEME;
    } finally {
      configInflight.delete(key);
    }
  })();

  configInflight.set(key, promise);
  return promise;
}
