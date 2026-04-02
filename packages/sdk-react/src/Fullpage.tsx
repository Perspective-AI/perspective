import { useRef, useEffect, type RefObject } from "react";
import {
  createFullpage,
  createLoadingIndicator,
  fetchEmbedConfig,
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
    // Show skeleton instantly while config fetches in parallel
    const skeleton = createLoadingIndicator({ theme, brand });
    skeleton.style.position = "fixed";
    skeleton.style.inset = "0";
    skeleton.style.zIndex = "2147483647";
    document.body.appendChild(skeleton);

    let cancelled = false;

    fetchEmbedConfig(researchId, host).then((config) => {
      if (cancelled) return;
      skeleton.remove();

      const handle = createFullpage({
        researchId,
        params,
        brand,
        theme,
        host,
        _apiConfig: config,
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
    });

    return () => {
      cancelled = true;
      skeleton.remove();
      if (handleRef.current) {
        handleRef.current.unmount();
        handleRef.current = null;
      }
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
