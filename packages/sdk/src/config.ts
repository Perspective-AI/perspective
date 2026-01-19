/**
 * Embed SDK configuration
 * SSR-safe - DOM access is guarded and lazy
 */

import type { SDKConfig } from "./types";

/** Default production host */
const DEFAULT_HOST = "https://getperspective.ai";

/** Global SDK configuration - can be set before creating embeds */
let globalConfig: SDKConfig = {};

/**
 * Configure the SDK globally
 * Call this before creating any embeds if you need to override defaults
 */
export function configure(config: SDKConfig): void {
  globalConfig = { ...globalConfig, ...config };
}

/**
 * Get the current SDK configuration
 */
export function getConfig(): SDKConfig {
  return { ...globalConfig };
}

/**
 * Check if DOM is available (SSR safety)
 */
export function hasDom(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function normalizeToOrigin(host: string): string {
  try {
    return new URL(host).origin;
  } catch {
    return host;
  }
}

export function getHost(instanceHost?: string): string {
  // Instance-level override
  if (instanceHost) {
    return normalizeToOrigin(instanceHost);
  }

  // Global config override
  if (globalConfig.host) {
    return normalizeToOrigin(globalConfig.host);
  }

  // Try to infer from script src (only in browser, only at load time)
  if (hasDom()) {
    const scriptHost = getScriptHost();
    if (scriptHost) {
      return scriptHost;
    }
  }

  return DEFAULT_HOST;
}

// Capture script src at load time - document.currentScript only available during initial execution
let capturedScriptHost: string | null = null;

function getScriptHost(): string | null {
  if (capturedScriptHost !== null) {
    return capturedScriptHost;
  }

  if (!hasDom()) {
    return null;
  }

  const currentScript = document.currentScript as HTMLScriptElement | null;
  if (currentScript?.src) {
    try {
      capturedScriptHost = new URL(currentScript.src).origin;
      return capturedScriptHost;
    } catch {
      // Invalid URL, ignore
    }
  }

  capturedScriptHost = ""; // Mark as attempted
  return null;
}

// Capture script host immediately when module loads (in browser)
if (hasDom()) {
  getScriptHost();
}
