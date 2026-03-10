import { useRef, useEffect, type HTMLAttributes, type RefObject } from "react";
import {
  createWidget,
  type EmbedConfig,
  type EmbedHandle,
} from "@perspective-ai/sdk";
import { useStableCallback } from "./hooks/useStableCallback";
import { useStableValue } from "./hooks/useStableValue";

export interface WidgetProps
  extends
    Omit<EmbedConfig, "type">,
    Omit<HTMLAttributes<HTMLDivElement>, "onError" | "onSubmit"> {
  /** Ref to access the embed handle for programmatic control */
  embedRef?: RefObject<EmbedHandle | null>;
}

/**
 * Inline widget embed component.
 * Renders the interview directly in a container.
 */
export function Widget({
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
  className,
  style,
  ...divProps
}: WidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<EmbedHandle | null>(null);

  // Stable callbacks to avoid re-mounting on callback changes
  const stableParams = useStableValue(params);
  const stableBrand = useStableValue(brand);
  const stableOnReady = useStableCallback(onReady);
  const stableOnSubmit = useStableCallback(onSubmit);
  const stableOnNavigate = useStableCallback(onNavigate);
  const stableOnClose = useStableCallback(onClose);
  const stableOnError = useStableCallback(onError);
  const stableOnAuth = useStableCallback(onAuth);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handle = createWidget(container, {
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

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: 500, ...style }}
      data-testid="perspective-widget"
      {...divProps}
    />
  );
}
