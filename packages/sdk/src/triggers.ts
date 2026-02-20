/**
 * Auto-open trigger system for popup embeds.
 *
 * Supports:
 * - Timeout: Open after a delay (ms)
 * - Exit intent: Open when user moves cursor above viewport
 *
 * Show-once dedup:
 * - "session" -> sessionStorage
 * - "visitor" -> localStorage
 * - false -> always show
 */

import { STORAGE_KEYS } from "./constants";
import type { TriggerConfig, ShowOnce } from "./types";

/**
 * Parse a trigger attribute value into a TriggerConfig.
 *
 * Formats:
 * - "timeout:5000" -> { type: "timeout", delay: 5000 }
 * - "exit-intent"  -> { type: "exit-intent" }
 */
export function parseTriggerAttr(value: string): TriggerConfig {
  const trimmed = value.trim();

  if (trimmed.startsWith("timeout:")) {
    const delay = parseInt(trimmed.slice("timeout:".length), 10);
    if (isNaN(delay) || delay < 0) {
      throw new Error(`Invalid timeout delay: "${value}"`);
    }
    return { type: "timeout", delay };
  }

  if (trimmed === "timeout") {
    return { type: "timeout", delay: 5000 };
  }

  if (trimmed === "exit-intent") {
    return { type: "exit-intent" };
  }

  throw new Error(
    `Unknown trigger type: "${value}". Expected "timeout:<ms>" or "exit-intent".`
  );
}

/**
 * Set up a trigger that calls `callback` when fired.
 * Returns a cleanup function to teardown the trigger.
 */
export function setupTrigger(
  config: TriggerConfig,
  callback: () => void
): () => void {
  if (config.type === "timeout") {
    const timer = setTimeout(callback, config.delay);
    return () => clearTimeout(timer);
  }

  if (config.type === "exit-intent") {
    const handler = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        callback();
        document.removeEventListener("mouseleave", handler);
      }
    };
    document.addEventListener("mouseleave", handler);
    return () => document.removeEventListener("mouseleave", handler);
  }

  // Exhaustive check
  const _exhaustive: never = config;
  throw new Error(
    `Unknown trigger type: ${(_exhaustive as TriggerConfig).type}`
  );
}

function storageKey(researchId: string): string {
  return `${STORAGE_KEYS.triggerShown}:${researchId}`;
}

/**
 * Parse a show-once attribute value into a ShowOnce.
 *
 * Formats:
 * - "session"  -> "session"
 * - "visitor"  -> "visitor"
 * - "false"    -> false
 * - anything else -> defaults to "session"
 */
export function parseShowOnceAttr(value: string | null): ShowOnce {
  if (!value) return "session";
  const trimmed = value.trim();
  if (trimmed === "visitor") return "visitor";
  if (trimmed === "false") return false;
  return "session";
}

/**
 * Check if the popup should be shown based on show-once dedup.
 */
export function shouldShow(researchId: string, showOnce: ShowOnce): boolean {
  if (showOnce === false) return true;

  try {
    const storage = showOnce === "visitor" ? localStorage : sessionStorage;
    return storage.getItem(storageKey(researchId)) === null;
  } catch {
    // Storage unavailable (private browsing, etc.) — show anyway
    return true;
  }
}

/**
 * Mark the popup as shown for dedup purposes.
 */
export function markShown(researchId: string, showOnce: ShowOnce): void {
  if (showOnce === false) return;

  try {
    const storage = showOnce === "visitor" ? localStorage : sessionStorage;
    storage.setItem(storageKey(researchId), "1");
  } catch {
    // Storage unavailable — ignore
  }
}
