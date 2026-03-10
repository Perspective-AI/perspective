import { useRef, useCallback, useLayoutEffect, useEffect } from "react";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Callback<TArgs extends unknown[], TResult> = (...args: TArgs) => TResult;

export function useStableCallback<TArgs extends unknown[], TResult>(
  callback: Callback<TArgs, TResult>
): Callback<TArgs, TResult>;
export function useStableCallback(callback: undefined): undefined;
export function useStableCallback<TArgs extends unknown[], TResult>(
  callback: Callback<TArgs, TResult> | undefined
): Callback<TArgs, TResult> | undefined;
export function useStableCallback<TArgs extends unknown[], TResult>(
  callback: Callback<TArgs, TResult> | undefined
): Callback<TArgs, TResult> | undefined {
  const callbackRef = useRef<Callback<TArgs, TResult> | undefined>(callback);

  useIsomorphicLayoutEffect(() => {
    callbackRef.current = callback;
  });

  // Always create the stable wrapper (hooks can't be conditional),
  // but return undefined when no callback is provided to preserve
  // truthiness semantics for consumers that branch on it.
  const stable = useCallback((...args: TArgs) => {
    return callbackRef.current?.(...args);
  }, []);

  return callback ? (stable as Callback<TArgs, TResult>) : undefined;
}
