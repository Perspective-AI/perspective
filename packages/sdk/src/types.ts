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

export type AIAssistantChannel = "TEXT" | "VOICE";

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
  /**
   * Enabled channels for the interview.
   * `TEXT` uses text-only UX, `VOICE` uses voice UX.
   * Pass both values in an array to indicate both channels are enabled.
   */
  channel?: AIAssistantChannel | AIAssistantChannel[] | null;
  /** Welcome message shown as a teaser bubble next to the float button. Only used for float-type embeds. */
  welcomeMessage?: string;
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
  /** When true, prevents the user from closing the popup/slider (hides close button, disables overlay click and ESC key) */
  disableClose?: boolean;
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
  /** Callback when embed auth completes (token available for custom storage) */
  onAuth?: (data: { researchId: string; token: string }) => void;
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
  /**
   * Tear down DOM and listeners without changing persisted open/closed state.
   * Use this for framework cleanup or route remounts.
   */
  unmount: () => void;
  update: (
    options: Partial<
      Pick<
        EmbedConfig,
        | "onReady"
        | "onSubmit"
        | "onNavigate"
        | "onClose"
        | "onError"
        | "onAuth"
        | "channel"
        | "welcomeMessage"
      >
    >
  ) => void;
  /**
   * Explicitly close the embed and persist a "closed" state for restorable
   * embeds such as popup and slider.
   */
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
  /** Whether the SDK rendered a close button over the iframe. Older SDKs (pre-1.4) don't send this field — fall back to embed-type-based logic when undefined. */
  hasCloseButton?: boolean;
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
  | { type: "perspective:redirect"; researchId: string; url: string }
  | {
      type: "perspective:auth-request";
      researchId: string;
      provider: string;
      authUrl: string;
    }
  | { type: "perspective:auth-signout"; researchId: string }
  | {
      type: "perspective:auth-complete";
      researchId: string;
      token: string;
    };

/** Theme configuration from API */
export interface ThemeConfig {
  primaryColor: string;
  textColor: string;
  darkPrimaryColor: string;
  darkTextColor: string;
  allowedChannels?: AIAssistantChannel[] | null;
  channel?: AIAssistantChannel | AIAssistantChannel[] | null;
  welcomeMessage?: string;
}

/** SDK global configuration */
export interface SDKConfig {
  /** Override the default host */
  host?: string;
}
