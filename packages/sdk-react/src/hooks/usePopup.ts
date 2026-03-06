import { useCallback, useState, useEffect, useRef } from "react";
import {
  openPopup,
  type EmbedConfig,
  type EmbedHandle,
} from "@perspective-ai/sdk";
import { useStableCallback } from "./useStableCallback";
import { useStableValue } from "./useStableValue";

type PopupHandle = ReturnType<typeof openPopup>;

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
  const handleRef = useRef<PopupHandle | null>(null);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const desiredOpenRef = useRef(isOpen);
  desiredOpenRef.current = isOpen;

  const stableParams = useStableValue(params);
  const stableBrand = useStableValue(brand);

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

  // Called by SDK's hide() via onClose — popup is hidden, not destroyed
  const handleClose = useCallback(() => {
    setHandle(null);
    setOpen(false);
    onClose?.();
  }, [setOpen, onClose]);

  const stableOnClose = useStableCallback(handleClose);

  // Eagerly create popup (hidden) on mount so iframe loads in background.
  // On open, just show() — instant, no iframe reparenting or reload.
  useEffect(() => {
    const newHandle = openPopup({
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
      _startHidden: true,
    });
    handleRef.current = newHandle;
    if (desiredOpenRef.current) {
      newHandle.show();
      setHandle(newHandle);
    }

    return () => {
      newHandle.update({ onClose: undefined });
      newHandle.unmount();
      handleRef.current = null;
      setHandle(null);
    };
  }, [
    researchId,
    stableParams,
    stableBrand,
    host,
    theme,
    stableOnReady,
    stableOnSubmit,
    stableOnNavigate,
    stableOnClose,
    stableOnError,
  ]);

  const openFn = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(true);
    } else {
      handleRef.current?.show();
      setHandle(handleRef.current);
      setInternalOpen(true);
    }
  }, [isControlled, onOpenChange]);

  const closeFn = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(false);
    } else {
      handleRef.current?.hide();
    }
  }, [isControlled, onOpenChange]);

  const toggleFn = useCallback(() => {
    if (isOpen) {
      closeFn();
    } else {
      openFn();
    }
  }, [isOpen, openFn, closeFn]);

  // Controlled mode: show/hide based on controlled state
  useEffect(() => {
    if (!isControlled) return;

    if (controlledOpen && handleRef.current && !handleRef.current.isOpen) {
      handleRef.current.show();
      setHandle(handleRef.current);
    } else if (!controlledOpen && handleRef.current?.isOpen) {
      handleRef.current.hide();
    }
  }, [controlledOpen, isControlled]);

  return {
    open: openFn,
    close: closeFn,
    toggle: toggleFn,
    isOpen,
    handle,
  };
}
