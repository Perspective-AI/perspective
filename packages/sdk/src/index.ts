/**
 * Perspective Embed SDK
 *
 * NPM Entry Point - clean exports, no auto-init, SSR-safe
 *
 * Usage:
 *   import { createWidget, openPopup, openSlider, createFloatBubble } from '@perspective-ai/embed';
 *
 *   // Inline widget
 *   const widget = createWidget(container, { researchId: 'xxx' });
 *
 *   // Popup modal
 *   const popup = openPopup({ researchId: 'xxx' });
 *
 *   // Slider panel
 *   const slider = openSlider({ researchId: 'xxx' });
 *
 *   // Floating bubble
 *   const bubble = createFloatBubble({ researchId: 'xxx' });
 *
 * For SSR-safe constants and types:
 *   import { DATA_ATTRS, MESSAGE_TYPES } from '@perspective-ai/embed/constants';
 */

// Core embed functions
export { createWidget } from "./widget";
export { openPopup } from "./popup";
export { openSlider } from "./slider";
export { createFloatBubble, createChatBubble } from "./float";
export { createFullpage } from "./fullpage";

// Auto-open helpers
export { setupAutoOpenPopup } from "./auto-open";

// Auto-open triggers
export {
  setupTrigger,
  parseTriggerAttr,
  parseShowOnceAttr,
  shouldShow,
  markShown,
} from "./triggers";

// Configuration
export { getPersistedOpenState } from "./state";
export { configure, getConfig, getHost } from "./config";

// Preloading
export {
  preloadIframe,
  destroyPreloaded,
  destroyPreloadedByType,
} from "./preload";

// Types
export type {
  BrandColors,
  AIAssistantChannel,
  EmbedConfig,
  EmbedHandle,
  FloatHandle,
  ModalHandle,
  EmbedInstance,
  EmbedError,
  EmbedType,
  ThemeConfig,
  SDKConfig,
  TriggerType,
  TriggerConfig,
  ShowOnce,
  AutoOpenConfig,
} from "./types";

// Re-export commonly used constants and types
export {
  SDK_VERSION,
  FEATURES,
  CURRENT_FEATURES,
  DATA_ATTRS,
  PARAM_KEYS,
  BRAND_KEYS,
  MESSAGE_TYPES,
  THEME_VALUES,
} from "./constants";

export type { ThemeValue, ParamKey, BrandKey, MessageType } from "./constants";
