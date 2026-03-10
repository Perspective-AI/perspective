import {
  useCallback,
  useState,
  useEffect,
  useRef,
  useMemo,
  isValidElement,
  type ReactElement,
} from "react";
import type { ReactNode } from "react";
import {
  createFloatBubble,
  type EmbedConfig,
  type FloatHandle,
  type LauncherConfig,
  stableSerialize,
} from "@perspective-ai/sdk";
import { renderLauncherIconToSvg } from "./renderLauncherIcon";
import { useStableCallback } from "./useStableCallback";
import { useStableValue } from "./useStableValue";

/** Launcher config with React support — icon accepts ReactNode in addition to SDK types */
export interface LauncherConfigReact extends Omit<LauncherConfig, "icon"> {
  icon?: LauncherConfig["icon"] | ReactNode;
}

/** Options for useFloatBubble hook */
export interface UseFloatBubbleOptions extends Omit<
  EmbedConfig,
  "type" | "launcher"
> {
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Customize the floating launcher button appearance */
  launcher?: LauncherConfigReact;
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

type LauncherResolution = {
  launcher: EmbedConfig["launcher"] | undefined;
  reactIcon: ReactElement | null;
};

function useStableReactElement(
  element: ReactElement | null
): ReactElement | null {
  const ref = useRef(element);
  const propsSignature = element ? stableSerialize(element.props) : null;
  const previousPropsSignature = useRef(propsSignature);

  const didChange =
    ref.current?.type !== element?.type ||
    ref.current?.key !== element?.key ||
    previousPropsSignature.current !== propsSignature;

  if (didChange) {
    ref.current = element;
    previousPropsSignature.current = propsSignature;
  }

  return ref.current;
}

function isLauncherIcon(
  icon: LauncherConfigReact["icon"]
): icon is LauncherConfig["icon"] {
  if (icon === "default" || icon === "avatar") {
    return true;
  }

  return Boolean(
    icon &&
    typeof icon === "object" &&
    (("url" in icon && typeof icon.url === "string") ||
      ("svg" in icon && typeof icon.svg === "string"))
  );
}

function resolveLauncherConfig(
  launcher: LauncherConfigReact | undefined
): LauncherResolution {
  if (!launcher) {
    return { launcher: undefined, reactIcon: null };
  }

  const { icon, ...rest } = launcher;
  const baseLauncher: Omit<LauncherConfig, "icon"> | undefined =
    Object.keys(rest).length > 0 ? rest : undefined;

  if (
    icon === false ||
    icon === null ||
    icon === undefined ||
    icon === 0 ||
    icon === ""
  ) {
    return { launcher: baseLauncher, reactIcon: null };
  }

  if (isValidElement(icon)) {
    return { launcher: baseLauncher, reactIcon: icon };
  }

  if (isLauncherIcon(icon)) {
    return { launcher: { ...rest, icon }, reactIcon: null };
  }

  return { launcher: baseLauncher, reactIcon: null };
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
    channel,
    welcomeMessage,
    launcher,
    onReady,
    onSubmit,
    onNavigate,
    onClose,
    onError,
    onAuth,
    open: controlledOpen,
    onOpenChange,
  } = options;

  const [handle, setHandle] = useState<FloatHandle | null>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const handleRef = useRef<FloatHandle | null>(null);

  const isControlled = controlledOpen !== undefined;
  const currentOpen = isControlled
    ? controlledOpen
    : (handleRef.current?.isOpen ?? internalOpen);
  const openStateRef = useRef(Boolean(currentOpen));
  openStateRef.current = Boolean(currentOpen);

  const stableParams = useStableValue(params);
  const stableBrand = useStableValue(brand);
  const rawReactLauncherIcon =
    launcher && isValidElement(launcher.icon) ? launcher.icon : null;
  const stableLauncher = useStableValue(
    launcher
      ? {
          ...launcher,
          icon: rawReactLauncherIcon ? undefined : launcher.icon,
        }
      : undefined
  );
  const stableReactLauncherIcon = useStableReactElement(rawReactLauncherIcon);

  const stableOnReady = useStableCallback(onReady);
  const stableOnSubmit = useStableCallback(onSubmit);
  const stableOnNavigate = useStableCallback(onNavigate);
  const stableOnError = useStableCallback(onError);
  const stableOnAuth = useStableCallback(onAuth);
  const launcherResolution = useMemo(
    () =>
      resolveLauncherConfig(
        stableReactLauncherIcon
          ? { ...stableLauncher, icon: stableReactLauncherIcon }
          : stableLauncher
      ),
    [stableLauncher, stableReactLauncherIcon]
  );
  const baseLauncher = launcherResolution.launcher;
  const reactLauncherIcon = launcherResolution.reactIcon;
  const [resolvedLauncher, setResolvedLauncher] = useState<
    EmbedConfig["launcher"] | undefined
  >(launcherResolution.launcher);

  const handleClose = useCallback(() => {
    setInternalOpen(false);
    if (isControlled) {
      onOpenChange?.(false);
    }
    onClose?.();
  }, [isControlled, onOpenChange, onClose]);

  const stableOnClose = useStableCallback(handleClose);

  useEffect(() => {
    let cancelled = false;

    setResolvedLauncher(baseLauncher);

    if (!reactLauncherIcon) {
      return;
    }

    void renderLauncherIconToSvg(reactLauncherIcon)
      .then((svg) => {
        if (cancelled) return;
        setResolvedLauncher({
          ...baseLauncher,
          icon: { svg },
        });
      })
      .catch(() => {
        if (cancelled) return;
        setResolvedLauncher(baseLauncher);
      });

    return () => {
      cancelled = true;
    };
  }, [baseLauncher, reactLauncherIcon]);

  useEffect(() => {
    // Preserve the visible/open state if the float handle is recreated because
    // an iframe-defining input changed.
    const shouldStartOpen = openStateRef.current;
    const newHandle = createFloatBubble({
      researchId,
      params: stableParams,
      brand: stableBrand,
      theme,
      host,
      channel,
      welcomeMessage,
      launcher: resolvedLauncher,
      onReady: stableOnReady,
      onSubmit: stableOnSubmit,
      onNavigate: stableOnNavigate,
      onClose: stableOnClose,
      onError: stableOnError,
      onAuth: stableOnAuth,
    });

    if (shouldStartOpen) {
      newHandle.open();
    }

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
    stableParams,
    stableBrand,
    theme,
    host,
    channel,
    welcomeMessage,
    resolvedLauncher,
    stableOnReady,
    stableOnSubmit,
    stableOnNavigate,
    stableOnClose,
    stableOnError,
    stableOnAuth,
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
