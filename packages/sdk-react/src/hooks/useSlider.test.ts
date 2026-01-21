import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useSlider } from "./useSlider";

const mockDestroy = vi.fn();
const mockUnmount = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@perspective-ai/sdk", () => ({
  openSlider: vi.fn(() => ({
    unmount: mockUnmount,
    update: mockUpdate,
    destroy: mockDestroy,
    researchId: "test-research-id",
    type: "slider",
    iframe: null,
    container: null,
  })),
}));

import { openSlider } from "@perspective-ai/sdk";
const mockOpenSlider = vi.mocked(openSlider);

describe("useSlider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("returns open, close, toggle functions and isOpen state", () => {
    const { result } = renderHook(() =>
      useSlider({ researchId: "test-research-id" })
    );

    expect(result.current.open).toBeInstanceOf(Function);
    expect(result.current.close).toBeInstanceOf(Function);
    expect(result.current.toggle).toBeInstanceOf(Function);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.handle).toBeNull();
  });

  it("does not call openSlider on mount", () => {
    renderHook(() => useSlider({ researchId: "test-research-id" }));

    expect(mockOpenSlider).not.toHaveBeenCalled();
  });

  it("calls openSlider when open() is called", () => {
    const { result } = renderHook(() =>
      useSlider({ researchId: "test-research-id" })
    );

    act(() => {
      result.current.open();
    });

    expect(mockOpenSlider).toHaveBeenCalledTimes(1);
    expect(mockOpenSlider).toHaveBeenCalledWith(
      expect.objectContaining({
        researchId: "test-research-id",
      })
    );
  });

  it("sets isOpen to true when open() is called", () => {
    const { result } = renderHook(() =>
      useSlider({ researchId: "test-research-id" })
    );

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("calls destroy and sets isOpen to false when close() is called", () => {
    const { result } = renderHook(() =>
      useSlider({ researchId: "test-research-id" })
    );

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });

    expect(mockDestroy).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(false);
  });

  it("toggles open state", () => {
    const { result } = renderHook(() =>
      useSlider({ researchId: "test-research-id" })
    );

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(true);
    expect(mockOpenSlider).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(false);
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it("cleans up on unmount", () => {
    const { result, unmount } = renderHook(() =>
      useSlider({ researchId: "test-research-id" })
    );

    act(() => {
      result.current.open();
    });

    unmount();

    expect(mockDestroy).toHaveBeenCalled();
  });

  it("makes handle reactive - handle is available after open", () => {
    const { result } = renderHook(() =>
      useSlider({ researchId: "test-research-id" })
    );

    expect(result.current.handle).toBeNull();

    act(() => {
      result.current.open();
    });

    expect(result.current.handle).not.toBeNull();
  });
});
