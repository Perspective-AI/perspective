import { useCallback, useState, useEffect, useRef } from "react";
import {
  createFloatBubble,
  type EmbedConfig,
  type FloatHandle,
} from "@perspective-ai/sdk";
import { useStableCallback } from "./useStableCallback";

/** Options for useFloatBubble hook */
export interface UseFloatBubbleOptions extends Omit<EmbedConfig, "type"> {
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
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

  useEffect(() => {
    const newHandle = createFloatBubble({
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
    stableOnReady,
    stableOnSubmit,
    stableOnNavigate,
    stableOnClose,
    stableOnError,
  ]);

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
