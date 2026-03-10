import type { EmbedConfig, ToggleableHandle } from "./types";
import { removeTimer } from "./timing";
import { getReusableEmbedSignature } from "./reuse";
import { createEmbedFrameSession } from "./frame-session";

type ToggleableType = "popup" | "slider";

export interface ToggleableDomController {
  container: HTMLElement | null;
  contentParent: HTMLElement;
  show: () => void;
  hide: () => void;
  remove: () => void;
  bindCloseHandlers: (requestClose: () => void) => () => void;
  setCloseEnabled?: (enabled: boolean) => void;
  loadingStyle?: (loading: HTMLElement) => void;
}

export function createNoOpToggleableHandle(
  researchId: string,
  type: ToggleableType
): ToggleableHandle {
  return {
    unmount: () => {},
    update: () => {},
    destroy: () => {},
    show: () => {},
    hide: () => {},
    canReuse: () => false,
    replayOpenCallbacks: () => {},
    isOpen: false,
    researchId,
    type,
    iframe: null,
    container: null,
  };
}

export function createToggleableEmbed(
  config: EmbedConfig & { _startHidden?: boolean },
  type: ToggleableType,
  dom: ToggleableDomController,
  host: string,
  options?: {
    persistOpenState?: (open: boolean) => void;
  }
): ToggleableHandle {
  const { researchId, _startHidden } = config;
  const persistOpenState = options?.persistOpenState;
  let currentConfig = { ...config };
  let isOpen = !_startHidden;

  const escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") requestClose();
  };

  const hide = () => {
    if (!isOpen) return;
    isOpen = false;
    persistOpenState?.(false);
    dom.hide();
    document.removeEventListener("keydown", escHandler);
    currentConfig.onClose?.();
  };

  const syncCloseAffordances = () => {
    const closeEnabled = !currentConfig.disableClose;
    dom.setCloseEnabled?.(closeEnabled);

    if (!isOpen) return;

    if (closeEnabled) {
      document.addEventListener("keydown", escHandler);
    } else {
      document.removeEventListener("keydown", escHandler);
    }
  };

  const requestClose = () => {
    if (currentConfig.disableClose) return;
    hide();
  };

  if (_startHidden) {
    dom.hide();
  } else {
    persistOpenState?.(true);
  }
  syncCloseAffordances();

  const frameSession = createEmbedFrameSession({
    config,
    type,
    host,
    contentParent: dom.contentParent,
    getConfig: () => currentConfig,
    isOpen: () => isOpen,
    onClose: hide,
    loadingStyle: dom.loadingStyle,
    hasCloseButton: !currentConfig.disableClose,
  });

  const show = () => {
    if (isOpen) return;
    isOpen = true;
    persistOpenState?.(true);
    dom.show();
    syncCloseAffordances();
  };

  const cleanupCloseHandlers = dom.bindCloseHandlers(requestClose);

  if (!_startHidden && !currentConfig.disableClose) {
    document.addEventListener("keydown", escHandler);
  }

  const teardown = () => {
    const wasOpen = isOpen;
    isOpen = false;
    cleanupCloseHandlers();
    frameSession.cleanup();
    dom.remove();
    document.removeEventListener("keydown", escHandler);
    removeTimer(researchId);
    if (wasOpen) currentConfig.onClose?.();
  };

  const destroy = () => {
    persistOpenState?.(false);
    teardown();
  };

  return {
    unmount: teardown,
    update: (options: Parameters<ToggleableHandle["update"]>[0]) => {
      const previousDisableClose = Boolean(currentConfig.disableClose);
      currentConfig = { ...currentConfig, ...options };
      if (previousDisableClose !== Boolean(currentConfig.disableClose)) {
        syncCloseAffordances();
      }
    },
    destroy,
    show,
    hide,
    canReuse: (nextConfig: EmbedConfig) =>
      getReusableEmbedSignature(nextConfig) === frameSession.reuseSignature,
    replayOpenCallbacks: frameSession.replayOpenCallbacks,
    get isOpen() {
      return isOpen;
    },
    researchId,
    type,
    iframe: frameSession.iframe,
    container: dom.container,
  };
}
