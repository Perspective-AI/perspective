/**
 * Perspective Embed SDK - Browser Entry
 *
 * CDN/Script Tag Entry Point - auto-init, attaches to window.Perspective
 *
 * Usage:
 *   <script src="https://getperspective.ai/v1/perspective.js"></script>
 *
 *   <!-- Auto-init with data attributes -->
 *   <div data-perspective-widget="research_xxx"></div>
 *   <button data-perspective-popup="research_xxx">Open Survey</button>
 *
 *   <!-- Or programmatic -->
 *   <script>
 *     Perspective.openPopup({ researchId: 'xxx' });
 *   </script>
 */

import type {
  BrandColors,
  EmbedConfig,
  EmbedHandle,
  FloatHandle,
  ThemeConfig,
} from "./types";
import { DATA_ATTRS, THEME_VALUES } from "./constants";
import {
  parseTriggerAttr,
  parseShowOnceAttr,
  setupTrigger,
  shouldShow,
  markShown,
} from "./triggers";
import { createWidget } from "./widget";
import { openPopup } from "./popup";
import { openSlider } from "./slider";
import { createFloatBubble, createChatBubble } from "./float";
import { createFullpage } from "./fullpage";
import { configure, getConfig, hasDom, getHost } from "./config";
import { getPersistedOpenState } from "./state";
import { resolveIsDark } from "./utils";

// Track all active instances
const instances: Map<string, EmbedHandle | FloatHandle> = new Map();

// Track auto-open trigger cleanups (keyed by researchId)
const triggerCleanups: Map<string, () => void> = new Map();

// Theme config cache
type EmbedApiConfig = ThemeConfig & {
  allowedChannels?: ThemeConfig["allowedChannels"];
  welcomeMessage?: string;
};
const configCache: Map<string, EmbedApiConfig> = new Map();

type ButtonStyleConfig = {
  themeConfig: ThemeConfig;
  theme?: EmbedConfig["theme"];
  brand?: EmbedConfig["brand"];
};
const styledButtons = new Map<HTMLElement, ButtonStyleConfig>();
let buttonThemeMediaQuery: MediaQueryList | null = null;

const DEFAULT_THEME: ThemeConfig = {
  primaryColor: "#7c3aed",
  textColor: "#ffffff",
  darkPrimaryColor: "#a78bfa",
  darkTextColor: "#ffffff",
};

/**
 * Fetch theme config from API (cached)
 */
