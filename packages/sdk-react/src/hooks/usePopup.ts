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
  /** The underlying SDK handle (created on mount; may be null during initial render) */
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
  const initialHiddenRef = useRef(!isOpen);

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

  const destroyPopup = useCallback(
    (targetHandle: PopupHandle | null = handleRef.current) => {
      if (!targetHandle) return;

      targetHandle.update({ onClose: undefined });
      targetHandle.destroy();

      if (handleRef.current === targetHandle) {
        handleRef.current = null;
        setHandle(null);
      }
    },
    []
  );

  const handleClose = useCallback(() => {
    setOpen(false);
    onClose?.();
  }, [setOpen, onClose]);

  const stableOnClose = useStableCallback(handleClose);

  const createPopupHandle = useCallback(
    (startHidden: boolean) =>
      openPopup({
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
        _startHidden: startHidden,
      }),
    [
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
    ]
  );

  const setPopupHandle = useCallback(
    (startHidden: boolean) => {
      const newHandle = createPopupHandle(startHidden);
      handleRef.current = newHandle;
      setHandle(newHandle);
      return newHandle;
    },
    [createPopupHandle]
  );

  useEffect(() => {
    const currentHandle = handleRef.current;
    if (!currentHandle) return;

    if (isOpen) {
      currentHandle.show();
    } else {
      currentHandle.hide();
    }
  }, [isOpen]);

  useEffect(() => {
    // Stable callback/value wrappers are part of this hook's contract.
    // When any iframe-defining input changes, recreate the underlying embed.
    const nextHandle = setPopupHandle(
      handleRef.current ? !handleRef.current.isOpen : initialHiddenRef.current
    );

    return () => {
      if (handleRef.current === nextHandle) {
        destroyPopup(nextHandle);
      }
    };
  }, [destroyPopup, setPopupHandle]);

  const ensurePopup = useCallback(() => {
    if (handleRef.current) return handleRef.current;

    return setPopupHandle(false);
  }, [setPopupHandle]);

  const openFn = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(true);
    } else {
      ensurePopup().show();
      setInternalOpen(true);
    }
  }, [ensurePopup, isControlled, onOpenChange]);

  const closeFn = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(false);
    } else {
      handleRef.current?.hide();
      setInternalOpen(false);
    }
  }, [isControlled, onOpenChange]);

  const toggleFn = useCallback(() => {
    if (isOpen) {
      closeFn();
    } else {
      openFn();
    }
  }, [isOpen, openFn, closeFn]);

  return {
    open: openFn,
    close: closeFn,
    toggle: toggleFn,
    isOpen,
    handle,
  };
}
