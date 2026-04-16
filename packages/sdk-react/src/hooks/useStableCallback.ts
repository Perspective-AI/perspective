import { useRef, useCallback, useLayoutEffect, useEffect } from "react";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function useStableCallback<
  T extends ((...args: any[]) => any) | undefined,
>(callback: T): T {
  const callbackRef = useRef(callback);

  useIsomorphicLayoutEffect(() => {
    callbackRef.current = callback;
  });

  // Always create the stable wrapper (hooks can't be conditional),
  // but return undefined when no callback is provided to preserve
  // truthiness semantics for consumers that branch on it.
  const stable = useCallback(
    ((...args: any[]) => callbackRef.current?.(...args)) as NonNullable<T>,
    []
  );

  return callback ? stable : callback;
}
