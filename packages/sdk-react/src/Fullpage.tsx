import { useRef, useEffect, type RefObject } from "react";
import {
  createFullpage,
  type EmbedConfig,
  type EmbedHandle,
} from "@perspective-ai/sdk";
import { useStableCallback } from "./hooks/useStableCallback";

export interface FullpageProps extends Omit<EmbedConfig, "type"> {
  /** Ref to access the embed handle for programmatic control */
  embedRef?: RefObject<EmbedHandle | null>;
}

/**
 * Full viewport embed component.
 * Takes over the entire screen with the interview.
 */
export function Fullpage({
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
}: FullpageProps) {
  const handleRef = useRef<EmbedHandle | null>(null);

  // Stable callbacks
  const stableOnReady = useStableCallback(onReady);
  const stableOnSubmit = useStableCallback(onSubmit);
  const stableOnNavigate = useStableCallback(onNavigate);
  const stableOnClose = useStableCallback(onClose);
  const stableOnError = useStableCallback(onError);

  useEffect(() => {
    const handle = createFullpage({
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

  // This component doesn't render anything - the fullpage overlay is added to document.body
  return null;
}
