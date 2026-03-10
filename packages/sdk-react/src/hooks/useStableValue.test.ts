import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@perspective-ai/sdk", () => ({
  stableSerialize: (value: unknown) =>
    JSON.stringify(value, (_key, currentValue) => {
      if (
        currentValue !== null &&
        typeof currentValue === "object" &&
        !Array.isArray(currentValue)
      ) {
        return Object.keys(currentValue as Record<string, unknown>)
          .sort()
          .reduce<Record<string, unknown>>((result, key) => {
            result[key] = (currentValue as Record<string, unknown>)[key];
            return result;
          }, {});
      }

      return currentValue;
    }),
}));

import { useStableValue } from "./useStableValue";

describe("useStableValue", () => {
  it("returns the same reference for deeply equal objects", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useStableValue(value),
      { initialProps: { value: { a: 1, b: "test" } } }
    );

    const first = result.current;

    rerender({ value: { a: 1, b: "test" } });

    expect(result.current).toBe(first);
  });

  it("returns new reference when value changes", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useStableValue(value),
      { initialProps: { value: { a: 1 } } }
    );

    const first = result.current;

    rerender({ value: { a: 2 } });

    expect(result.current).not.toBe(first);
    expect(result.current).toEqual({ a: 2 });
  });

  it("ignores object key order differences", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useStableValue(value),
      {
        initialProps: {
          value: {
            dark: { secondary: "#222", primary: "#111" },
            light: { secondary: "#eee", primary: "#fff" },
          },
        },
      }
    );

    const first = result.current;

    rerender({
      value: {
        light: { primary: "#fff", secondary: "#eee" },
        dark: { primary: "#111", secondary: "#222" },
      },
    });

    expect(result.current).toBe(first);
  });

  it("handles undefined values", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useStableValue(value),
      {
        initialProps: {
          value: undefined as Record<string, unknown> | undefined,
        },
      }
    );

    expect(result.current).toBeUndefined();

    rerender({ value: undefined });

    expect(result.current).toBeUndefined();
  });

  it("handles primitive values", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useStableValue(value),
      { initialProps: { value: "hello" } }
    );

    const first = result.current;

    rerender({ value: "hello" });
    expect(result.current).toBe(first);

    rerender({ value: "world" });
    expect(result.current).toBe("world");
  });

  it("handles arrays with nested objects", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useStableValue(value),
      {
        initialProps: {
          value: [{ b: 2, a: 1 }, { items: ["x", "y"] }],
        },
      }
    );

    const first = result.current;

    rerender({
      value: [{ a: 1, b: 2 }, { items: ["x", "y"] }],
    });

    expect(result.current).toBe(first);
  });
});
