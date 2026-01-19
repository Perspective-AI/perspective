import { useRef, useEffect, type RefObject } from "react";
import {
  createFloatBubble,
  type EmbedConfig,
  type FloatHandle,
} from "@perspective/sdk";
import { useStableCallback } from "./hooks/useStableCallback";

export interface FloatBubbleProps extends Omit<EmbedConfig, "type"> {
  /** Ref to access the handle for programmatic control */
  embedRef?: RefObject<FloatHandle | null>;
}

/**
 * Floating bubble widget that expands into a chat window.
 * Renders a floating button in the corner of the screen.
 */
export function FloatBubble({
  researchId,
  params,
  brand,
  theme,
  host,
  onReady,
  onSubmit,
  onNavigate,
  onClose,
  onError,
  embedRef,
}: FloatBubbleProps) {
  const handleRef = useRef<FloatHandle | null>(null);

  // Stable callbacks
  const stableOnReady = useStableCallback(onReady);
  const stableOnSubmit = useStableCallback(onSubmit);
  const stableOnNavigate = useStableCallback(onNavigate);
  const stableOnClose = useStableCallback(onClose);
  const stableOnError = useStableCallback(onError);

  useEffect(() => {
    const handle = createFloatBubble({
      researchId,
      params,
      brand,
      theme,
      host,
      onReady: stableOnReady,
      onSubmit: stableOnSubmit,
      onNavigate: stableOnNavigate,
      onClose: stableOnClose,
      onError: stableOnError,
    });

    handleRef.current = handle;

    if (embedRef) {
      embedRef.current = handle;
    }

    return () => {
      handle.unmount();
      handleRef.current = null;
      if (embedRef) {
        embedRef.current = null;
      }
    };
  }, [
    researchId,
    params,
    brand,
    theme,
    host,
    stableOnReady,
    stableOnSubmit,
    stableOnNavigate,
    stableOnClose,
    stableOnError,
    embedRef,
  ]);

  // This component doesn't render anything - the bubble is added to document.body
  return null;
}
