import {
  useCallback,
  useState,
  useEffect,
  useRef,
  useMemo,
  isValidElement,
} from "react";
import type { ReactNode } from "react";
import {
  createFloatBubble,
  type EmbedConfig,
  type FloatHandle,
  type LauncherConfig,
} from "@perspective-ai/sdk";
import { renderToStaticMarkup } from "react-dom/server";
import { useStableCallback } from "./useStableCallback";
import { useEmbedConfig } from "./useEmbedConfig";

/** Launcher config with React support — icon accepts ReactNode in addition to SDK types */
export interface LauncherConfigReact extends Omit<LauncherConfig, "icon"> {
  icon?: LauncherConfig["icon"] | ReactNode;
}

/** Options for useFloatBubble hook */
export interface UseFloatBubbleOptions extends Omit<
  EmbedConfig,
  "type" | "launcher"
> {
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Customize the floating launcher button appearance */
  launcher?: LauncherConfigReact;
}

/** Return type for useFloatBubble hook */
export interface UseFloatBubbleReturn {
  /** Open the float bubble window */
  open: () => void;
  /** Close the float bubble window */
  close: () => void;
  /** Toggle the float bubble window */
  toggle: () => void;
  /** Unmount the float bubble entirely */
  unmount: () => void;
  /** Whether the float bubble window is currently open */
  isOpen: boolean;
  /** The underlying SDK handle (null until mounted) */
  handle: FloatHandle | null;
}

/**
 * Headless hook for float bubble lifecycle management.
 * Creates a floating bubble button that expands into a chat window.
 * The bubble mounts on component mount and unmounts on component unmount.
 *
 * @example
 * ```tsx
 * // Basic usage - bubble mounts on component mount
 * useFloatBubble({ researchId: "abc" });
 *
 * // With programmatic control
 * const { open, close, isOpen } = useFloatBubble({ researchId: "abc" });
 * <button onClick={open}>Open Chat</button>
 * ```
 */
export function useFloatBubble(
  options: UseFloatBubbleOptions
): UseFloatBubbleReturn {
  const {
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
    open: controlledOpen,
    onOpenChange,
  } = options;

  const [handle, setHandle] = useState<FloatHandle | null>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const handleRef = useRef<FloatHandle | null>(null);
  const embedConfig = useEmbedConfig(researchId, host);

  const isControlled = controlledOpen !== undefined;

  const stableOnReady = useStableCallback(onReady);
  const stableOnSubmit = useStableCallback(onSubmit);
  const stableOnNavigate = useStableCallback(onNavigate);
  const stableOnError = useStableCallback(onError);

  const handleClose = useCallback(() => {
    setInternalOpen(false);
    if (isControlled) {
      onOpenChange?.(false);
    }
    onClose?.();
  }, [isControlled, onOpenChange, onClose]);

  const stableOnClose = useStableCallback(handleClose);

  // Resolve ReactNode icons to SVG strings for the core SDK
  const resolvedLauncher = useMemo((): EmbedConfig["launcher"] | undefined => {
    if (!launcher) return undefined;
    const { icon, ...rest } = launcher;
    // Filter out falsy ReactNode values (e.g., `condition && <Icon />` producing `false`)
    if (
      icon === false ||
      icon === null ||
      icon === undefined ||
      icon === 0 ||
      icon === ""
    ) {
      return Object.keys(rest).length > 0 ? rest : undefined;
    }
    if (isValidElement(icon)) {
      return { ...rest, icon: { svg: renderToStaticMarkup(icon) } };
    }
    // Only pass through valid LauncherIcon values to core SDK
    if (icon === "default" || icon === "avatar") {
      return { ...rest, icon: icon as "default" | "avatar" };
    }
    if (typeof icon === "object" && ("url" in icon || "svg" in icon)) {
      return { ...rest, icon: icon as { url: string } | { svg: string } };
    }
    // Unrecognized icon value (truthy primitives, arrays, etc.) — ignore it
    return Object.keys(rest).length > 0 ? rest : undefined;
  }, [launcher]);

  useEffect(() => {
    const newHandle = createFloatBubble({
      researchId,
      params,
      brand,
      theme,
      host,
      channel,
      welcomeMessage,
      launcher: resolvedLauncher,
      onReady: stableOnReady,
      onSubmit: stableOnSubmit,
      onNavigate: stableOnNavigate,
      onClose: stableOnClose,
      onError: stableOnError,
    });

    handleRef.current = newHandle;
    setHandle(newHandle);

    return () => {
      if (handleRef.current === newHandle) {
        newHandle.unmount();
        handleRef.current = null;
        setHandle(null);
      }
    };
  }, [
    researchId,
    params,
    brand,
    theme,
    host,
    channel,
    welcomeMessage,
    resolvedLauncher,
    stableOnReady,
    stableOnSubmit,
    stableOnNavigate,
    stableOnClose,
    stableOnError,
  ]);

  // Update float with API config when it arrives (appearance, launcher, channels, welcome)
  useEffect(() => {
    if (!embedConfig || !handleRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (handleRef.current.update as any)({
      channel: embedConfig.channel ?? embedConfig.allowedChannels ?? undefined,
      welcomeMessage: embedConfig.welcomeMessage,
      _apiConfig: embedConfig,
    });
  }, [embedConfig]);

  useEffect(() => {
    if (!isControlled || !handle) return;

    if (controlledOpen && !handle.isOpen) {
      handle.open();
    } else if (!controlledOpen && handle.isOpen) {
      handle.close();
    }
  }, [controlledOpen, isControlled, handle]);

  const openFn = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(true);
    } else {
      handleRef.current?.open();
      setInternalOpen(true);
    }
  }, [isControlled, onOpenChange]);

  const closeFn = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(false);
    } else {
      handleRef.current?.close();
      setInternalOpen(false);
    }
  }, [isControlled, onOpenChange]);

  const toggleFn = useCallback(() => {
    const currentlyOpen = handleRef.current?.isOpen ?? internalOpen;
    if (currentlyOpen) {
      closeFn();
    } else {
      openFn();
    }
  }, [internalOpen, openFn, closeFn]);

  const unmountFn = useCallback(() => {
    handleRef.current?.unmount();
    handleRef.current = null;
    setHandle(null);
    setInternalOpen(false);
  }, []);

  const isOpen = isControlled
    ? controlledOpen
    : (handle?.isOpen ?? internalOpen);

  return {
    open: openFn,
    close: closeFn,
    toggle: toggleFn,
    unmount: unmountFn,
    isOpen,
    handle,
  };
}
