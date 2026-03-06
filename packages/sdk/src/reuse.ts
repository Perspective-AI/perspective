import type { EmbedConfig } from "./types";
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

export function getReusableEmbedSignature(config: EmbedConfig): string {
  return stableSerialize({
    host: getHost(config.host),
    theme: config.theme ?? null,
    params: config.params ?? null,
    brand: config.brand ?? null,
    parentSearch: hasDom() ? window.location.search : "",
  });
}
