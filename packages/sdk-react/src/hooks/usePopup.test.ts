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

  it("does not call openPopup on mount", () => {
    renderHook(() => usePopup({ researchId: "test-research-id" }));

    expect(mockOpenPopup).not.toHaveBeenCalled();
  });

  it("calls openPopup when open() is called", () => {
    const { result } = renderHook(() =>
      usePopup({ researchId: "test-research-id" })
    );

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

  it("sets isOpen to true when open() is called", () => {
    const { result } = renderHook(() =>
      usePopup({ researchId: "test-research-id" })
    );

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("calls destroy and sets isOpen to false when close() is called", () => {
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

    expect(mockDestroy).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(false);
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
    expect(mockOpenPopup).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(false);
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it("passes config to openPopup", () => {
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

  it("supports controlled mode with open prop", () => {
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

    expect(result.current.isOpen).toBe(false);

    rerender({ open: true });

    expect(mockOpenPopup).toHaveBeenCalledTimes(1);

    rerender({ open: false });

    expect(mockDestroy).toHaveBeenCalledTimes(1);
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

  it("cleans up on unmount without treating it as explicit close", () => {
    const { result, unmount } = renderHook(() =>
      usePopup({ researchId: "test-research-id" })
    );

    act(() => {
      result.current.open();
    });

    unmount();

    expect(mockUnmount).toHaveBeenCalled();
    expect(mockDestroy).not.toHaveBeenCalled();
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

  it("restores persisted open state on mount in uncontrolled mode", () => {
    mockGetPersistedOpenState.mockReturnValue(true);

    const { result } = renderHook(() =>
      usePopup({ researchId: "test-research-id" })
    );

    expect(mockOpenPopup).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(true);
    expect(result.current.handle).not.toBeNull();
  });
});
