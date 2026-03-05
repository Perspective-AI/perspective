import { useCallback, useState, useEffect, useRef } from "react";
import {
  openSlider,
  type EmbedConfig,
  type EmbedHandle,
} from "@perspective-ai/sdk";
import { usePreloadIframe } from "./usePreloadIframe";
import { useStableCallback } from "./useStableCallback";

/** Options for useSlider hook */
export interface UseSliderOptions extends Omit<EmbedConfig, "type"> {
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

/** Return type for useSlider hook */
export interface UseSliderReturn {
  /** Open the slider */
  open: () => void;
  /** Close the slider */
  close: () => void;
  /** Toggle the slider */
  toggle: () => void;
  /** Whether the slider is currently open */
  isOpen: boolean;
  /** The underlying SDK handle (null when closed) */
  handle: EmbedHandle | null;
}

/**
 * Headless hook for programmatic slider control.
 * Use this when you need custom trigger elements or programmatic control.
 *
 * @example
 * ```tsx
 * const { open, isOpen } = useSlider({ researchId: "abc" });
 * <MyCustomButton onClick={open}>Give Feedback</MyCustomButton>
 * ```
 */
export function useSlider(options: UseSliderOptions): UseSliderReturn {
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

  const [handle, setHandle] = useState<EmbedHandle | null>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const handleRef = useRef<EmbedHandle | null>(null);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const stableOnReady = useStableCallback(onReady);
  const stableOnSubmit = useStableCallback(onSubmit);
  const stableOnNavigate = useStableCallback(onNavigate);
  const stableOnError = useStableCallback(onError);

  const setOpen = useCallback(
    (value: boolean) => {
      if (isControlled) {
        onOpenChange?.(value);
      } else {
        setInternalOpen(value);
      }
    },
    [isControlled, onOpenChange]
  );

  const handleClose = useCallback(() => {
    handleRef.current = null;
    setHandle(null);
    setOpen(false);
    onClose?.();
  }, [setOpen, onClose]);

  const stableOnClose = useStableCallback(handleClose);

  const createSlider = useCallback(() => {
    if (handleRef.current) return handleRef.current;

    const newHandle = openSlider({
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
    return newHandle;
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

  const destroySlider = useCallback(() => {
    if (handleRef.current) {
      handleRef.current.destroy();
      handleRef.current = null;
      setHandle(null);
    }
  }, []);

  const openFn = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(true);
    } else {
      createSlider();
      setInternalOpen(true);
    }
  }, [isControlled, onOpenChange, createSlider]);

  const closeFn = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(false);
    } else {
      destroySlider();
      setInternalOpen(false);
    }
  }, [isControlled, onOpenChange, destroySlider]);

  const toggleFn = useCallback(() => {
    if (isOpen) {
      closeFn();
    } else {
      openFn();
    }
  }, [isOpen, openFn, closeFn]);

  usePreloadIframe("slider", researchId, host, handleRef, params, brand, theme);

  useEffect(() => {
    if (!isControlled) return;

    if (controlledOpen && !handleRef.current) {
      createSlider();
    } else if (!controlledOpen && handleRef.current) {
      destroySlider();
    }
  }, [controlledOpen, isControlled, createSlider, destroySlider]);

  useEffect(() => {
    return () => {
      if (handleRef.current) {
        handleRef.current.destroy();
        handleRef.current = null;
      }
    };
  }, []);

  return {
    open: openFn,
    close: closeFn,
    toggle: toggleFn,
    isOpen,
    handle,
  };
}
