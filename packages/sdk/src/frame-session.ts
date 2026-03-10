import type { EmbedConfig, EmbedType } from "./types";
import {
  createIframe,
  setupMessageListener,
  sendMessage,
  registerIframe,
  getCachedAuthToken,
  ensureGlobalListeners,
} from "./iframe";
import { createLoadingIndicator } from "./loading";
import { claimPreloadedIframe } from "./preload";
import { getReusableEmbedSignature } from "./reuse";
import { MESSAGE_TYPES, SDK_VERSION, CURRENT_FEATURES } from "./constants";

const noopNavigate = () => {};

type SessionEmbedType = Extract<EmbedType, "popup" | "slider" | "float">;

export interface EmbedFrameSession {
  iframe: HTMLIFrameElement;
  cleanup: () => void;
  replayOpenCallbacks: () => void;
  reuseSignature: string;
}

export function createEmbedFrameSession(options: {
  config: EmbedConfig;
  type: SessionEmbedType;
  host: string;
  contentParent: HTMLElement;
  getConfig: () => EmbedConfig;
  isOpen: () => boolean;
  onClose: () => void;
  loadingStyle?: (loading: HTMLElement) => void;
  hasCloseButton?: boolean;
}): EmbedFrameSession {
  const { config, type, host, contentParent, getConfig, isOpen, onClose } =
    options;
  const { researchId } = config;
  ensureGlobalListeners();
  const reuseSignature = getReusableEmbedSignature(config);
  const claimed = claimPreloadedIframe(researchId, type, reuseSignature);
  const iframe =
    claimed?.iframe ??
    createIframe(
      researchId,
      type,
      host,
      config.params,
      config.brand,
      config.theme
    );

  let loading: HTMLElement | null = null;
  if (!claimed?.wasReady) {
    loading = createLoadingIndicator({
      theme: config.theme,
      brand: config.brand,
    });
    options.loadingStyle?.(loading);
  }

  iframe.style.border = "none";
  if (claimed?.wasReady) {
    iframe.style.opacity = "1";
  } else {
    iframe.style.opacity = "0";
    iframe.style.transition = "opacity 0.3s ease";
  }

  if (loading) {
    contentParent.appendChild(loading);
  }
  contentParent.appendChild(iframe);

  let isReady = Boolean(claimed?.wasReady);
  let lastAuthToken = getCachedAuthToken(researchId);

  const replayOpenCallbacks = () => {
    if (!isReady) return;

    const currentConfig = getConfig();
    currentConfig.onReady?.();
    const cachedToken = lastAuthToken ?? getCachedAuthToken(researchId);
    if (cachedToken) {
      currentConfig.onAuth?.({ researchId, token: cachedToken });
    }
  };

  const cleanupMessageListener = setupMessageListener(
    researchId,
    {
      get onReady() {
        return () => {
          isReady = true;
          if (loading) {
            loading.style.opacity = "0";
            iframe.style.opacity = "1";
            const element = loading;
            setTimeout(() => element.remove(), 300);
            loading = null;
          }
          getConfig().onReady?.();
        };
      },
      get onSubmit() {
        return isOpen() ? getConfig().onSubmit : undefined;
      },
      get onNavigate() {
        return isOpen() ? getConfig().onNavigate : noopNavigate;
      },
      get onClose() {
        return onClose;
      },
      get onAuth() {
        return ({ token }: { researchId: string; token: string }) => {
          lastAuthToken = token;
          getConfig().onAuth?.({ researchId, token });
        };
      },
      get onError() {
        return isOpen() ? getConfig().onError : undefined;
      },
    },
    iframe,
    host,
    {
      skipResize: true,
      hasCloseButton: options.hasCloseButton ?? true,
      isActive: isOpen,
    }
  );

  const unregisterIframe = registerIframe(iframe, host);

  if (claimed?.wasReady) {
    // Re-send init with correct hasCloseButton — preload sent it with false
    sendMessage(iframe, host, {
      type: MESSAGE_TYPES.init,
      version: SDK_VERSION,
      features: CURRENT_FEATURES,
      researchId,
      hasCloseButton: options.hasCloseButton ?? true,
    });
    replayOpenCallbacks();
  }

  return {
    iframe,
    cleanup: () => {
      cleanupMessageListener();
      unregisterIframe();
    },
    replayOpenCallbacks,
    reuseSignature,
  };
}
