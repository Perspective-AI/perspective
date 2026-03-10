import { stableSerialize } from "@perspective-ai/sdk";
import { useRef } from "react";

/**
 * Returns a referentially stable version of a value.
 * Uses JSON serialization to detect deep equality changes.
 * Useful for object/array deps in useEffect that are recreated each render.
 */
export function useStableValue<T>(value: T): T {
  const ref = useRef(value);
  const serialized = stableSerialize(value);
  const prevSerialized = useRef(serialized);

  if (prevSerialized.current !== serialized) {
    prevSerialized.current = serialized;
    ref.current = value;
  }

  return ref.current;
}
