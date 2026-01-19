import { useRef, useCallback, useLayoutEffect, useEffect } from "react";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T | undefined
): T {
  const callbackRef = useRef(callback);

  useIsomorphicLayoutEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback(
    ((...args: Parameters<T>) => callbackRef.current?.(...args)) as T,
    []
  );
}
