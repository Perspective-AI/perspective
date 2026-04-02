import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { usePopup } from "./usePopup";

const { mockDestroy, mockUnmount, mockUpdate, mockGetPersistedOpenState } =
  vi.hoisted(() => ({
    mockDestroy: vi.fn(),
    mockUnmount: vi.fn(),
    mockUpdate: vi.fn(),
    mockGetPersistedOpenState: vi.fn(),
  }));

vi.mock("@perspective-ai/sdk", () => ({
  getPersistedOpenState: mockGetPersistedOpenState,
  openPopup: vi.fn(() => ({
    unmount: mockUnmount,
    update: mockUpdate,
    destroy: mockDestroy,
    researchId: "test-research-id",
    type: "popup",
    iframe: null,
    container: null,
  })),
  fetchEmbedConfig: vi.fn(() =>
    Promise.resolve({
      primaryColor: "#7c3aed",
      textColor: "#ffffff",
      darkPrimaryColor: "#a78bfa",
      darkTextColor: "#ffffff",
    })
  ),
}));

import { openPopup } from "@perspective-ai/sdk";
const mockOpenPopup = vi.mocked(openPopup);

describe("usePopup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPersistedOpenState.mockReturnValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  it("returns open, close, toggle functions and isOpen state", async () => {
    const { result } = renderHook(() =>
      usePopup({ researchId: "test-research-id" })
    );
    await act(async () => {});

    expect(result.current.open).toBeInstanceOf(Function);
    expect(result.current.close).toBeInstanceOf(Function);
    expect(result.current.toggle).toBeInstanceOf(Function);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.handle).toBeNull();
  });

  it("does not call openPopup on mount", async () => {
    renderHook(() => usePopup({ researchId: "test-research-id" }));
    await act(async () => {});

    expect(mockOpenPopup).not.toHaveBeenCalled();
  });

  it("calls openPopup when open() is called", async () => {
    const { result } = renderHook(() =>
      usePopup({ researchId: "test-research-id" })
    );
    await act(async () => {});

    act(() => {
      result.current.open();
    });

    expect(mockOpenPopup).toHaveBeenCalledTimes(1);
    expect(mockOpenPopup).toHaveBeenCalledWith(
      expect.objectContaining({
        researchId: "test-research-id",
      })
    );
  });

  it("sets isOpen to true when open() is called", async () => {
    const { result } = renderHook(() =>
      usePopup({ researchId: "test-research-id" })
    );
    await act(async () => {});

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("calls destroy and sets isOpen to false when close() is called", async () => {
    const { result } = renderHook(() =>
      usePopup({ researchId: "test-research-id" })
    );
    await act(async () => {});

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

  it("toggles open state", async () => {
    const { result } = renderHook(() =>
      usePopup({ researchId: "test-research-id" })
    );
    await act(async () => {});

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(true);
    expect(mockOpenPopup).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(false);
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it("passes config to openPopup", async () => {
    const onReady = vi.fn();
    const onSubmit = vi.fn();

    const { result } = renderHook(() =>
      usePopup({
        researchId: "test-research-id",
        params: { source: "test" },
        theme: "dark",
        host: "https://custom.example.com",
        onReady,
        onSubmit,
      })
    );
    await act(async () => {});

    act(() => {
      result.current.open();
    });

    expect(mockOpenPopup).toHaveBeenCalledTimes(1);
    const config = mockOpenPopup.mock.calls[0]![0];
    expect(config.researchId).toBe("test-research-id");
    expect(config.params).toEqual({ source: "test" });
    expect(config.theme).toBe("dark");
    expect(config.host).toBe("https://custom.example.com");
  });

  it("passes disableClose to openPopup", async () => {
    const { result } = renderHook(() =>
      usePopup({ researchId: "test-research-id", disableClose: true })
    );
    await act(async () => {});

    act(() => {
      result.current.open();
    });

    expect(mockOpenPopup).toHaveBeenCalledWith(
      expect.objectContaining({
        disableClose: true,
      })
    );
  });

  it("supports controlled mode with open prop", async () => {
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
    await act(async () => {});

    expect(result.current.isOpen).toBe(false);

    rerender({ open: true });

    expect(mockOpenPopup).toHaveBeenCalledTimes(1);

    rerender({ open: false });

    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it("calls onOpenChange in controlled mode when open() is called", async () => {
    const onOpenChange = vi.fn();

    const { result } = renderHook(() =>
      usePopup({
        researchId: "test-research-id",
        open: false,
        onOpenChange,
      })
    );
    await act(async () => {});

    act(() => {
      result.current.open();
    });

    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("cleans up on unmount without treating it as explicit close", async () => {
    const { result, unmount } = renderHook(() =>
      usePopup({ researchId: "test-research-id" })
    );
    await act(async () => {});

    act(() => {
      result.current.open();
    });

    unmount();

    expect(mockUnmount).toHaveBeenCalled();
    expect(mockDestroy).not.toHaveBeenCalled();
  });

  it("makes handle reactive - handle is available after open", async () => {
    const { result } = renderHook(() =>
      usePopup({ researchId: "test-research-id" })
    );
    await act(async () => {});

    expect(result.current.handle).toBeNull();

    act(() => {
      result.current.open();
    });

    expect(result.current.handle).not.toBeNull();
  });

  it("passes _themeConfig from fetched embed config to openPopup", async () => {
    const { result } = renderHook(() =>
      usePopup({ researchId: "test-research-id" })
    );
    await act(async () => {}); // flush fetchEmbedConfig

    act(() => {
      result.current.open();
    });

    expect(mockOpenPopup).toHaveBeenCalledTimes(1);
    const config = mockOpenPopup.mock.calls[0]![0];
    expect(config._themeConfig).toEqual({
      primaryColor: "#7c3aed",
      textColor: "#ffffff",
      darkPrimaryColor: "#a78bfa",
      darkTextColor: "#ffffff",
    });
  });

  it("restores persisted open state on mount in uncontrolled mode", async () => {
    mockGetPersistedOpenState.mockReturnValue(true);

    const { result } = renderHook(() =>
      usePopup({ researchId: "test-research-id" })
    );
    await act(async () => {});

    expect(mockOpenPopup).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(true);
    expect(result.current.handle).not.toBeNull();
  });
});
