import { useRef } from "react";

function sortObjectKeys(value: unknown): unknown {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = (value as Record<string, unknown>)[key];
        return result;
      }, {});
  }

  return value;
}

/**
 * Returns a referentially stable version of a value.
 * Uses JSON serialization to detect deep equality changes.
 * Useful for object/array deps in useEffect that are recreated each render.
 */
export function useStableValue<T>(value: T): T {
  const ref = useRef(value);
  const serialized = JSON.stringify(value, (_key, currentValue) =>
    sortObjectKeys(currentValue)
  );
  const prevSerialized = useRef(serialized);

  if (prevSerialized.current !== serialized) {
    prevSerialized.current = serialized;
    ref.current = value;
  }

  return ref.current;
}
