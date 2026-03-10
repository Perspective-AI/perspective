import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useSlider } from "./useSlider";

const {
  mockDestroy,
  mockUnmount,
  mockUpdate,
  mockShow,
  mockHide,
  mockGetPersistedOpenState,
  sdkCloseRef,
} = vi.hoisted(() => ({
  mockDestroy: vi.fn(),
  mockUnmount: vi.fn(),
  mockUpdate: vi.fn(),
  mockShow: vi.fn(),
  mockHide: vi.fn(),
  mockGetPersistedOpenState: vi.fn(),
  sdkCloseRef: { current: null as (() => void) | null },
}));

vi.mock("@perspective-ai/sdk", () => ({
  getPersistedOpenState: mockGetPersistedOpenState,
  openSlider: vi.fn(
    (config: {
      researchId?: string;
      onClose?: () => void;
      host?: string;
      _startHidden?: boolean;
    }) => {
      const currentConfig = { ...config };
      let open = !config._startHidden;

      const show = () => {
        if (open) return;
        mockShow();
        open = true;
      };

      const hide = () => {
        if (!open) return;
        mockHide();
        open = false;
        currentConfig.onClose?.();
      };

      const unmount = () => {
        mockUnmount();
        open = false;
      };

      const destroy = () => {
        mockDestroy();
        const wasOpen = open;
        open = false;
        if (wasOpen) {
          currentConfig.onClose?.();
        }
      };

      const update = (
        options: Partial<{ onClose?: () => void; host?: string }>
      ) => {
        mockUpdate(options);
        Object.assign(currentConfig, options);
      };

      sdkCloseRef.current = () => {
        if (!open) return;
        open = false;
        currentConfig.onClose?.();
      };

      return {
        unmount,
        update,
        destroy,
        show,
        hide,
        get isOpen() {
          return open;
        },
        researchId: config.researchId ?? "test-research-id",
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
    sdkCloseRef.current = null;
    mockGetPersistedOpenState.mockReturnValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  it("returns open, close, toggle functions and initial state", () => {
    const { result } = renderHook(() =>
      useSlider({ researchId: "test-research-id" })
    );

    expect(result.current.open).toBeInstanceOf(Function);
    expect(result.current.close).toBeInstanceOf(Function);
    expect(result.current.toggle).toBeInstanceOf(Function);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.handle).not.toBeNull();
  });

  it("preloads a hidden slider on mount", () => {
    renderHook(() => useSlider({ researchId: "test-research-id" }));

    expect(mockOpenSlider).toHaveBeenCalledTimes(1);
    expect(mockOpenSlider).toHaveBeenCalledWith(
      expect.objectContaining({
        researchId: "test-research-id",
        _startHidden: true,
      })
    );
  });

  it("opens the preloaded slider without recreating it", () => {
    const { result } = renderHook(() =>
      useSlider({ researchId: "test-research-id" })
    );

    act(() => {
      result.current.open();
    });

    expect(mockOpenSlider).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(true);
    expect(result.current.handle).not.toBeNull();
  });

  it("hides the slider on close but keeps the handle for instant reopen", () => {
    const { result } = renderHook(() =>
      useSlider({ researchId: "test-research-id" })
    );

    act(() => {
      result.current.open();
    });

    act(() => {
      result.current.close();
    });

    expect(mockHide).toHaveBeenCalledTimes(1);
    expect(mockDestroy).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
    expect(result.current.handle).not.toBeNull();
  });

  it("reuses the same slider on reopen after close", () => {
    const { result } = renderHook(() =>
      useSlider({ researchId: "test-research-id" })
    );

    act(() => {
      result.current.open();
      result.current.close();
      result.current.open();
    });

    expect(mockOpenSlider).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledTimes(2);
    expect(mockHide).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(true);
  });

  it("toggles open state using the same underlying slider", () => {
    const { result } = renderHook(() =>
      useSlider({ researchId: "test-research-id" })
    );

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(true);
    expect(mockOpenSlider).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(false);
    expect(mockHide).toHaveBeenCalledTimes(1);
    expect(mockDestroy).not.toHaveBeenCalled();
  });

  it("passes config to openSlider during preload creation", () => {
    renderHook(() =>
      useSlider({
        researchId: "test-research-id",
        params: { source: "test" },
        theme: "dark",
        host: "https://custom.example.com",
      })
    );

    expect(mockOpenSlider).toHaveBeenCalledTimes(1);
    const config = mockOpenSlider.mock.calls[0]![0];
    expect(config.researchId).toBe("test-research-id");
    expect(config.params).toEqual({ source: "test" });
    expect(config.theme).toBe("dark");
    expect(config.host).toBe("https://custom.example.com");
    expect(config._startHidden).toBe(true);
  });

  it("supports controlled mode with open prop using show and hide", () => {
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

    expect(mockOpenSlider).toHaveBeenCalledTimes(1);

    rerender({ open: true });
    expect(mockOpenSlider).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledTimes(1);

    rerender({ open: false });
    expect(mockHide).toHaveBeenCalledTimes(1);
    expect(mockDestroy).not.toHaveBeenCalled();
  });

  it("calls onOpenChange in controlled mode when open() is called", () => {
    const onOpenChange = vi.fn();

    const { result } = renderHook(() =>
      useSlider({
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

  it("cleans up on unmount without treating it as explicit close", () => {
    const { unmount } = renderHook(() =>
      useSlider({ researchId: "test-research-id" })
    );

    unmount();

    expect(mockUpdate).toHaveBeenCalledWith({ onClose: undefined });
    expect(mockUnmount).toHaveBeenCalledTimes(1);
    expect(mockDestroy).not.toHaveBeenCalled();
  });

  it("keeps the handle available after mount", () => {
    const { result } = renderHook(() =>
      useSlider({ researchId: "test-research-id" })
    );

    expect(result.current.handle).not.toBeNull();
  });

  it("updates state when the SDK triggers onClose without destroying the slider", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useSlider({
        researchId: "test-research-id",
        onClose,
      })
    );

    act(() => {
      result.current.open();
    });

    act(() => {
      sdkCloseRef.current?.();
    });

    expect(mockDestroy).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
    expect(result.current.handle).not.toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("recreates the slider when researchId changes", () => {
    const { rerender } = renderHook(
      ({ researchId }) =>
        useSlider({
          researchId,
        }),
      { initialProps: { researchId: "research-1" } }
    );

    expect(mockOpenSlider).toHaveBeenCalledTimes(1);

    rerender({ researchId: "research-2" });

    expect(mockOpenSlider).toHaveBeenCalledTimes(2);
    expect(mockUnmount).toHaveBeenCalledTimes(1);
    expect(mockDestroy).not.toHaveBeenCalled();
  });

  it("recreates a hidden slider when iframe-defining config changes", () => {
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

    expect(result.current.isOpen).toBe(false);
    expect(mockOpenSlider).toHaveBeenCalledTimes(1);

    rerender({ params: { source: "second" } });

    expect(mockOpenSlider).toHaveBeenCalledTimes(2);
    expect(mockUnmount).toHaveBeenCalledTimes(1);
    expect(mockDestroy).not.toHaveBeenCalled();
    expect(mockOpenSlider.mock.calls[1]?.[0]._startHidden).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
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
    expect(result.current.isOpen).toBe(true);

    rerender({ researchId: "research-2" });

    expect(mockOpenSlider).toHaveBeenCalledTimes(2);
    expect(mockUnmount).toHaveBeenCalledTimes(1);
    expect(mockDestroy).not.toHaveBeenCalled();
    expect(mockOpenSlider.mock.calls[1]?.[0]._startHidden).toBe(false);
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
    expect(result.current.isOpen).toBe(true);

    rerender({ params: { source: "second" } });

    expect(mockOpenSlider).toHaveBeenCalledTimes(2);
    expect(mockUnmount).toHaveBeenCalledTimes(1);
    expect(mockDestroy).not.toHaveBeenCalled();
    expect(mockOpenSlider.mock.calls[1]?.[0]._startHidden).toBe(false);
    expect(result.current.handle).not.toBeNull();
    expect(result.current.isOpen).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("restores persisted open state on mount in uncontrolled mode", () => {
    mockGetPersistedOpenState.mockReturnValue(true);

    const { result } = renderHook(() =>
      useSlider({ researchId: "test-research-id" })
    );

    expect(mockOpenSlider).toHaveBeenCalledTimes(1);
    expect(mockOpenSlider.mock.calls[0]?.[0]._startHidden).toBe(false);
    expect(result.current.isOpen).toBe(true);
    expect(result.current.handle).not.toBeNull();
  });
});
