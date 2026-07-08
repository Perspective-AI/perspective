/**
 * Inline widget embed - renders directly in a container element
 * SSR-safe - returns no-op handle on server
 */

import type { EmbedHandle, InternalEmbedConfig } from "./types";
import { hasDom, getHost } from "./config";
import {
  createIframe,
  setupMessageListener,
  registerIframe,
  ensureGlobalListeners,
  ensureHostPreconnect,
} from "./iframe";
import { createLoadingIndicator } from "./loading";
import { injectStyles } from "./styles";
import { cn, getThemeClass } from "./utils";
import { enrichContainer } from "./attribution";
import { perfLog } from "./perf";

type WidgetResources = {
  cleanup: () => void;
  unregister: () => void;
  wrapper: HTMLElement;
};

const widgetResources = new WeakMap<HTMLIFrameElement, WidgetResources>();

function createNoOpHandle(researchId: string, type: "widget"): EmbedHandle {
  return {
    unmount: () => {},
    update: () => {},
    destroy: () => {},
    researchId,
    type,
    iframe: null,
    container: null,
  };
}

function createExistingWidgetHandle(
  container: HTMLElement,
  researchId: string
): EmbedHandle {
  const existingWrapper = container.querySelector<HTMLElement>(
    ".perspective-embed-root"
  );
  const existingIframe = container.querySelector<HTMLIFrameElement>(
    "iframe[data-perspective]"
  );

  let destroyed = false;

  const unmount = () => {
    if (destroyed) return;
    destroyed = true;

    if (existingIframe) {
      const resources = widgetResources.get(existingIframe);
      if (resources) {
        resources.cleanup();
        resources.unregister();
        widgetResources.delete(existingIframe);
      }
    }
    existingWrapper?.remove();
  };

  return {
    unmount,
    update: () => {},
    destroy: unmount,
    researchId,
    type: "widget" as const,
    iframe: existingIframe,
    container,
  };
}

/**
 * Has the host given the widget container an explicit width or height?
 *
 * The centered, framed card is only a default for a *bare* drop-in. The moment
 * the host sizes the container — inline OR via a stylesheet / flex / grid
 * layout — we fill it exactly and skip the card's max-width / min-height, so an
 * embed that already lives in a sized box (e.g. a `height: 100%` / `h-full`
 * child of a sized flex or grid parent, or `.container { height: 500px }`) keeps
 * its existing full-bleed layout.
 *
 * Detection:
 *  1. Inline width/height (incl. min/max), flex, aspect-ratio, or out-of-flow
 *     positioning — covers `style="..."`, including `width: 100%`.
 *  2. A *resolved* computed height: an empty block box is ~0px tall until we
 *     fill it, so any real height means a stylesheet / flex / grid sized it
 *     (this is how `height: 100%` / Tailwind `h-full` is picked up).
 *
 * This is a best-effort read of author intent at mount time, not a guarantee —
 * e.g. a bare drop-in that happens to be a stretched flex-row child resolves to
 * a height and reads as "sized". `frame.layout` is the explicit override when
 * the detection guesses wrong, in either direction.
 *
 * We deliberately do NOT infer an author width by measuring against the parent:
 * an empty flex/grid child collapses to ~0px wide, which would misfire and
 * shrink a bare drop-in. Width set purely via stylesheet (no inline width, no
 * height) is uncommon; size the container or use the CSS variables instead.
 */
function hostControlsLayout(container: HTMLElement): boolean {
  const s = container.style;
  if (
    s.width ||
    s.minWidth ||
    s.maxWidth ||
    s.height ||
    s.minHeight ||
    s.maxHeight ||
    s.flex ||
    s.flexBasis ||
    s.flexGrow ||
    s.aspectRatio ||
    s.position === "absolute" ||
    s.position === "fixed"
  ) {
    return true;
  }

  try {
    // Author-set height (stylesheet / flex / grid / height:100%). A bare block
    // box reports ~0px tall here, so any real height means the host sized it.
    if (parseFloat(getComputedStyle(container).height) > 1) return true;
  } catch {
    /* getComputedStyle unavailable (extremely rare) */
  }

  return false;
}

