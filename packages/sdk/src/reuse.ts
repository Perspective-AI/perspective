import type { BrandColors, EmbedConfig, ThemeValue } from "./types";
import { getHost, hasDom } from "./config";

function sortObjectKeys(value: unknown): unknown {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = (value as Record<string, unknown>)[key];
        return result;
      }, {});
  }

  return value;
}

function stableSerialize(value: unknown): string {
  return JSON.stringify(value, (_key, currentValue) =>
    sortObjectKeys(currentValue)
  );
}

export function getResolvedReusableEmbedSignature(options: {
  host: string;
  theme?: ThemeValue;
  params?: Record<string, string>;
  brand?: {
    light?: BrandColors;
    dark?: BrandColors;
  };
}): string {
  return stableSerialize({
    host: options.host,
    theme: options.theme ?? null,
    params: options.params ?? null,
    brand: options.brand ?? null,
    parentSearch: hasDom() ? window.location.search : "",
  });
}

export function getReusableEmbedSignature(config: EmbedConfig): string {
  return getResolvedReusableEmbedSignature({
    host: getHost(config.host),
    theme: config.theme,
    params: config.params,
    brand: config.brand,
  });
}
