/**
 * Shared constants for Perspective Embed SDK
 * This file is SSR-safe - no DOM access at import time
 * Used by both SDK bundle and the main Perspective app
 */

// ============================================================================
// SDK Version & Features
// ============================================================================

/** SDK version for handshake protocol — replaced at build time by tsup define */
declare const PKG_VERSION: string;
export const SDK_VERSION = PKG_VERSION;

/** Feature flags as bitset for version negotiation */
export const FEATURES = {
  RESIZE: 1 << 0, // 0b0001
  THEME_SYNC: 1 << 1, // 0b0010
  ANON_ID: 1 << 2, // 0b0100
  SCROLLBAR_STYLES: 1 << 3, // 0b1000
  EMBED_AUTH: 1 << 4, // 0b10000
} as const;

/** Current SDK feature set */
export const CURRENT_FEATURES =
  FEATURES.RESIZE |
  FEATURES.THEME_SYNC |
  FEATURES.ANON_ID |
  FEATURES.SCROLLBAR_STYLES |
  FEATURES.EMBED_AUTH;

// ============================================================================
// URL Parameter Keys
// ============================================================================

// Embed parameters
export const PARAM_KEYS = {
  embed: "embed",
  embedType: "embed_type",
  theme: "theme",
} as const;

export type ParamKey = (typeof PARAM_KEYS)[keyof typeof PARAM_KEYS];

// ============================================================================
// Brand Color Keys
// ============================================================================

export const BRAND_KEYS = {
  // Light mode
  primary: "brand.primary",
  secondary: "brand.secondary",
  bg: "brand.bg",
  text: "brand.text",

  // Dark mode
  darkPrimary: "brand.dark.primary",
  darkSecondary: "brand.dark.secondary",
  darkBg: "brand.dark.bg",
  darkText: "brand.dark.text",
} as const;

export type BrandKey = (typeof BRAND_KEYS)[keyof typeof BRAND_KEYS];

// ============================================================================
// Reserved Parameters (cannot be overridden via custom params or parent URL)
// ============================================================================

export const RESERVED_PARAMS: Set<string> = new Set([
  ...Object.values(PARAM_KEYS),
  ...Object.values(BRAND_KEYS),
]);

// ============================================================================
// Data Attributes (HTML declarative initialization)
// ============================================================================

export const DATA_ATTRS = {
  widget: "data-perspective-widget",
  popup: "data-perspective-popup",
  slider: "data-perspective-slider",
  float: "data-perspective-float", // Primary name
  chat: "data-perspective-chat", // Legacy alias
  fullpage: "data-perspective-fullpage",
  params: "data-perspective-params",
  brand: "data-perspective-brand",
  brandDark: "data-perspective-brand-dark",
  theme: "data-perspective-theme",
  noStyle: "data-perspective-no-style",
  autoOpen: "data-perspective-auto-open",
  showOnce: "data-perspective-show-once",
} as const;

export type DataAttr = (typeof DATA_ATTRS)[keyof typeof DATA_ATTRS];

// ============================================================================
// PostMessage Event Types
// ============================================================================

export const MESSAGE_TYPES = {
  // SDK -> Iframe (initialization)
  init: "perspective:init",

  // Iframe -> SDK
  ready: "perspective:ready",
  resize: "perspective:resize",
  submit: "perspective:submit",
  close: "perspective:close",
  error: "perspective:error",
  redirect: "perspective:redirect",

  // SDK -> Iframe (internal)
  anonId: "perspective:anon-id",
  injectStyles: "perspective:inject-styles",
  themeChange: "perspective:theme-change",

  // Iframe -> SDK (auth)
  authRequest: "perspective:auth-request",
  authSignout: "perspective:auth-signout",

  // SDK -> Iframe (auth)
  authComplete: "perspective:auth-complete",
  authCancelled: "perspective:auth-cancelled",

  // Popup -> SDK (auth callback from popup/tab opened by SDK)
  popupAuthComplete: "perspective:popup-auth-complete",

  // Iframe -> SDK (internal)
  requestScrollbarStyles: "perspective:request-scrollbar-styles",
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

// ============================================================================
// Error Codes
// ============================================================================

export const ERROR_CODES = {
  SDK_OUTDATED: "SDK_OUTDATED",
  INVALID_RESEARCH: "INVALID_RESEARCH",
  UNKNOWN: "UNKNOWN",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ============================================================================
// Param Values (for boolean-like string params)
// ============================================================================

export const PARAM_VALUES = {
  true: "true",
  false: "false",
} as const;

// ============================================================================
// Theme Values
// ============================================================================

export const THEME_VALUES = {
  dark: "dark",
  light: "light",
  system: "system",
} as const;

export type ThemeValue = (typeof THEME_VALUES)[keyof typeof THEME_VALUES];

// ============================================================================
// Interview Mode Values (for mode param)
// ============================================================================

export const MODE_VALUES = {
  preview: "preview",
  restart: "restart",
  normal: "normal",
  simulated: "simulated",
} as const;

export type ModeValue = (typeof MODE_VALUES)[keyof typeof MODE_VALUES];

// ============================================================================
// localStorage Keys
// ============================================================================

export const STORAGE_KEYS = {
  anonId: "perspective-anon-id",
  triggerShown: "perspective-trigger-shown",
  embedAuthToken: "perspective-embed-auth-token",
  embedState: "perspective-embed-state",
} as const;
