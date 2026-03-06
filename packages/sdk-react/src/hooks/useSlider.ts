import { useCallback, useState, useEffect, useRef } from "react";
import {
  openSlider,
  type EmbedConfig,
  type EmbedHandle,
} from "@perspective-ai/sdk";
import { useStableCallback } from "./useStableCallback";
import { useStableValue } from "./useStableValue";

type SliderHandle = ReturnType<typeof openSlider>;

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
  /** The underlying SDK handle (created on mount; may be null during initial render) */
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
  const handleRef = useRef<SliderHandle | null>(null);

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

  const destroySlider = useCallback(
    (targetHandle: SliderHandle | null = handleRef.current) => {
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

  const createSliderHandle = useCallback(
    (startHidden: boolean) =>
      openSlider({
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

  const setSliderHandle = useCallback(
    (startHidden: boolean) => {
      const newHandle = createSliderHandle(startHidden);
      handleRef.current = newHandle;
      setHandle(newHandle);
      return newHandle;
    },
    [createSliderHandle]
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
    const nextHandle = setSliderHandle(
      handleRef.current ? !handleRef.current.isOpen : initialHiddenRef.current
    );

    return () => {
      if (handleRef.current === nextHandle) {
        destroySlider(nextHandle);
      }
    };
  }, [destroySlider, setSliderHandle]);

  const ensureSlider = useCallback(() => {
    if (handleRef.current) return handleRef.current;

    return setSliderHandle(false);
  }, [setSliderHandle]);

  const openFn = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(true);
    } else {
      ensureSlider().show();
      setInternalOpen(true);
    }
  }, [ensureSlider, isControlled, onOpenChange]);

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
