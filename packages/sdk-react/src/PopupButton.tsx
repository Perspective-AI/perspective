import {
  useRef,
  useCallback,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
  type ButtonHTMLAttributes,
  type RefObject,
} from "react";
import {
  openPopup,
  type EmbedConfig,
  type EmbedHandle,
} from "@perspective-ai/sdk";
import { useStableCallback } from "./hooks/useStableCallback";

/** Handle for programmatic control of popup button */
export interface PopupButtonHandle {
  open: () => void;
  close: () => void;
  toggle: () => void;
  unmount: () => void;
  readonly isOpen: boolean;
  readonly researchId: string;
}

export interface PopupButtonProps
  extends
    Omit<EmbedConfig, "type">,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onError" | "onSubmit"> {
  /** Button content */
  children: ReactNode;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Ref to access the handle for programmatic control */
  embedRef?: RefObject<PopupButtonHandle | null>;
}

/**
 * Button that opens a popup modal when clicked.
 * Supports both controlled and uncontrolled modes.
 */
export function PopupButton({
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
  children,
  open,
  onOpenChange,
  embedRef,
  onClick,
  ...buttonProps
}: PopupButtonProps) {
  const handleRef = useRef<EmbedHandle | null>(null);
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

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
    setOpen(false);
    onClose?.();
  }, [setOpen, onClose]);

  const stableOnClose = useStableCallback(handleClose);

  const createPopup = useCallback(() => {
    if (handleRef.current) return handleRef.current;

    const handle = openPopup({
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

    handleRef.current = handle;
    return handle;
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

  const proxyHandle = useMemo<PopupButtonHandle>(
    () => ({
      open: () => {
        createPopup();
        setOpen(true);
      },
      close: () => {
        handleRef.current?.destroy();
        handleRef.current = null;
        setOpen(false);
      },
      toggle: () => {
        if (handleRef.current) {
          handleRef.current.destroy();
          handleRef.current = null;
          setOpen(false);
        } else {
          createPopup();
          setOpen(true);
        }
      },
      unmount: () => {
        handleRef.current?.unmount();
        handleRef.current = null;
        setOpen(false);
      },
      get isOpen() {
        return isOpen;
      },
      researchId,
    }),
    [createPopup, setOpen, researchId, isOpen]
  );

  useEffect(() => {
    if (embedRef) {
      embedRef.current = proxyHandle;
    }
    return () => {
      if (embedRef) {
        embedRef.current = null;
      }
    };
  }, [embedRef, proxyHandle]);

  useEffect(() => {
    if (!isControlled) return;

    if (open && !handleRef.current) {
      createPopup();
    } else if (!open && handleRef.current) {
      handleRef.current.destroy();
      handleRef.current = null;
    }
  }, [open, isControlled, createPopup]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;

      if (isOpen && handleRef.current) {
        handleRef.current.destroy();
        handleRef.current = null;
        setOpen(false);
      } else {
        createPopup();
        setOpen(true);
      }
    },
    [onClick, isOpen, createPopup, setOpen]
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid="perspective-popup-button"
      {...buttonProps}
    >
      {children}
    </button>
  );
}
