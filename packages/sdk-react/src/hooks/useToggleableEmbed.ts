import { useCallback, useEffect, useRef, useState } from "react";
import {
  getPersistedOpenState,
  type EmbedConfig,
  type EmbedHandle,
} from "@perspective-ai/sdk";
import { useStableCallback } from "./useStableCallback";
import { useStableValue } from "./useStableValue";

type ToggleableSdkHandle = EmbedHandle & {
  show: () => void;
  hide: () => void;
  readonly isOpen: boolean;
};

type CreateToggleableHandle = (
  config: EmbedConfig & { _startHidden?: boolean }
) => ToggleableSdkHandle;

export interface UseToggleableEmbedOptions extends Omit<EmbedConfig, "type"> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface UseToggleableEmbedReturn {
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: boolean;
  handle: EmbedHandle | null;
}

export function useToggleableEmbed(
  options: UseToggleableEmbedOptions,
  createHandle: CreateToggleableHandle,
  type: "popup" | "slider"
): UseToggleableEmbedReturn {
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
    onAuth,
    channel,
    welcomeMessage,
    open: controlledOpen,
    onOpenChange,
  } = options;

  const isControlled = controlledOpen !== undefined;
  const [handle, setHandle] = useState<EmbedHandle | null>(null);
  const [internalOpen, setInternalOpen] = useState(
    () =>
      !isControlled &&
      getPersistedOpenState({ researchId, type, host }) === true
  );
  const handleRef = useRef<ToggleableSdkHandle | null>(null);

  const isOpen = isControlled ? controlledOpen : internalOpen;
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const stableParams = useStableValue(params);
  const stableBrand = useStableValue(brand);

  const stableOnReady = useStableCallback(onReady);
  const stableOnSubmit = useStableCallback(onSubmit);
  const stableOnNavigate = useStableCallback(onNavigate);
  const stableOnError = useStableCallback(onError);
  const stableOnAuth = useStableCallback(onAuth);

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

  const teardownHandle = useCallback(
    (targetHandle: ToggleableSdkHandle | null = handleRef.current) => {
      if (!targetHandle) return;

      targetHandle.update({ onClose: undefined });
      targetHandle.unmount();

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

  const createEmbedHandle = useCallback(
    (startHidden: boolean) =>
      createHandle({
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
        onAuth: stableOnAuth,
        channel,
        welcomeMessage,
        _startHidden: startHidden,
      }),
    [
      channel,
      createHandle,
      host,
      researchId,
      stableBrand,
      stableOnAuth,
      stableOnClose,
      stableOnError,
      stableOnNavigate,
      stableOnReady,
      stableOnSubmit,
      stableParams,
      theme,
      welcomeMessage,
    ]
  );

  const setEmbedHandle = useCallback(
    (startHidden: boolean) => {
      const newHandle = createEmbedHandle(startHidden);
      handleRef.current = newHandle;
      setHandle(newHandle);
      return newHandle;
    },
    [createEmbedHandle]
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
    const nextHandle = setEmbedHandle(!isOpenRef.current);

    return () => {
      if (handleRef.current === nextHandle) {
        teardownHandle(nextHandle);
      }
    };
  }, [setEmbedHandle, teardownHandle]);

  const ensureHandle = useCallback(() => {
    if (handleRef.current) return handleRef.current;

    return setEmbedHandle(false);
  }, [setEmbedHandle]);

  const open = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(true);
    } else {
      ensureHandle().show();
      setInternalOpen(true);
    }
  }, [ensureHandle, isControlled, onOpenChange]);

  const close = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(false);
    } else {
      handleRef.current?.hide();
      setInternalOpen(false);
    }
  }, [isControlled, onOpenChange]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [close, isOpen, open]);

  return {
    open,
    close,
    toggle,
    isOpen,
    handle,
  };
}
