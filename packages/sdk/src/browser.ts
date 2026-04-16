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
  InternalEmbedConfig,
  ShowOnce,
  ThemeConfig,
  TriggerConfig,
} from "./types";
import { DATA_ATTRS, THEME_VALUES } from "./constants";
import {
  fetchEmbedConfig,
  DEFAULT_THEME,
  type EmbedApiConfig,
} from "./embed-api";
import {
  parseTriggerAttr,
  parseShowOnceAttr,
  setupTrigger,
  shouldShow,
  markShown,
} from "./triggers";
import { createWidget } from "./widget";
import { createLoadingIndicator } from "./loading";
import { openPopup } from "./popup";
import { openSlider } from "./slider";
import { createFloatBubble, createChatBubble } from "./float";
import { createFullpage } from "./fullpage";
import { configure, getConfig, hasDom } from "./config";
import { getPersistedOpenState } from "./state";
import { resolveIsDark } from "./utils";
import { injectGlobalMetadata } from "./attribution";

// Track all active instances
const instances: Map<string, EmbedHandle | FloatHandle> = new Map();

// Track pending auto-init skeletons so destroy/destroyAll can cancel them
const pendingInits: Map<string, { cancelled: boolean; skeleton: HTMLElement }> =
  new Map();

// Track auto-open trigger cleanups (keyed by researchId)
const triggerCleanups: Map<string, () => void> = new Map();

// Generation counters to invalidate late popup/slider config callbacks after destroy
let globalDestroyGen = 0;
const idDestroyGen: Map<string, number> = new Map();

/** Check if a destroy happened since the given generations were captured */
function wasDestroyed(
  researchId: string,
  globalGen: number,
  idGen: number
): boolean {
  return (
    globalDestroyGen !== globalGen ||
    (idDestroyGen.get(researchId) ?? 0) !== idGen
  );
}

/**
 * Set up auto-trigger from API embedSettings.autoTrigger config.
 * Replaces any existing trigger for this researchId (API wins over embed code).
 */
function setupApiAutoTrigger(
  researchId: string,
  config: EmbedApiConfig,
  initFn: () => void
): void {
  const api = config.embedSettings?.autoTrigger;
  if (!api?.trigger) return;

  const trigger: TriggerConfig =
    api.trigger === "timeout"
      ? { type: "timeout", delay: api.delay ?? 5000 }
      : { type: "exit-intent" };
  const showOnce: ShowOnce =
    api.showOnce === "false"
      ? false
      : ((api.showOnce as ShowOnce) ?? "session");

  if (!shouldShow(researchId, showOnce)) return;

  // Clean up any existing trigger (embed code or previous API trigger)
  triggerCleanups.get(researchId)?.();

  // Capture generation so trigger callback bails if destroy happens after setup
  const dg = globalDestroyGen;
  const ig = idDestroyGen.get(researchId) ?? 0;

  const cleanup = setupTrigger(trigger, () => {
    triggerCleanups.delete(researchId);
    if (wasDestroyed(researchId, dg, ig)) return;
    markShown(researchId, showOnce);
    initFn();
  });
  triggerCleanups.set(researchId, cleanup);
}

type ButtonStyleConfig = {
  themeConfig: ThemeConfig;
  theme?: EmbedConfig["theme"];
  brand?: EmbedConfig["brand"];
};
const styledButtons = new Map<HTMLElement, ButtonStyleConfig>();
let buttonThemeMediaQuery: MediaQueryList | null = null;

/** Alias for internal use */
const fetchConfig = fetchEmbedConfig;

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
  // Cancel any pending auto-init for this researchId
  const pending = pendingInits.get(researchId);
  if (pending) {
    pending.cancelled = true;
    pending.skeleton.remove();
    pendingInits.delete(researchId);
  }
  // Cancel any trigger for this researchId
  triggerCleanups.get(researchId)?.();
  triggerCleanups.delete(researchId);
  // Invalidate any in-flight config callbacks for this researchId
  idDestroyGen.set(researchId, (idDestroyGen.get(researchId) ?? 0) + 1);
}

