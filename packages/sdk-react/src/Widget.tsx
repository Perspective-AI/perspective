import {
  useRef,
  useEffect,
  Fragment,
  type HTMLAttributes,
  type RefObject,
} from "react";
import { DiscoveryMetadata } from "./DiscoveryMetadata";
import {
  createWidget,
  createLoadingIndicator,
  fetchEmbedConfig,
  type EmbedConfig,
  type EmbedHandle,
} from "@perspective-ai/sdk";
import { useStableCallback } from "./hooks/useStableCallback";

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
  disableJsonLdAttribution,
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

  // Stable callbacks to avoid re-mounting on callback changes
  const stableOnReady = useStableCallback(onReady);
  const stableOnSubmit = useStableCallback(onSubmit);
  const stableOnNavigate = useStableCallback(onNavigate);
  const stableOnClose = useStableCallback(onClose);
  const stableOnError = useStableCallback(onError);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Show skeleton instantly while config fetches in parallel
    const skeleton = createLoadingIndicator({ theme, brand });
    skeleton.style.position = "relative";
    skeleton.style.minHeight = "500px";
    container.appendChild(skeleton);

    let cancelled = false;

    fetchEmbedConfig(researchId, host).then((config) => {
      if (cancelled) return;
      skeleton.remove();

      const handle = createWidget(container, {
        researchId,
        params,
        brand,
        theme,
        host,
        disableJsonLdAttribution,
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
    disableJsonLdAttribution,
    stableOnReady,
    stableOnSubmit,
    stableOnNavigate,
    stableOnClose,
    stableOnError,
    embedRef,
  ]);

  return (
    <Fragment>
      {!disableJsonLdAttribution && <DiscoveryMetadata />}
      <div
        ref={containerRef}
        className={className}
        style={{ minHeight: 500, ...style }}
        data-testid="perspective-widget"
        {...divProps}
      />
    </Fragment>
  );
}