async function fetchConfig(researchId: string): Promise<EmbedApiConfig> {
  if (configCache.has(researchId)) {
    return configCache.get(researchId)!;
  }

  try {
    const host = getHost();
    const res = await fetch(`${host}/api/v1/embed/config/${researchId}`);
    if (!res.ok) return DEFAULT_THEME;
    const config = (await res.json()) as EmbedApiConfig;
    configCache.set(researchId, config);
    return config;
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * Apply theme styles to a button element
 */
function styleButton(
  el: HTMLElement,
  themeConfig: ThemeConfig,
  options?: { theme?: EmbedConfig["theme"]; brand?: EmbedConfig["brand"] }
): void {
  if (el.hasAttribute(DATA_ATTRS.noStyle)) return;

  styledButtons.set(el, {
    themeConfig,
    theme: options?.theme,
    brand: options?.brand,
  });

  updateButtonTheme(el, {
    themeConfig,
    theme: options?.theme,
    brand: options?.brand,
  });
}

/**
 * Update button styles based on theme
 */
function updateButtonTheme(el: HTMLElement, config: ButtonStyleConfig): void {
  const { themeConfig, theme, brand } = config;
  const isDark = resolveIsDark(theme);

  const bg = isDark
    ? (brand?.dark?.primary ?? themeConfig.darkPrimaryColor)
    : (brand?.light?.primary ?? themeConfig.primaryColor);
  const text = isDark
    ? (brand?.dark?.text ?? themeConfig.darkTextColor)
    : (brand?.light?.text ?? themeConfig.textColor);

  el.style.backgroundColor = bg;
  el.style.color = text;
  el.style.padding = "10px 20px";
  el.style.border = "none";
  el.style.borderRadius = "8px";
  el.style.fontWeight = "500";
  el.style.cursor = "pointer";
}

/**
 * Update all styled buttons when theme changes
 */
function updateAllButtonThemes(): void {
  styledButtons.forEach((config, el) => {
    if (document.contains(el)) {
      updateButtonTheme(el, config);
    } else {
      styledButtons.delete(el);
    }
  });
}

let buttonThemeListener: ((e: MediaQueryListEvent) => void) | null = null;

function setupButtonThemeListener(): void {
  if (buttonThemeListener || !hasDom()) return;

  buttonThemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  buttonThemeListener = () => updateAllButtonThemes();
  buttonThemeMediaQuery.addEventListener("change", buttonThemeListener);
}

function teardownButtonThemeListener(): void {
  if (buttonThemeListener && buttonThemeMediaQuery) {
    buttonThemeMediaQuery.removeEventListener("change", buttonThemeListener);
    buttonThemeListener = null;
    buttonThemeMediaQuery = null;
  }
}

/**
 * Parse params from data attribute (format: "key1=value1,key2=value2")
 */
function parseParamsAttr(el: HTMLElement): Record<string, string> | undefined {
  const paramsStr = el.getAttribute(DATA_ATTRS.params);
  if (!paramsStr) return undefined;

  const params: Record<string, string> = {};
  for (const pair of paramsStr.split(",")) {
    const [key, ...valueParts] = pair.trim().split("=");
    if (key) {
      params[key.trim()] = valueParts.join("=").trim();
    }
  }
  return Object.keys(params).length > 0 ? params : undefined;
}

/**
 * Parse brand colors from data attribute (format: "primary=#xxx,bg=#yyy")
 */
function parseBrandAttr(attrValue: string | null): BrandColors | undefined {
  if (!attrValue) return undefined;

  const colors: BrandColors = {};
  for (const pair of attrValue.split(",")) {
    const [key, ...valueParts] = pair.trim().split("=");
    if (key && valueParts.length > 0) {
      const value = valueParts.join("=").trim();
      if (value) {
        const k = key.trim() as keyof BrandColors;
        if (
          k === "primary" ||
          k === "secondary" ||
          k === "bg" ||
          k === "text"
        ) {
          colors[k] = value;
        }
      }
    }
  }
  return Object.keys(colors).length > 0 ? colors : undefined;
}

/**
 * Extract brand config and theme from element attributes
 */
function extractBrandConfig(
  el: HTMLElement
): Pick<EmbedConfig, "brand" | "theme"> {
  const light = parseBrandAttr(el.getAttribute(DATA_ATTRS.brand));
  const dark = parseBrandAttr(el.getAttribute(DATA_ATTRS.brandDark));
  const themeAttr = el.getAttribute(DATA_ATTRS.theme);

  const config: Pick<EmbedConfig, "brand" | "theme"> = {};

  if (light || dark) {
    config.brand = {};
    if (light) config.brand.light = light;
    if (dark) config.brand.dark = dark;
  }

  if (
    themeAttr === THEME_VALUES.dark ||
    themeAttr === THEME_VALUES.light ||
    themeAttr === THEME_VALUES.system
  ) {
    config.theme = themeAttr;
  }

  return config;
}

/**
 * Extract launcher config from element data attributes
 */
function extractLauncherConfig(
  el: HTMLElement
): EmbedConfig["launcher"] | undefined {
  const iconAttr = el.getAttribute(DATA_ATTRS.launcherIcon);
  const styleAttr = el.getAttribute(DATA_ATTRS.launcherStyle);
  const classAttr = el.getAttribute(DATA_ATTRS.launcherClass);

  if (!iconAttr && !styleAttr && !classAttr) return undefined;

  const launcher: NonNullable<EmbedConfig["launcher"]> = {};

  if (iconAttr) {
    if (iconAttr.startsWith("http") || iconAttr.startsWith("/")) {
      launcher.icon = { url: iconAttr };
    } else if (iconAttr === "avatar" || iconAttr === "default") {
      launcher.icon = iconAttr;
    }
  }

  if (styleAttr) {
    const style: Record<string, string> = {};
    for (const pair of styleAttr.split(";")) {
      const colonIdx = pair.indexOf(":");
      if (colonIdx === -1) continue;
      const prop = pair.slice(0, colonIdx).trim();
      const value = pair.slice(colonIdx + 1).trim();
      if (prop && value) {
        // Convert kebab-case to camelCase (e.g., border-radius -> borderRadius)
        const camelProp = prop.replace(/-([a-z])/g, (_, c: string) =>
          c.toUpperCase()
        );
        style[camelProp] = value;
      }
    }
    if (Object.keys(style).length > 0) {
      launcher.style = style;
    }
  }

  if (classAttr) {
    launcher.className = classAttr;
  }

  return launcher;
}

/**
 * Initialize an embed programmatically
 */
function init(config: EmbedConfig): EmbedHandle | FloatHandle {
  const { researchId } = config;
  // Normalize legacy "chat" type to "float"
  const type = config.type === "chat" ? "float" : (config.type ?? "widget");

  // Destroy existing instance for this research
  if (instances.has(researchId)) {
    instances.get(researchId)!.unmount();
    instances.delete(researchId);
  }

  let instance: EmbedHandle | FloatHandle;

  switch (type) {
    case "popup":
      instance = openPopup(config);
      break;
    case "slider":
      instance = openSlider(config);
      break;
    case "float":
      instance = createFloatBubble(config);
      break;
    case "fullpage":
      instance = createFullpage(config);
      break;
    default:
      throw new Error(
        `Unknown embed type "${type}". Valid types: popup, slider, float, fullpage (use init()), or widget (use mount()).`
      );
  }

  instances.set(researchId, instance);
  return instance;
}

/**
 * Mount a widget into a container element
 */
function mount(
  container: HTMLElement | string,
  config: EmbedConfig
): EmbedHandle {
  const { researchId } = config;
  const type = config.type === "chat" ? "float" : (config.type ?? "widget");

  const el =
    typeof container === "string"
      ? document.querySelector<HTMLElement>(container)
      : container;

  if (!el) {
    throw new Error(`Container not found: ${container}`);
  }

  // Destroy existing instance
  if (instances.has(researchId)) {
    instances.get(researchId)!.unmount();
    instances.delete(researchId);
  }

  let instance: EmbedHandle;

  switch (type) {
    case "widget":
      instance = createWidget(el, config);
      break;
    default:
      // For popup/slider/float, just use init - container not used
      instance = init({ ...config, type }) as EmbedHandle;
      return instance;
  }

  instances.set(researchId, instance);
  return instance;
}

/**
 * Destroy an embed instance
 */
function destroy(researchId: string): void {
  const instance = instances.get(researchId);
  if (instance) {
    instance.destroy();
    instances.delete(researchId);
  }
}

function destroyAll(): void {
  instances.forEach((instance) => instance.unmount());
  instances.clear();
  triggerCleanups.forEach((cleanup) => cleanup());
  triggerCleanups.clear();
  styledButtons.clear();
  teardownButtonThemeListener();
  // Reset initialized flags so autoInit can re-process elements cleanly
  if (hasDom()) {
    document
      .querySelectorAll<HTMLElement>("[data-perspective-initialized]")
      .forEach((el) => el.removeAttribute("data-perspective-initialized"));
  }
}

/**
 * Auto-initialize embeds from data attributes
 */
function autoInit(): void {
  if (!hasDom()) return;

  setupButtonThemeListener();

  // Widget embeds
  document
    .querySelectorAll<HTMLElement>(`[${DATA_ATTRS.widget}]`)
    .forEach((el) => {
      const researchId = el.getAttribute(DATA_ATTRS.widget);
      if (researchId && !instances.has(researchId)) {
        const params = parseParamsAttr(el);
        const brandConfig = extractBrandConfig(el);
        fetchConfig(researchId).then((config) => {
          if (!instances.has(researchId)) {
            mount(el, {
              researchId,
              type: "widget",
              params,
              ...brandConfig,
              _themeConfig: config,
            } as EmbedConfig & { _themeConfig: ThemeConfig });
          }
        });
      }
    });

  // Fullpage embeds
  document
    .querySelectorAll<HTMLElement>(`[${DATA_ATTRS.fullpage}]`)
    .forEach((el) => {
      const researchId = el.getAttribute(DATA_ATTRS.fullpage);
      if (researchId && !instances.has(researchId)) {
        const params = parseParamsAttr(el);
        const brandConfig = extractBrandConfig(el);
        fetchConfig(researchId).then((config) => {
          if (!instances.has(researchId)) {
            init({
              researchId,
              type: "fullpage",
              params,
              ...brandConfig,
              _themeConfig: config,
            } as EmbedConfig & { _themeConfig: ThemeConfig });
          }
        });
      }
    });

  // Popup triggers
  document
    .querySelectorAll<HTMLElement>(`[${DATA_ATTRS.popup}]`)
    .forEach((el) => {
      if (el.hasAttribute("data-perspective-initialized")) return;
      el.setAttribute("data-perspective-initialized", "true");

      const researchId = el.getAttribute(DATA_ATTRS.popup);
      if (!researchId) return;

      const params = parseParamsAttr(el);
      const brandConfig = extractBrandConfig(el);
      const autoOpenAttr = el.getAttribute(DATA_ATTRS.autoOpen);
      const disableClose = el.hasAttribute(DATA_ATTRS.disableClose);

      const persistedOpen = getPersistedOpenState({
        researchId,
        type: "popup",
      });

      // Capture fetched config for passing _themeConfig to init calls
      let cachedConfig: EmbedApiConfig | undefined;
      const initPopup = () =>
        init({
          researchId,
          type: "popup",
          params,
          disableClose,
          ...brandConfig,
          ...(cachedConfig && { _themeConfig: cachedConfig }),
        } as EmbedConfig & { _themeConfig: ThemeConfig });

      if (autoOpenAttr) {
        if (persistedOpen === true) {
          fetchConfig(researchId).then((config) => {
            cachedConfig = config;
            initPopup();
          });
        } else if (persistedOpen !== false) {
          // Auto-open mode: trigger-based, no button styling
          try {
            const trigger = parseTriggerAttr(autoOpenAttr);
            const showOnce = parseShowOnceAttr(
              el.getAttribute(DATA_ATTRS.showOnce)
            );

            if (shouldShow(researchId, showOnce)) {
              // Clean up any existing trigger for this researchId
              triggerCleanups.get(researchId)?.();

              // Pre-fetch config so it's ready when trigger fires
              fetchConfig(researchId).then((config) => {
                cachedConfig = config;
              });

              const cleanup = setupTrigger(trigger, () => {
                triggerCleanups.delete(researchId);
                markShown(researchId, showOnce);
                initPopup();
              });
              triggerCleanups.set(researchId, cleanup);
            }
          } catch (e) {
            console.warn("[Perspective]", (e as Error).message);
          }
        }
      } else {
        // Click-to-open mode: styled button
        styleButton(el, DEFAULT_THEME, brandConfig);
        el.addEventListener("click", (e) => {
          e.preventDefault();
          initPopup();
        });
        fetchConfig(researchId).then((config) => {
          cachedConfig = config;
          styleButton(el, config, brandConfig);
        });

        if (persistedOpen === true) {
          fetchConfig(researchId).then((config) => {
            cachedConfig = config;
            initPopup();
          });
        }
      }
    });

  // Slider triggers
  document
    .querySelectorAll<HTMLElement>(`[${DATA_ATTRS.slider}]`)
    .forEach((el) => {
      if (el.hasAttribute("data-perspective-initialized")) return;
      el.setAttribute("data-perspective-initialized", "true");

      const researchId = el.getAttribute(DATA_ATTRS.slider);
      if (researchId) {
        const params = parseParamsAttr(el);
        const brandConfig = extractBrandConfig(el);
        const disableClose = el.hasAttribute(DATA_ATTRS.disableClose);
        const persistedOpen = getPersistedOpenState({
          researchId,
          type: "slider",
        });

        let sliderConfig: EmbedApiConfig | undefined;
        const initSlider = () =>
          init({
            researchId,
            type: "slider",
            params,
            disableClose,
            ...brandConfig,
            ...(sliderConfig && { _themeConfig: sliderConfig }),
          } as EmbedConfig & { _themeConfig: ThemeConfig });

        styleButton(el, DEFAULT_THEME, brandConfig);
        el.addEventListener("click", (e) => {
          e.preventDefault();
          initSlider();
        });
        fetchConfig(researchId).then((config) => {
          sliderConfig = config;
          styleButton(el, config, brandConfig);
        });

        if (persistedOpen === true) {
          fetchConfig(researchId).then((config) => {
            sliderConfig = config;
            initSlider();
          });
        }
      }
    });

  // Float bubble - supports both data-perspective-float and data-perspective-chat (legacy)
  const floatSelector = `[${DATA_ATTRS.float}], [${DATA_ATTRS.chat}]`;
  const floatEl = document.querySelector<HTMLElement>(floatSelector);
  if (floatEl) {
    const researchId =
      floatEl.getAttribute(DATA_ATTRS.float) ||
      floatEl.getAttribute(DATA_ATTRS.chat);
    if (researchId && !instances.has(researchId)) {
      const params = parseParamsAttr(floatEl);
      const brandConfig = extractBrandConfig(floatEl);
      const launcherConfig = extractLauncherConfig(floatEl);
      const floatHandle = init({
        researchId,
        type: "float",
        params,
        ...brandConfig,
        ...(launcherConfig && { launcher: launcherConfig }),
        _themeConfig: DEFAULT_THEME,
      } as EmbedConfig & { _themeConfig: ThemeConfig });

      fetchConfig(researchId).then((config) => {
        // Update bubble color with fetched theme
        const bubble = document.querySelector<HTMLElement>(
          '[data-perspective="float-bubble"]'
        );
        if (bubble && !floatEl.hasAttribute(DATA_ATTRS.noStyle)) {
          // Only apply theme colors if launcher.style didn't override backgroundColor
          if (!launcherConfig?.style?.backgroundColor) {
            const isDark = resolveIsDark(brandConfig.theme);
            const bg = isDark
              ? (brandConfig.brand?.dark?.primary ?? config.darkPrimaryColor)
              : (brandConfig.brand?.light?.primary ?? config.primaryColor);
            bubble.style.setProperty("--perspective-float-bg", bg);
            bubble.style.setProperty(
              "--perspective-float-shadow",
              `0 4px 12px ${bg}66`
            );
            bubble.style.setProperty(
              "--perspective-float-shadow-hover",
              `0 6px 16px ${bg}80`
            );
            bubble.style.backgroundColor = bg;
            bubble.style.boxShadow = `0 4px 12px ${bg}66`;
          }
        }

        if (
          floatHandle.type === "float" &&
          instances.get(researchId) === floatHandle
        ) {
          const channels =
            config.channel ?? config.allowedChannels ?? undefined;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (floatHandle.update as any)({
            channel: channels,
            welcomeMessage: config.welcomeMessage,
            _themeConfig: config,
          });
        }
      });
    }
  }
}

// Build the public API
const Perspective = {
  // Configuration
  configure,
  getConfig,

  // Instance management
  init,
  mount,
  destroy,
  destroyAll,
  autoInit,

  // Direct creation functions (primary API)
  createWidget,
  openPopup,
  openSlider,
  createFloatBubble,
  createFullpage,

  // Legacy alias
  createChatBubble,
};

declare global {
  interface Window {
    __PERSPECTIVE_SDK_INITIALIZED__?: boolean;
    Perspective?: typeof Perspective;
  }
}

// Prevent duplicate initialization when script is loaded multiple times
// (e.g., SPAs, tag managers, hot-reload, or accidental double-include).
// Without this guard, each script evaluation would register new listeners
// and create isolated module state, causing memory leaks and duplicate handlers.
if (hasDom() && !window.__PERSPECTIVE_SDK_INITIALIZED__) {
  window.__PERSPECTIVE_SDK_INITIALIZED__ = true;

  // Add attribution comment next to the script tag
  const script = document.currentScript;
  if (script?.parentNode) {
    script.parentNode.insertBefore(
      document.createComment(
        " Powered by Perspective AI \u2014 https://getperspective.ai "
      ),
      script
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit, { once: true });
  } else {
    autoInit();
  }

  window.Perspective = Perspective;
}

// Export for module usage
export {
  configure,
  getConfig,
  init,
  mount,
  destroy,
  destroyAll,
  autoInit,
  createWidget,
  openPopup,
  openSlider,
  createFloatBubble,
  createChatBubble,
  createFullpage,
};

export default Perspective;
