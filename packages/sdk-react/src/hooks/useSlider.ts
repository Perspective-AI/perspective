"use client";
import { useCallback, useState, useEffect, useRef } from "react";
import {
  getPersistedOpenState,
  openSlider,
  type EmbedConfig,
  type EmbedHandle,
} from "@perspective-ai/sdk";
import { useStableCallback } from "./useStableCallback";
import { useEmbedConfig } from "./useEmbedConfig";

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
    disableClose,
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
  const embedConfig = useEmbedConfig(researchId, host);
  const embedConfigRef = useRef(embedConfig);
  embedConfigRef.current = embedConfig;

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
      disableClose,
      _apiConfig: embedConfigRef.current,
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
    disableClose,
    stableOnReady,
    stableOnSubmit,
    stableOnNavigate,
    stableOnClose,
    stableOnError,
  ]);

  const destroySlider = useCallback((mode: "destroy" | "unmount") => {
    if (handleRef.current) {
      if (mode === "destroy") {
        handleRef.current.destroy();
      } else {
        handleRef.current.unmount();
      }
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
      destroySlider("destroy");
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

  useEffect(() => {
    if (!isControlled) return;

    if (controlledOpen && !handleRef.current) {
      createSlider();
    } else if (!controlledOpen && handleRef.current) {
      destroySlider("destroy");
    }
  }, [controlledOpen, isControlled, createSlider, destroySlider]);

  useEffect(() => {
    if (isControlled || handleRef.current) return;

    if (getPersistedOpenState({ researchId, type: "slider", host }) !== true) {
      return;
    }

    createSlider();
    setInternalOpen(true);
  }, [createSlider, host, isControlled, researchId]);

  useEffect(() => {
    return () => {
      if (handleRef.current) {
        handleRef.current.unmount();
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
