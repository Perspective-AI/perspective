import { useRef, useEffect, type HTMLAttributes, type RefObject } from "react";
import {
  createWidget,
  type EmbedConfig,
  type EmbedHandle,
} from "@perspective-ai/sdk";
import { useStableCallback } from "./hooks/useStableCallback";
import { useEmbedConfig } from "./hooks/useEmbedConfig";

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
  embedRef,
  className,
  style,
  ...divProps
}: WidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<EmbedHandle | null>(null);
  const embedConfig = useEmbedConfig(researchId, host);

  // Stable callbacks to avoid re-mounting on callback changes
  const stableOnReady = useStableCallback(onReady);
  const stableOnSubmit = useStableCallback(onSubmit);
  const stableOnNavigate = useStableCallback(onNavigate);
  const stableOnClose = useStableCallback(onClose);
  const stableOnError = useStableCallback(onError);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !embedConfig) return;

    const handle = createWidget(container, {
      researchId,
      params,
      brand,
      theme,
      host,
      _themeConfig: embedConfig,
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
    embedConfig,
    stableOnReady,
    stableOnSubmit,
    stableOnNavigate,
    stableOnClose,
    stableOnError,
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
