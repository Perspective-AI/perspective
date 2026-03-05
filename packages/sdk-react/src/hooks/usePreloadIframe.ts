import { useEffect, useRef, type RefObject } from "react";
import {
  preloadIframe,
  destroyPreloadedByType,
  getHost,
  type EmbedType,
  type BrandColors,
  type ThemeValue,
} from "@perspective-ai/sdk";

/** Return a stable reference for a JSON-serializable value. */
function useStableValue<T>(value: T): T {
  const ref = useRef(value);
  const serialized = JSON.stringify(value);
  const prevSerialized = useRef(serialized);

  if (serialized !== prevSerialized.current) {
    ref.current = value;
    prevSerialized.current = serialized;
  }

  return ref.current;
}

/**
 * Preload an iframe on mount so the first open is instant.
 * Skips preloading if a live handle already exists.
 * Cleans up the preloaded iframe on unmount (if unclaimed).
 */
export function usePreloadIframe(
  type: EmbedType,
  researchId: string,
  host: string | undefined,
  handleRef: RefObject<unknown>,
  params?: Record<string, string>,
  brand?: { light?: BrandColors; dark?: BrandColors },
  theme?: ThemeValue
): void {
  const stableParams = useStableValue(params);
  const stableBrand = useStableValue(brand);

  useEffect(() => {
    if (handleRef.current) return;
    const resolvedHost = getHost(host);
    preloadIframe(
      researchId,
      type,
      resolvedHost,
      stableParams,
      stableBrand,
      theme
    );
    return () => {
      // Safe no-op if already claimed by openPopup/openSlider/openFloat
      if (!handleRef.current) destroyPreloadedByType(researchId, type);
    };
  }, [type, researchId, host, stableParams, stableBrand, theme, handleRef]);
}
