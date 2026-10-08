/**
 * Google Tag Manager / gtag dataLayer bridge.
 *
 * Pushes a flat object onto an existing array (default `window.dataLayer`).
 * The array is created only when analytics are explicitly enabled via
 * `configure({ dataLayer: true })` — a missing `window.dataLayer` stays missing
 * so pages that don't use Tag Manager are left alone.
 */

import { getConfig, hasDom } from "./config";
import type { EmbedType } from "./types";

declare global {
  interface Window {
    /** Present when Google Tag Manager or gtag.js has initialized. */
    dataLayer?: unknown[];
  }
}

const DATA_LAYER_EVENTS = {
  open: "perspective_widget_open",
  ready: "perspective_widget_ready",
  conversationStarted: "perspective_conversation_started",
  conversationCompleted: "perspective_conversation_completed",
  close: "perspective_widget_close",
} as const;

const DEFAULT_DATA_LAYER_NAME = "dataLayer";

/**
 * Push one lifecycle event. `perEmbed` is the embed's own opt-out
 * (`data-perspective-datalayer="false"` / `EmbedConfig.dataLayer: false`);
 * `false` skips the push. Global `configure({ dataLayer: false })` skips every
 * embed.
 */
export function trackEmbedEvent(
  event: keyof typeof DATA_LAYER_EVENTS,
  researchId: string,
  embedType: EmbedType,
  perEmbed?: boolean
): void {
  if (perEmbed === false || !hasDom()) return;

  const config = getConfig();
  if (config.dataLayer === false) return;

  const name = config.dataLayerName || DEFAULT_DATA_LAYER_NAME;
  const host = window as unknown as Record<string, unknown>;
  let layer = host[name];

  if (!Array.isArray(layer)) {
    // Never clobber a non-array (for example a custom push wrapper) and never
    // create `window.dataLayer` unless the host opted in.
    if (config.dataLayer !== true || layer != null) return;
    layer = host[name] = [];
  }

  (layer as unknown[]).push({
    event: DATA_LAYER_EVENTS[event],
    perspective_research_id: researchId,
    perspective_embed_type: embedType,
  });
}
