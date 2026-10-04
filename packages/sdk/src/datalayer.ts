/**
 * Google Tag Manager / gtag dataLayer bridge.
 *
 * Pushes a flat object onto an existing array (default `window.dataLayer`).
 * The array is created only when analytics are explicitly enabled via
 * `configure({ dataLayer: true })` — a missing `window.dataLayer` stays missing
 * so pages that don't use Tag Manager are left alone.
 */

import { getConfig, hasDom } from "./config";

declare global {
  interface Window {
    /** Present when Google Tag Manager or gtag.js has initialized. */
    dataLayer?: unknown[];
  }
}

export const DATA_LAYER_EVENTS = {
  open: "perspective_widget_open",
  ready: "perspective_widget_ready",
  conversationStarted: "perspective_conversation_started",
  conversationCompleted: "perspective_conversation_completed",
  close: "perspective_widget_close",
} as const;

export type PerspectiveDataLayerEvent =
  (typeof DATA_LAYER_EVENTS)[keyof typeof DATA_LAYER_EVENTS];

const DEFAULT_DATA_LAYER_NAME = "dataLayer";

/** Suppresses a second close for the same embed until it opens again. */
const closedKeys = new Set<string>();

function embedKey(embedType: string, researchId: string): string {
  return `${embedType}\0${researchId}`;
}

function normalizeEmbedType(embedType: string | undefined): string {
  if (!embedType || embedType === "chat")
    return embedType === "chat" ? "float" : "widget";
  return embedType;
}

/**
 * Push one lifecycle event. `perEmbed` is the embed's own opt-out
 * (`data-perspective-datalayer="false"` / `EmbedConfig.dataLayer: false`);
 * `false` skips the push. Global `configure({ dataLayer: false })` skips every
 * embed.
 */
export function trackEmbedEvent(
  event: PerspectiveDataLayerEvent,
  researchId: string,
  embedType?: string,
  perEmbed?: boolean
): void {
  if (perEmbed === false) return;
  if (!hasDom()) return;

  const config = getConfig();
  if (config.dataLayer === false) return;

  const type = normalizeEmbedType(embedType);
  const key = embedKey(type, researchId);

  if (event === DATA_LAYER_EVENTS.open) {
    closedKeys.delete(key);
  } else if (event === DATA_LAYER_EVENTS.close && closedKeys.has(key)) {
    return;
  }

  const name = config.dataLayerName || DEFAULT_DATA_LAYER_NAME;
  const host = window as unknown as Record<string, unknown>;
  let layer = host[name];

  if (!Array.isArray(layer)) {
    // Never clobber a non-array (for example a custom push wrapper) and never
    // create `window.dataLayer` unless the host opted in.
    if (config.dataLayer !== true || layer != null) return;
    layer = [];
    host[name] = layer;
  }

  if (event === DATA_LAYER_EVENTS.close) {
    closedKeys.add(key);
  }

  (layer as Record<string, unknown>[]).push({
    event,
    perspective_research_id: researchId,
    perspective_embed_type: type,
  });
}

/** Drop close-dedupe state. Called when every embed is torn down. */
export function resetDataLayerState(): void {
  closedKeys.clear();
}
