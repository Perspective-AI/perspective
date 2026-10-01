import { useEffect, useLayoutEffect } from "react";

/** useLayoutEffect in the browser, useEffect (a no-op) during SSR. */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
