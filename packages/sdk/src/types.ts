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
  /** Primary accent color — themes buttons, progress bar, links, mic, and focus rings */
  primary?: string;
  /** Interview background behind the card, shown only when no background scene is set */
  bg?: string;
  /**
   * @deprecated No longer supported — ignored by the interview app and not
   * forwarded by the SDK. Kept only to avoid breaking TypeScript consumers that
   * still reference it. Use `primary`/`bg`; this field is a no-op.
   */
  secondary?: string;
  /**
   * @deprecated No longer supported — ignored by the interview app and not
   * forwarded by the SDK. Kept only to avoid breaking TypeScript consumers that
   * still reference it. Use `primary`/`bg`; this field is a no-op.
   */
  text?: string;
}

// ============================================================================
// Launcher Customization Types
// ============================================================================

/** CSS properties for launcher styling */
export type LauncherStyle = {
  [K in keyof CSSStyleDeclaration as CSSStyleDeclaration[K] extends string
    ? K
    : never]?: string;
};

/** Icon configuration for the float launcher button */
export type LauncherIcon =
  | "default"
  | "avatar"
  | { url: string }
  | { svg: string };

/**
 * The inline widget's frame — the card-like container the SDK draws around the
 * interview. Every field is applied by setting the matching CSS custom property
 * on the widget wrapper, so each can equivalently be set via a stylesheet or
 * inline `style`. The framing fields (`maxWidth`, `radius`, `border`, `shadow`,
 * `background`) only take effect in card layout (a bare drop-in, or
 * `layout: "card"`); `minHeight` applies in both card and fill layouts.
 */
export interface FrameConfig {
  /**
   * Layout. Omit to auto-detect: a bare drop-in renders as a centered, framed
   * `"card"`; a container you've sized (height, flex, `height: 100%`, …) renders
   * as `"fill"` — edge to edge, no framing. `"fill"` forces the full-width
   * behaviour; `"card"` always frames.
   */
  layout?: "card" | "fill";
  /** Card max width, e.g. `"720px"` or `"none"`. → `--perspective-widget-max-width` (default `480px`). Card layout only. */
  maxWidth?: string;
  /** Min height, e.g. `"720px"`. → `--perspective-widget-min-height` (default `640px` card, `500px` fill). Applies in both layouts. */
  minHeight?: string;
  /** Card `border-radius`, e.g. `"4px"`. → `--perspective-widget-radius`. */
  radius?: string;
  /** Card `border` shorthand, e.g. `"1px solid #ddd"` or `"none"`. → `--perspective-widget-border`. */
  border?: string;
  /** Card `box-shadow`, e.g. `"none"`. → `--perspective-widget-shadow`. */
  shadow?: string;
  /** Card `background`, e.g. `"#fff"`. → `--perspective-widget-bg`. */
  background?: string;
}

/**
 * Controls the welcome teaser — the message bubble that appears above the
 * float button (with a chime sound and notification dot). Only used for
 * float-type embeds. The teaser text itself comes from `welcomeMessage`.
 */
export interface TeaserConfig {
  /** Master switch for the whole welcome sequence (teaser bubble, chime sound, and notification dot). Default: `true`. */
  enabled?: boolean;
  /** Milliseconds after mount before the teaser bubble appears. Default: `3000`. */
  delay?: number;
  /** Whether the chime sound plays. It fires 1s before the teaser appears (or immediately, when `delay` is under 1s). Default: `true`. */
  sound?: boolean;
}

/** Customization options for the float launcher button */
export interface LauncherConfig {
  /** Button icon. 'default' uses built-in SVG (mic/chat based on channel).
   *  'avatar' uses brand avatar from config API. { url } renders an <img>.
   *  { svg } sets innerHTML (JS API only, not available via data attributes). */
  icon?: LauncherIcon;
  /** Inline CSS overrides applied to the launcher button */
  style?: LauncherStyle;
  /** CSS class(es) added to the launcher button. Additive — existing SDK classes remain. */
  className?: string;
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
  /** Controls if and when the welcome teaser appears (`enabled`, `delay`, `sound`). Only used for float-type embeds. */
  teaser?: TeaserConfig;
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
  /**
   * Slider display mode. `"overlay"` (default) floats the panel over the page
   * with a dimming backdrop that closes on outside click. `"push"` shifts the
   * page content aside so the slider occupies real layout space — no backdrop,
   * and clicking the page does not close it. Falls back to `"overlay"` on narrow
   * viewports. Only used for slider-type embeds.
   */
  sliderMode?: "overlay" | "push";
  /**
   * The inline widget's frame — layout, sizing, and the card's border/radius/
   * shadow/background. Only used for widget-type embeds.
   *
   * Each field maps to a `--perspective-widget-*` CSS custom property, so the
   * same knob is reachable from JS/React (this object), a stylesheet, or inline
   * `style`. Precedence, highest to lowest: a field set here (the SDK writes it
   * as an inline variable on the wrapper) → your own `--perspective-widget-*`
   * declaration in CSS → the built-in default. So a `frame` field overrides a
   * stylesheet variable; conversely, for any field you DON'T set here, your CSS
   * variable wins at any specificity (the SDK leaves that var unset, so it's
   * never out-specified and survives global resets like Tailwind Preflight).
   */
  frame?: FrameConfig;
  /** When true, skips JSON-LD structured data injection into the parent page. Other attribution signals (data attributes, global metadata, HTML comments) remain active. */
  disableJsonLdAttribution?: boolean;
  /** Customize the floating launcher button appearance. Only used for float-type embeds. */
  launcher?: LauncherConfig;
  /** Callback when the iframe is visually painted but not yet hydrated. Fires significantly earlier than `onReady` — used internally by the SDK to hide the loading skeleton ASAP. Most consumers should use `onReady` instead. */
  onVisualReady?: () => void;
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
        | "onVisualReady"
        | "onSubmit"
        | "onNavigate"
        | "onClose"
        | "onError"
        | "onAuth"
        | "channel"
        | "welcomeMessage"
        | "teaser"
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
  /**
   * @deprecated The SDK no longer sends this (it sends `renderCloseButton`).
   * Kept because the app may still receive it from older SDK clients.
   */
  hasCloseButton?: boolean;
  /**
   * Whether the app should render its own close X. Sent for slider/popup/float;
   * `false` when `disableClose` is set. widget/fullpage have no X and omit it.
   */
  renderCloseButton?: boolean;
}

/** Messages sent from iframe to SDK */
export type EmbedMessage =
  | { type: "perspective:visual-ready"; researchId: string }
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
  avatarUrl?: string | null;
  embedSettings?: {
    appearance?: {
      hideProgress?: boolean;
      hideGreeting?: boolean;
      hideBranding?: boolean;
      enableFullScreen?: boolean;
    };
    launcher?: {
      icon?: LauncherIcon;
      style?: LauncherStyle;
    };
    teaser?: TeaserConfig;
    autoTrigger?: {
      trigger?: "timeout" | "exit-intent";
      delay?: number;
      showOnce?: "session" | "visitor" | "false";
    };
  };
}

/** EmbedConfig with _apiConfig from the config API (internal, subject to change) */
export type InternalEmbedConfig = EmbedConfig & {
  _apiConfig?: ThemeConfig;
  /**
   * Set when the embed mounts while the config API fetch is still in flight.
   * Defers delay-sensitive behavior (the float teaser) until the fetched
   * config arrives via update({ _apiConfig }), which clears the flag.
   */
  _apiConfigPending?: boolean;
};

/** SDK global configuration */
export interface SDKConfig {
  /** Override the default host */
  host?: string;
}
