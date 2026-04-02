import { useEffect, useRef, useState, useCallback } from "react";
import {
  openPopup,
  fetchEmbedConfig,
  setupTrigger,
  shouldShow,
  markShown,
} from "@perspective-ai/sdk";
import type { EmbedConfig, TriggerConfig, ShowOnce } from "@perspective-ai/sdk";
import { useStableCallback } from "./useStableCallback";
import { useEmbedConfig } from "./useEmbedConfig";

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
  const { trigger, showOnce = "session", researchId, ...embedConfig } = options;
  const cleanupRef = useRef<(() => void) | null>(null);
  const [triggered, setTriggered] = useState(false);
  const triggerDelay = trigger.type === "timeout" ? trigger.delay : undefined;
  const themeConfig = useEmbedConfig(researchId, embedConfig.host);
  const themeConfigRef = useRef(themeConfig);
  themeConfigRef.current = themeConfig;

  // Fix #5: useStableCallback so the trigger always calls with latest config
  const stableOnTrigger = useStableCallback(async () => {
    markShown(researchId, showOnce);
    // Ensure config is loaded before creating popup (API wins even for immediate triggers)
    const config =
      themeConfigRef.current ??
      (await fetchEmbedConfig(researchId, embedConfig.host));
    openPopup({
      researchId,
      ...embedConfig,
      _themeConfig: config,
    });
  });

  useEffect(() => {
    if (!shouldShow(researchId, showOnce)) return;

    cleanupRef.current = setupTrigger(trigger, () => {
      setTriggered((prev) => {
        if (prev) return prev; // already fired
        stableOnTrigger();
        return true;
      });
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
  }, []);

  return { cancel, triggered };
}
