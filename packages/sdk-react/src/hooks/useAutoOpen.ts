import { useEffect, useRef, useState, useCallback } from "react";
import {
  openPopup,
  preloadIframe,
  destroyPreloadedByType,
  setupAutoOpenPopup,
  shouldShow,
  getHost,
} from "@perspective-ai/sdk";
import type { EmbedConfig, TriggerConfig, ShowOnce } from "@perspective-ai/sdk";
import { useStableCallback } from "./useStableCallback";
import { useStableValue } from "./useStableValue";

export interface UseAutoOpenOptions extends Omit<
  EmbedConfig,
  "type" | "autoOpen"
> {
  trigger: TriggerConfig;
  showOnce?: ShowOnce; // default: "session"
}

export interface UseAutoOpenReturn {
  /** Cancel the pending trigger */
  cancel: () => void;
  /** Whether the trigger has fired */
  triggered: boolean;
}

export function useAutoOpen(options: UseAutoOpenOptions): UseAutoOpenReturn {
  const {
    trigger,
    showOnce = "session",
    researchId,
    params,
    brand,
    theme,
    host,
    disableClose,
    onReady,
    onSubmit,
    onNavigate,
    onClose,
    onError,
    onAuth,
    channel,
    welcomeMessage,
  } = options;
  const cleanupRef = useRef<(() => void) | null>(null);
  const [triggered, setTriggered] = useState(false);
  const triggerDelay = trigger.type === "timeout" ? trigger.delay : undefined;
  const stableParams = useStableValue(params);
  const stableBrand = useStableValue(brand);
  const stableOnReady = useStableCallback(onReady);
  const stableOnSubmit = useStableCallback(onSubmit);
  const stableOnNavigate = useStableCallback(onNavigate);
  const stableOnClose = useStableCallback(onClose);
  const stableOnError = useStableCallback(onError);
  const stableOnAuth = useStableCallback(onAuth);
  const stableOpenPopup = useStableCallback(() => {
    openPopup({
      researchId,
      params: stableParams,
      brand: stableBrand,
      theme,
      host,
      disableClose,
      onReady: stableOnReady,
      onSubmit: stableOnSubmit,
      onNavigate: stableOnNavigate,
      onClose: stableOnClose,
      onError: stableOnError,
      onAuth: stableOnAuth,
      channel,
      welcomeMessage,
    });
  });

  useEffect(() => {
    if (triggered || !shouldShow(researchId, showOnce)) return;

    preloadIframe(
      researchId,
      "popup",
      getHost(host),
      stableParams,
      stableBrand,
      theme
    );

    return () => {
      destroyPreloadedByType(researchId, "popup");
    };
  }, [researchId, showOnce, host, stableParams, stableBrand, theme, triggered]);

  useEffect(() => {
    cleanupRef.current = setupAutoOpenPopup({
      trigger,
      showOnce,
      researchId,
      onOpen: stableOpenPopup,
      onTriggered: () => {
        setTriggered(true);
      },
    });

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
    // Primitive deps only — avoids re-triggering on object identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [researchId, trigger.type, triggerDelay, showOnce]);

  const cancel = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    destroyPreloadedByType(researchId, "popup");
  }, [researchId]);

  return { cancel, triggered };
}
