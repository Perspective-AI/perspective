import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStableCallback } from "./useStableCallback";

describe("useStableCallback", () => {
  it("returns a stable function reference", () => {
    const callback = vi.fn();
    const { result, rerender } = renderHook(({ cb }) => useStableCallback(cb), {
      initialProps: { cb: callback },
    });

    const firstRef = result.current;

    // Rerender with same callback
    rerender({ cb: callback });
    expect(result.current).toBe(firstRef);

    // Rerender with new callback
    const newCallback = vi.fn();
    rerender({ cb: newCallback });
    expect(result.current).toBe(firstRef); // Still same reference
  });

  it("calls the latest callback", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const { result, rerender } = renderHook(({ cb }) => useStableCallback(cb), {
      initialProps: { cb: callback1 },
    });

    // Call with first callback
    act(() => {
      result.current("arg1");
    });
    expect(callback1).toHaveBeenCalledWith("arg1");
    expect(callback2).not.toHaveBeenCalled();

    // Update to second callback
    rerender({ cb: callback2 });

    // Call should now use second callback
    act(() => {
      result.current("arg2");
    });
    expect(callback2).toHaveBeenCalledWith("arg2");
    expect(callback1).toHaveBeenCalledTimes(1); // Still only called once
  });

  it("handles undefined callback", () => {
    const { result } = renderHook(() => useStableCallback(undefined));

    // Should not throw when called
    expect(() => {
      act(() => {
        result.current("test");
      });
    }).not.toThrow();
  });

  it("passes through all arguments", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useStableCallback(callback));

    act(() => {
      result.current("a", "b", 123, { key: "value" });
    });

    expect(callback).toHaveBeenCalledWith("a", "b", 123, { key: "value" });
  });

  it("returns the callback's return value", () => {
    const callback = vi.fn().mockReturnValue("result");
    const { result } = renderHook(() => useStableCallback(callback));

    let returnValue: string | undefined;
    act(() => {
      returnValue = result.current();
    });

    expect(returnValue).toBe("result");
  });
});
