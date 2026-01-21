import { useCallback, useState, useEffect, useRef } from "react";
import {
  openPopup,
  type EmbedConfig,
  type EmbedHandle,
} from "@perspective-ai/sdk";
import { useStableCallback } from "./useStableCallback";

/** Options for usePopup hook */
export interface UsePopupOptions extends Omit<EmbedConfig, "type"> {
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

/** Return type for usePopup hook */
export interface UsePopupReturn {
  /** Open the popup */
  open: () => void;
  /** Close the popup */
  close: () => void;
  /** Toggle the popup */
  toggle: () => void;
  /** Whether the popup is currently open */
  isOpen: boolean;
  /** The underlying SDK handle (null when closed) */
  handle: EmbedHandle | null;
}

/**
 * Headless hook for programmatic popup control.
 * Use this when you need custom trigger elements or programmatic control.
 *
 * @example
 * ```tsx
 * // Basic usage with custom trigger
 * const { open, isOpen } = usePopup({ researchId: "abc" });
 * <MyCustomButton onClick={open}>Open Survey</MyCustomButton>
 *
 * // Controlled mode
 * const [isOpen, setIsOpen] = useState(false);
 * const popup = usePopup({
 *   researchId: "abc",
 *   open: isOpen,
 *   onOpenChange: setIsOpen
 * });
 * ```
 */
export function usePopup(options: UsePopupOptions): UsePopupReturn {
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

  const createPopup = useCallback(() => {
    if (handleRef.current) return handleRef.current;

    const newHandle = openPopup({
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

  const destroyPopup = useCallback(() => {
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
      createPopup();
      setInternalOpen(true);
    }
  }, [isControlled, onOpenChange, createPopup]);

  const closeFn = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(false);
    } else {
      destroyPopup();
      setInternalOpen(false);
    }
  }, [isControlled, onOpenChange, destroyPopup]);

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
      createPopup();
    } else if (!controlledOpen && handleRef.current) {
      destroyPopup();
    }
  }, [controlledOpen, isControlled, createPopup, destroyPopup]);

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