function destroyAll(): void {
  globalDestroyGen++;
  instances.forEach((instance) => instance.unmount());
  instances.clear();
  // Cancel all pending auto-inits
  pendingInits.forEach((pending) => {
    pending.cancelled = true;
    pending.skeleton.remove();
  });
  pendingInits.clear();
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

  // Widget embeds — skeleton immediately, config + iframe in parallel
  document
    .querySelectorAll<HTMLElement>(`[${DATA_ATTRS.widget}]`)
    .forEach((el) => {
      const researchId = el.getAttribute(DATA_ATTRS.widget);
      if (researchId && !instances.has(researchId)) {
        const params = parseParamsAttr(el);
        const brandConfig = extractBrandConfig(el);
        // Show skeleton instantly while config fetches
        const skeleton = createLoadingIndicator({
          theme: brandConfig.theme,
          brand: brandConfig.brand,
        });
        skeleton.style.position = "relative";
        skeleton.style.minHeight = "500px";
        el.appendChild(skeleton);
        const pending = { cancelled: false, skeleton };
        pendingInits.set(researchId, pending);
        // Config + mount in parallel — skeleton covers the wait
        fetchConfig(researchId).then((config) => {
          pendingInits.delete(researchId);
          skeleton.remove();
          // Bail if cancelled by destroy(), element removed, or instance exists
          if (pending.cancelled || !el.isConnected || instances.has(researchId))
            return;
          mount(el, {
            researchId,
            type: "widget",
            params,
            ...brandConfig,
            disableJsonLdAttribution: el.hasAttribute(
              DATA_ATTRS.disableJsonLdAttribution
            ),
            _apiConfig: config,
          } as InternalEmbedConfig);
        });
      }
    });

  // Fullpage embeds — skeleton immediately, config + iframe in parallel
  document
    .querySelectorAll<HTMLElement>(`[${DATA_ATTRS.fullpage}]`)
    .forEach((el) => {
      const researchId = el.getAttribute(DATA_ATTRS.fullpage);
      if (researchId && !instances.has(researchId)) {
        const params = parseParamsAttr(el);
        const brandConfig = extractBrandConfig(el);
        // Show skeleton instantly while config fetches
        const skeleton = createLoadingIndicator({
          theme: brandConfig.theme,
          brand: brandConfig.brand,
        });
        skeleton.style.position = "fixed";
        skeleton.style.inset = "0";
        skeleton.style.zIndex = "2147483647";
        document.body.appendChild(skeleton);
        const pending = { cancelled: false, skeleton };
        pendingInits.set(researchId, pending);
        // Config + init in parallel — skeleton covers the wait
        fetchConfig(researchId).then((config) => {
          pendingInits.delete(researchId);
          skeleton.remove();
          // Bail if cancelled by destroy(), element removed, or instance exists
          if (pending.cancelled || !el.isConnected || instances.has(researchId))
            return;
          init({
            researchId,
            type: "fullpage",
            params,
            ...brandConfig,
            disableJsonLdAttribution: el.hasAttribute(
              DATA_ATTRS.disableJsonLdAttribution
            ),
            _apiConfig: config,
          } as InternalEmbedConfig);
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

      // Capture fetched config for passing _apiConfig to init calls
      let cachedConfig: EmbedApiConfig | undefined;
      const disableJsonLdAttribution = el.hasAttribute(
        DATA_ATTRS.disableJsonLdAttribution
      );
      const initPopup = () =>
        init({
          researchId,
          type: "popup",
          params,
          disableClose,
          disableJsonLdAttribution,
          ...brandConfig,
          ...(cachedConfig && { _apiConfig: cachedConfig }),
        } as InternalEmbedConfig);

      const dg = globalDestroyGen;
      const ig = idDestroyGen.get(researchId) ?? 0;

      if (autoOpenAttr) {
        if (persistedOpen === true) {
          fetchConfig(researchId).then((config) => {
            if (wasDestroyed(researchId, dg, ig)) return;
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
              // API autoTrigger overrides embed code trigger
              const configPromise = fetchConfig(researchId);
              configPromise.then((config) => {
                if (wasDestroyed(researchId, dg, ig)) return;
                cachedConfig = config;
                setupApiAutoTrigger(researchId, config, initPopup);
              });

              const cleanup = setupTrigger(trigger, () => {
                triggerCleanups.delete(researchId);
                // Await config — skip if API autoTrigger will take over (API wins)
                configPromise.then((config) => {
                  if (wasDestroyed(researchId, dg, ig)) return;
                  cachedConfig = config;
                  if (!config.embedSettings?.autoTrigger?.trigger) {
                    markShown(researchId, showOnce);
                    initPopup();
                  }
                });
              });
              triggerCleanups.set(researchId, cleanup);
            }
          } catch (e) {
            console.warn("[Perspective]", (e as Error).message);
          }
        }
      } else {
        // Click-to-open mode: styled button
        // Pre-fetch config so it's ready when user clicks
        const configPromise = fetchConfig(researchId);
        configPromise.then((config) => {
          cachedConfig = config;
          styleButton(el, config, brandConfig);
          // Only arm auto-trigger if not destroyed and popup wasn't already opened
          if (wasDestroyed(researchId, dg, ig)) return;
          if (!instances.has(researchId)) {
            setupApiAutoTrigger(researchId, config, initPopup);
          }
        });
        styleButton(el, DEFAULT_THEME, brandConfig);
        el.addEventListener("click", (e) => {
          e.preventDefault();
          // Cancel any pending API auto-trigger (manual open takes precedence)
          triggerCleanups.get(researchId)?.();
          triggerCleanups.delete(researchId);
          initPopup();
        });

        if (persistedOpen === true) {
          triggerCleanups.get(researchId)?.();
          triggerCleanups.delete(researchId);
          fetchConfig(researchId).then((config) => {
            if (wasDestroyed(researchId, dg, ig)) return;
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
        const disableJsonLdAttribution = el.hasAttribute(
          DATA_ATTRS.disableJsonLdAttribution
        );
        const initSlider = () =>
          init({
            researchId,
            type: "slider",
            params,
            disableClose,
            disableJsonLdAttribution,
            ...brandConfig,
            ...(sliderConfig && { _apiConfig: sliderConfig }),
          } as InternalEmbedConfig);

        const dg = globalDestroyGen;
        const ig = idDestroyGen.get(researchId) ?? 0;

        // Pre-fetch config so it's ready when user clicks
        const sliderConfigPromise = fetchConfig(researchId);
        sliderConfigPromise.then((config) => {
          sliderConfig = config;
          styleButton(el, config, brandConfig);
          // Only arm auto-trigger if not destroyed and slider wasn't already opened
          if (wasDestroyed(researchId, dg, ig)) return;
          if (!instances.has(researchId)) {
            setupApiAutoTrigger(researchId, config, initSlider);
          }
        });
        styleButton(el, DEFAULT_THEME, brandConfig);
        el.addEventListener("click", (e) => {
          e.preventDefault();
          // Cancel any pending API auto-trigger (manual open takes precedence)
          triggerCleanups.get(researchId)?.();
          triggerCleanups.delete(researchId);
          initSlider();
        });

        if (persistedOpen === true) {
          triggerCleanups.get(researchId)?.();
          triggerCleanups.delete(researchId);
          fetchConfig(researchId).then((config) => {
            if (wasDestroyed(researchId, dg, ig)) return;
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
        disableJsonLdAttribution: floatEl.hasAttribute(
          DATA_ATTRS.disableJsonLdAttribution
        ),
        ...brandConfig,
        ...(launcherConfig && { launcher: launcherConfig }),
        _apiConfig: DEFAULT_THEME,
      } as InternalEmbedConfig);

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
            _apiConfig: config,
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

  // JSON-LD injection deferred to enrichContainer (needs per-embed config for disableJsonLdAttribution)
  injectGlobalMetadata();

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
