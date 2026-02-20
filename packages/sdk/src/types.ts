/**
 * Type definitions for the Perspective Embed SDK
 * This file is TYPE-ONLY - no runtime value imports or exports
 * SSR-safe by design
 */

import type {
  ThemeValue,
  ParamKey,
  BrandKey,
  MessageType,
  ErrorCode,
} from "./constants";

// Re-export types only
export type { ThemeValue, ParamKey, BrandKey, MessageType, ErrorCode };

export type EmbedType =
  | "widget"
  | "popup"
  | "slider"
  | "float"
  | "fullpage"
  | "chat";

// ============================================================================
// Auto-open Trigger Types
// ============================================================================

export type TriggerConfig =
  | { type: "timeout"; delay: number }
  | { type: "exit-intent" };

export type TriggerType = TriggerConfig["type"];

export type ShowOnce = "session" | "visitor" | false;

export interface AutoOpenConfig {
  trigger: TriggerConfig;
  showOnce?: ShowOnce; // default: "session"
}

/** Brand colors that can be passed via embed code */
export interface BrandColors {
  /** Primary accent color (buttons, links, focus states) */
  primary?: string;
  /** Secondary accent color */
  secondary?: string;
  /** Background color of the embed */
  bg?: string;
  /** Primary text color */
  text?: string;
}

export interface EmbedConfig {
  researchId: string;
  type?: EmbedType;
  /** Custom button text for popup/slider triggers */
  buttonText?: string;
  /** Custom params to pass to the interview (for tracking/attribution) */
  params?: Record<string, string>;
  /** Brand colors to override Research settings */
  brand?: {
    light?: BrandColors;
    dark?: BrandColors;
  };
  /** Force theme mode: 'dark', 'light', or 'system' (default) */
  theme?: ThemeValue;
  /** Override the default host (defaults to https://getperspective.ai) */
  host?: string;
  /** Auto-open trigger configuration (popup only) */
  autoOpen?: AutoOpenConfig;
  /** Callback when embed is ready */
  onReady?: () => void;
  /** Callback when interview is submitted/completed */
  onSubmit?: (data: { researchId: string }) => void;
  /** Callback when embed wants to navigate. If provided, parent handles navigation; otherwise SDK navigates via window.location.href */
  onNavigate?: (url: string) => void;
  /** Callback when embed is closed */
  onClose?: () => void;
  /** Callback on any error */
  onError?: (error: EmbedError) => void;
}

/** Embed error with code for programmatic handling */
export interface EmbedError extends Error {
  code?: ErrorCode;
}

export interface EmbedInstance {
  researchId: string;
  type: EmbedType;
  iframe: HTMLIFrameElement;
  container: HTMLElement;
  destroy: () => void;
}

/** Handle returned by embed creation functions */
export interface EmbedHandle {
  unmount: () => void;
  update: (
    options: Partial<
      Pick<
        EmbedConfig,
        "onReady" | "onSubmit" | "onNavigate" | "onClose" | "onError"
      >
    >
  ) => void;
  /** @deprecated Use unmount() instead */
  destroy: () => void;
  /** @deprecated For legacy compatibility */
  readonly researchId: string;
  /** @deprecated For legacy compatibility */
  readonly type: EmbedType;
  /** @deprecated For legacy compatibility - may be null on server */
  readonly iframe: HTMLIFrameElement | null;
  /** @deprecated For legacy compatibility - may be null on server */
  readonly container: HTMLElement | null;
}

/** Handle for float bubble with open/close control (persistent UI element) */
export interface FloatHandle extends Omit<EmbedHandle, "type"> {
  open: () => void;
  close: () => void;
  toggle: () => void;
  readonly isOpen: boolean;
  readonly type: "float";
}

/** @deprecated Use FloatHandle for float bubble, EmbedHandle for popup/slider */
export type ModalHandle = FloatHandle;

/** Messages sent from SDK to iframe */
export interface InitMessage {
  type: "perspective:init";
  version: string;
  features: number;
  researchId: string;
}

/** Messages sent from iframe to SDK */
export type EmbedMessage =
  | { type: "perspective:ready"; researchId: string }
  | { type: "perspective:resize"; researchId: string; height: number }
  | { type: "perspective:submit"; researchId: string; data?: unknown }
  | { type: "perspective:close"; researchId: string }
  | {
      type: "perspective:error";
      researchId: string;
      error: string;
      code?: string;
    }
  | { type: "perspective:redirect"; researchId: string; url: string };

/** Theme configuration from API */
export interface ThemeConfig {
  primaryColor: string;
  textColor: string;
  darkPrimaryColor: string;
  darkTextColor: string;
}

/** SDK global configuration */
export interface SDKConfig {
  /** Override the default host */
  host?: string;
}
