import { useRef, useEffect, type RefObject } from "react";
import {
  createFullpage,
  type EmbedConfig,
  type EmbedHandle,
} from "@perspective-ai/sdk";
import { useStableCallback } from "./hooks/useStableCallback";
import { useStableValue } from "./hooks/useStableValue";

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
  onAuth,
  embedRef,
}: FullpageProps) {
  const handleRef = useRef<EmbedHandle | null>(null);

  // Stable callbacks
  const stableParams = useStableValue(params);
  const stableBrand = useStableValue(brand);
  const stableOnReady = useStableCallback(onReady);
  const stableOnSubmit = useStableCallback(onSubmit);
  const stableOnNavigate = useStableCallback(onNavigate);
  const stableOnClose = useStableCallback(onClose);
  const stableOnError = useStableCallback(onError);
  const stableOnAuth = useStableCallback(onAuth);

  useEffect(() => {
    const handle = createFullpage({
      researchId,
      params: stableParams,
      brand: stableBrand,
      theme,
      host,
      onReady: stableOnReady,
      onSubmit: stableOnSubmit,
      onNavigate: stableOnNavigate,
      onClose: stableOnClose,
      onError: stableOnError,
      onAuth: stableOnAuth,
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
    stableParams,
    stableBrand,
    theme,
    host,
    stableOnReady,
    stableOnSubmit,
    stableOnNavigate,
    stableOnClose,
    stableOnError,
    stableOnAuth,
    embedRef,
  ]);

  // This component doesn't render anything - the fullpage overlay is added to document.body
  return null;
}
