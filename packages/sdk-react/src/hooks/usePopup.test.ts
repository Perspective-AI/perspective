import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { usePopup } from "./usePopup";

const mockUnmount = vi.fn();
const mockUpdate = vi.fn();
const mockDestroy = vi.fn();
const mockShow = vi.fn();
const mockHide = vi.fn();

vi.mock("@perspective-ai/sdk", () => ({
  openPopup: vi.fn(
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
        type: "popup",
        iframe: null,
        container: null,
      };
    }
  ),
}));

import { openPopup } from "@perspective-ai/sdk";
const mockOpenPopup = vi.mocked(openPopup);

describe("usePopup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("returns open, close, toggle functions and isOpen state", () => {
    const { result } = renderHook(() =>
      usePopup({ researchId: "test-research-id" })
    );

    expect(result.current.open).toBeInstanceOf(Function);
    expect(result.current.close).toBeInstanceOf(Function);
    expect(result.current.toggle).toBeInstanceOf(Function);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.handle).toBeNull();
  });

  it("eagerly creates popup hidden on mount", () => {
    renderHook(() => usePopup({ researchId: "test-research-id" }));

    expect(mockOpenPopup).toHaveBeenCalledTimes(1);
    expect(mockOpenPopup).toHaveBeenCalledWith(
      expect.objectContaining({
        researchId: "test-research-id",
        _startHidden: true,
      })
    );
  });

  it("shows hidden popup when open() is called", () => {
    const { result } = renderHook(() =>
      usePopup({ researchId: "test-research-id" })
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
      usePopup({ researchId: "test-research-id" })
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

  it("reuses hidden popup on re-open via show()", () => {
    const { result } = renderHook(() =>
      usePopup({ researchId: "test-research-id" })
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

    // Only created once on mount, subsequent opens just show()
    expect(mockOpenPopup).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledTimes(2); // mount creates hidden, first open shows, re-open shows again
    expect(result.current.isOpen).toBe(true);
  });

  it("toggles open state", () => {
    const { result } = renderHook(() =>
      usePopup({ researchId: "test-research-id" })
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

  it("passes config to openPopup", () => {
    const onReady = vi.fn();
    const onSubmit = vi.fn();

    renderHook(() =>
      usePopup({
        researchId: "test-research-id",
        params: { source: "test" },
        theme: "dark",
        host: "https://custom.example.com",
        onReady,
        onSubmit,
      })
    );

    expect(mockOpenPopup).toHaveBeenCalledTimes(1);
    const config = mockOpenPopup.mock.calls[0]![0];
    expect(config.researchId).toBe("test-research-id");
    expect(config.params).toEqual({ source: "test" });
    expect(config.theme).toBe("dark");
    expect(config.host).toBe("https://custom.example.com");
  });

  it("supports controlled mode with open prop", () => {
    const onOpenChange = vi.fn();

    const { rerender } = renderHook(
      ({ open }) =>
        usePopup({
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

  it("calls onOpenChange in controlled mode when open() is called", () => {
    const onOpenChange = vi.fn();

    const { result } = renderHook(() =>
      usePopup({
        researchId: "test-research-id",
        open: false,
        onOpenChange,
      })
    );

    act(() => {
      result.current.open();
    });

    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("calls unmount on component unmount", () => {
    const { unmount } = renderHook(() =>
      usePopup({ researchId: "test-research-id" })
    );

    unmount();

    expect(mockUnmount).toHaveBeenCalled();
  });

  it("makes handle reactive - handle is available after open", () => {
    const { result } = renderHook(() =>
      usePopup({ researchId: "test-research-id" })
    );

    expect(result.current.handle).toBeNull();

    act(() => {
      result.current.open();
    });

    expect(result.current.handle).not.toBeNull();
  });

  it("sets handle in controlled mode when open becomes true", () => {
    const onOpenChange = vi.fn();

    const { result, rerender } = renderHook(
      ({ open }) =>
        usePopup({
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

  it("keeps controlled popup open when recreated while open", () => {
    const onOpenChange = vi.fn();

    const { result, rerender } = renderHook(
      ({ researchId }) =>
        usePopup({
          researchId,
          open: true,
          onOpenChange,
        }),
      { initialProps: { researchId: "research-1" } }
    );

    expect(mockOpenPopup).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(result.current.handle).not.toBeNull();
    expect(result.current.isOpen).toBe(true);

    rerender({ researchId: "research-2" });

    expect(mockOpenPopup).toHaveBeenCalledTimes(2);
    expect(mockShow).toHaveBeenCalledTimes(2);
    expect(result.current.handle).not.toBeNull();
    expect(result.current.isOpen).toBe(true);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("keeps uncontrolled popup open when recreated while open", () => {
    const onClose = vi.fn();

    const { result, rerender } = renderHook(
      ({ params }) =>
        usePopup({
          researchId: "test-research-id",
          params,
          onClose,
        }),
      { initialProps: { params: { source: "first" } } }
    );

    act(() => {
      result.current.open();
    });

    expect(mockOpenPopup).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(true);

    rerender({ params: { source: "second" } });

    expect(mockOpenPopup).toHaveBeenCalledTimes(2);
    expect(mockShow).toHaveBeenCalledTimes(2);
    expect(result.current.handle).not.toBeNull();
    expect(result.current.isOpen).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("recreates popup when researchId changes", () => {
    const { rerender } = renderHook(
      ({ researchId }) => usePopup({ researchId }),
      { initialProps: { researchId: "research-1" } }
    );

    expect(mockOpenPopup).toHaveBeenCalledTimes(1);

    rerender({ researchId: "research-2" });

    expect(mockUnmount).toHaveBeenCalledTimes(1);
    expect(mockOpenPopup).toHaveBeenCalledTimes(2);
  });
});
