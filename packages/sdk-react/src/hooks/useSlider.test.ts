import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useSlider } from "./useSlider";

const mockUnmount = vi.fn();
const mockUpdate = vi.fn();
const mockDestroy = vi.fn();
const mockShow = vi.fn();
const mockHide = vi.fn();

vi.mock("@perspective-ai/sdk", () => ({
  openSlider: vi.fn(
    (config: { onClose?: () => void; _startHidden?: boolean }) => {
      const currentConfig = { ...config };
      let open = !config._startHidden;
      mockUnmount.mockImplementation(() => {
        if (!open) return;
        open = false;
        currentConfig.onClose?.();
      });
      mockUpdate.mockImplementation(
        (options: Partial<{ onClose?: () => void }>) => {
          Object.assign(currentConfig, options);
        }
      );
      mockShow.mockImplementation(() => {
        open = true;
      });
      mockHide.mockImplementation(() => {
        open = false;
        currentConfig.onClose?.();
      });
      return {
        unmount: mockUnmount,
        update: mockUpdate,
        destroy: mockDestroy,
        show: mockShow,
        hide: mockHide,
        get isOpen() {
          return open;
        },
        researchId: "test-research-id",
        type: "slider",
        iframe: null,
        container: null,
      };
    }
  ),
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

  it("eagerly creates slider hidden on mount", () => {
    renderHook(() => useSlider({ researchId: "test-research-id" }));

    expect(mockOpenSlider).toHaveBeenCalledTimes(1);
    expect(mockOpenSlider).toHaveBeenCalledWith(
      expect.objectContaining({
        researchId: "test-research-id",
        _startHidden: true,
      })
    );
  });

  it("shows hidden slider when open() is called", () => {
    const { result } = renderHook(() =>
      useSlider({ researchId: "test-research-id" })
    );

    act(() => {
      result.current.open();
    });

    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(true);
    expect(result.current.handle).not.toBeNull();
  });

  it("calls hide and sets isOpen to false when close() is called", () => {
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

    expect(mockHide).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.handle).toBeNull();
  });

  it("reuses hidden slider on re-open via show()", () => {
    const { result } = renderHook(() =>
      useSlider({ researchId: "test-research-id" })
    );

    act(() => {
      result.current.open();
    });

    act(() => {
      result.current.close();
    });

    act(() => {
      result.current.open();
    });

    expect(mockOpenSlider).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledTimes(2);
    expect(result.current.isOpen).toBe(true);
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
    expect(mockShow).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(false);
    expect(mockHide).toHaveBeenCalledTimes(1);
  });

  it("calls unmount on component unmount", () => {
    const { unmount } = renderHook(() =>
      useSlider({ researchId: "test-research-id" })
    );

    unmount();

    expect(mockUnmount).toHaveBeenCalled();
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

  it("supports controlled mode with open prop", () => {
    const onOpenChange = vi.fn();

    const { rerender } = renderHook(
      ({ open }) =>
        useSlider({
          researchId: "test-research-id",
          open,
          onOpenChange,
        }),
      { initialProps: { open: false } }
    );

    rerender({ open: true });

    expect(mockShow).toHaveBeenCalledTimes(1);

    rerender({ open: false });

    expect(mockHide).toHaveBeenCalledTimes(1);
  });

  it("sets handle in controlled mode when open becomes true", () => {
    const onOpenChange = vi.fn();

    const { result, rerender } = renderHook(
      ({ open }) =>
        useSlider({
          researchId: "test-research-id",
          open,
          onOpenChange,
        }),
      { initialProps: { open: false } }
    );

    expect(result.current.handle).toBeNull();

    rerender({ open: true });

    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(result.current.handle).not.toBeNull();
  });

  it("keeps controlled slider open when recreated while open", () => {
    const onOpenChange = vi.fn();

    const { result, rerender } = renderHook(
      ({ researchId }) =>
        useSlider({
          researchId,
          open: true,
          onOpenChange,
        }),
      { initialProps: { researchId: "research-1" } }
    );

    expect(mockOpenSlider).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(result.current.handle).not.toBeNull();
    expect(result.current.isOpen).toBe(true);

    rerender({ researchId: "research-2" });

    expect(mockOpenSlider).toHaveBeenCalledTimes(2);
    expect(mockShow).toHaveBeenCalledTimes(2);
    expect(result.current.handle).not.toBeNull();
    expect(result.current.isOpen).toBe(true);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("keeps uncontrolled slider open when recreated while open", () => {
    const onClose = vi.fn();

    const { result, rerender } = renderHook(
      ({ params }) =>
        useSlider({
          researchId: "test-research-id",
          params,
          onClose,
        }),
      { initialProps: { params: { source: "first" } } }
    );

    act(() => {
      result.current.open();
    });

    expect(mockOpenSlider).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(true);

    rerender({ params: { source: "second" } });

    expect(mockOpenSlider).toHaveBeenCalledTimes(2);
    expect(mockShow).toHaveBeenCalledTimes(2);
    expect(result.current.handle).not.toBeNull();
    expect(result.current.isOpen).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("recreates slider when researchId changes", () => {
    const { rerender } = renderHook(
      ({ researchId }) => useSlider({ researchId }),
      { initialProps: { researchId: "research-1" } }
    );

    expect(mockOpenSlider).toHaveBeenCalledTimes(1);

    rerender({ researchId: "research-2" });

    expect(mockUnmount).toHaveBeenCalledTimes(1);
    expect(mockOpenSlider).toHaveBeenCalledTimes(2);
  });
});