export function createWidget(
  container: HTMLElement | null,
  config: InternalEmbedConfig
): EmbedHandle {
  const { researchId } = config;

  perfLog("SDK", "createWidget called", { researchId });

  // SSR safety: return no-op handle
  if (!hasDom() || !container) {
    return createNoOpHandle(researchId, "widget");
  }

  // Idempotency check for React Strict Mode
  if (container.querySelector("iframe[data-perspective]")) {
    return createExistingWidgetHandle(container, researchId);
  }

  const host = getHost(config.host);

  ensureHostPreconnect(host);
  injectStyles();
  ensureGlobalListeners();

  // Create wrapper for positioning. Visual defaults live in the injected
  // `.perspective-widget` stylesheet rules so host pages can override them
  // with ordinary CSS. The opinionated card framing is applied when the layout
  // resolves to "card": an explicit `frame.layout` always wins; otherwise we
  // best-effort detect whether the host already controls the container's box
  // (see hostControlsLayout) so existing full-bleed / custom-layout embeds keep
  // filling their container.
  const frame = config.frame;
  const useCard = frame?.layout
    ? frame.layout === "card"
    : !hostControlsLayout(container);

  const wrapper = document.createElement("div");
  wrapper.className = cn(
    "perspective-embed-root perspective-widget",
    useCard && "perspective-widget-card",
    getThemeClass(config.theme)
  );

  // Frame appearance maps 1:1 to CSS custom properties the card rule reads.
  // Setting them inline here is equivalent to the host setting the same vars in
  // CSS — it's just a friendlier surface for JS/React consumers.
  if (frame) {
    const setVar = (prop: string, value?: string) => {
      if (value != null && value !== "") wrapper.style.setProperty(prop, value);
    };
    setVar("--perspective-widget-max-width", frame.maxWidth);
    setVar("--perspective-widget-min-height", frame.minHeight);
    setVar("--perspective-widget-radius", frame.radius);
    setVar("--perspective-widget-border", frame.border);
    setVar("--perspective-widget-shadow", frame.shadow);
    setVar("--perspective-widget-bg", frame.background);
  }

  // Create loading indicator with theme and brand colors
  const loading = createLoadingIndicator({
    theme: config.theme,
    brand: config.brand,
    apiConfig: config._apiConfig,
    researchId,
    host,
  });
  wrapper.appendChild(loading);

  // Create iframe (hidden initially). Workspace-level appearance overrides
  // (hideProgress / hideGreeting / hideBranding / enableFullScreen) are now
  // resolved by the iframe page server-side, so the SDK doesn't need to
  // fetch config or merge URL params before creating the iframe.
  const iframe = createIframe(
    researchId,
    "widget",
    host,
    config.params,
    config.brand,
    config.theme
  );
  // Size/border come from the `.perspective-widget iframe` rule. At handoff
  // the iframe snaps visible under the overlay's fade-out — no transition, so
  // combined coverage never dips below 100% (a cross-fade would).
  iframe.style.opacity = "0";

  wrapper.appendChild(iframe);
  container.appendChild(wrapper);
  enrichContainer(wrapper, "widget", config);

  // Mutable config reference for updates
  let currentConfig = { ...config };

  // Hide skeleton on the FIRST signal of visual readiness — typically
  // `perspective:visual-ready` (pre-hydration), with `perspective:ready`
  // as a fallback for older iframe versions that don't emit visual-ready.
  let skeletonHidden = false;
  const hideSkeleton = () => {
    if (skeletonHidden) return;
    skeletonHidden = true;
    perfLog("SDK", "skeleton hide started (widget)", { researchId });
    loading.style.opacity = "0";
    iframe.style.opacity = "1";
    setTimeout(() => loading.remove(), 150);
  };

  // Set up message listener with loading state handling
  const cleanup = setupMessageListener(
    researchId,
    {
      get onVisualReady() {
        return () => {
          hideSkeleton();
          currentConfig.onVisualReady?.();
        };
      },
      get onReady() {
        return () => {
          hideSkeleton();
          currentConfig.onReady?.();
        };
      },
      get onSubmit() {
        return currentConfig.onSubmit;
      },
      get onNavigate() {
        return currentConfig.onNavigate;
      },
      get onClose() {
        return currentConfig.onClose;
      },
      get onError() {
        return currentConfig.onError;
      },
    },
    iframe,
    host,
    { skipResize: true }
  );

  // Register iframe for theme change notifications
  const unregisterIframe = registerIframe(iframe, host);

  widgetResources.set(iframe, {
    cleanup,
    unregister: unregisterIframe,
    wrapper,
  });

  let destroyed = false;

  const unmount = () => {
    if (destroyed) return;
    destroyed = true;

    cleanup();
    unregisterIframe();
    widgetResources.delete(iframe);
    wrapper.remove();
  };

  return {
    unmount,
    update: (options) => {
      currentConfig = { ...currentConfig, ...options };
    },
    destroy: unmount,
    researchId,
    type: "widget" as const,
    iframe,
    container,
  };
}
