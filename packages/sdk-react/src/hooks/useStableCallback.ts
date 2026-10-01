import { useRef, useCallback } from "react";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";

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
  // A wrapper that forwards its arguments has T's signature, which TypeScript
  // can't infer for a generic T.
  /* oxlint-disable typescript/no-unsafe-type-assertion */
  const stable = useCallback(
    (...args: any[]) => callbackRef.current?.(...args),
    []
  ) as NonNullable<T>;
  /* oxlint-enable typescript/no-unsafe-type-assertion */

  return callback ? stable : callback;
}
