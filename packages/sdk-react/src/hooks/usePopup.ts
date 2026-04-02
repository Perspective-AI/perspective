import { useCallback, useState, useEffect, useRef } from "react";
import {
  getPersistedOpenState,
  fetchEmbedConfig,
  openPopup,
  type EmbedConfig,
  type EmbedHandle,
} from "@perspective-ai/sdk";
import { useStableCallback } from "./useStableCallback";
import { useEmbedConfig } from "./useEmbedConfig";

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

  const createPopup = useCallback(async () => {
    if (handleRef.current) return handleRef.current;

    // Ensure config is loaded before creating (API wins)
    const config =
      embedConfigRef.current ?? (await fetchEmbedConfig(researchId, host));

    const newHandle = openPopup({
      researchId,
      params,
      brand,
      theme,
      host,
      disableClose,
      _apiConfig: config,
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

  const destroyPopup = useCallback((mode: "destroy" | "unmount") => {
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
      createPopup();
      setInternalOpen(true);
    }
  }, [isControlled, onOpenChange, createPopup]);

  const closeFn = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(false);
    } else {
      destroyPopup("destroy");
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
      destroyPopup("destroy");
    }
  }, [controlledOpen, isControlled, createPopup, destroyPopup]);

  useEffect(() => {
    if (isControlled || handleRef.current) return;

    if (getPersistedOpenState({ researchId, type: "popup", host }) !== true) {
      return;
    }

    createPopup();
    setInternalOpen(true);
  }, [createPopup, host, isControlled, researchId]);

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
