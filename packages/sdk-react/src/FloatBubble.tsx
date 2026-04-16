"use client";
import { useEffect, type RefObject } from "react";
import { type EmbedConfig, type FloatHandle } from "@perspective-ai/sdk";
import {
  useFloatBubble,
  type LauncherConfigReact,
} from "./hooks/useFloatBubble";

export interface FloatBubbleProps extends Omit<
  EmbedConfig,
  "type" | "launcher"
> {
  /** Ref to access the handle for programmatic control */
  embedRef?: RefObject<FloatHandle | null>;
  /** Customize the floating launcher button appearance */
  launcher?: LauncherConfigReact;
}

/**
 * Floating bubble widget that expands into a chat window.
 * This is a convenience wrapper around useFloatBubble hook.
 *
 * @example
 * ```tsx
 * <FloatBubble researchId="abc" onSubmit={handleSubmit} />
 * ```
 */
export function FloatBubble({
  researchId,
  params,
  brand,
  theme,
  host,
  channel,
  welcomeMessage,
  launcher,
  onReady,
  onSubmit,
  onNavigate,
  onClose,
  onError,
  embedRef,
}: FloatBubbleProps) {
  const { handle } = useFloatBubble({
    researchId,
    params,
    brand,
    theme,
    host,
    channel,
    welcomeMessage,
    launcher,
    onReady,
    onSubmit,
    onNavigate,
    onClose,
    onError,
  });

  useEffect(() => {
    if (embedRef) {
      embedRef.current = handle;
    }
    return () => {
      if (embedRef) {
        embedRef.current = null;
      }
    };
  }, [embedRef, handle]);

  return null;
}
