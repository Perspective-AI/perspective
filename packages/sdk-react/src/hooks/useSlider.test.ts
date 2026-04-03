import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useSlider } from "./useSlider";

const { mockDestroy, mockUnmount, mockUpdate, mockGetPersistedOpenState } =
  vi.hoisted(() => ({
    mockDestroy: vi.fn(),
    mockUnmount: vi.fn(),
    mockUpdate: vi.fn(),
    mockGetPersistedOpenState: vi.fn(),
  }));

vi.mock("@perspective-ai/sdk", () => ({
  getPersistedOpenState: mockGetPersistedOpenState,
  openSlider: vi.fn(() => ({
    unmount: mockUnmount,
    update: mockUpdate,
    destroy: mockDestroy,
    researchId: "test-research-id",
    type: "slider",
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

import { openSlider } from "@perspective-ai/sdk";
const mockOpenSlider = vi.mocked(openSlider);

describe("useSlider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPersistedOpenState.mockReturnValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  it("returns open, close, toggle functions and isOpen state", async () => {
    const { result } = renderHook(() =>
      useSlider({ researchId: "test-research-id" })
    );
    await act(async () => {});

    expect(result.current.open).toBeInstanceOf(Function);
    expect(result.current.close).toBeInstanceOf(Function);
    expect(result.current.toggle).toBeInstanceOf(Function);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.handle).toBeNull();
  });

  it("does not call openSlider on mount", async () => {
    renderHook(() => useSlider({ researchId: "test-research-id" }));
    await act(async () => {});

    expect(mockOpenSlider).not.toHaveBeenCalled();
  });

  it("calls openSlider when open() is called", async () => {
    const { result } = renderHook(() =>
      useSlider({ researchId: "test-research-id" })
    );
    await act(async () => {});

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

  it("sets isOpen to true when open() is called", async () => {
    const { result } = renderHook(() =>
      useSlider({ researchId: "test-research-id" })
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
      useSlider({ researchId: "test-research-id" })
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
      useSlider({ researchId: "test-research-id" })
    );
    await act(async () => {});

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

  it("passes disableClose to openSlider", async () => {
    const { result } = renderHook(() =>
      useSlider({ researchId: "test-research-id", disableClose: true })
    );
    await act(async () => {});

    act(() => {
      result.current.open();
    });

    expect(mockOpenSlider).toHaveBeenCalledWith(
      expect.objectContaining({
        disableClose: true,
      })
    );
  });

  it("cleans up on unmount without treating it as explicit close", async () => {
    const { result, unmount } = renderHook(() =>
      useSlider({ researchId: "test-research-id" })
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
      useSlider({ researchId: "test-research-id" })
    );
    await act(async () => {});

    expect(result.current.handle).toBeNull();

    act(() => {
      result.current.open();
    });

    expect(result.current.handle).not.toBeNull();
  });

  it("restores persisted open state on mount in uncontrolled mode", async () => {
    mockGetPersistedOpenState.mockReturnValue(true);

    const { result } = renderHook(() =>
      useSlider({ researchId: "test-research-id" })
    );
    await act(async () => {});

    expect(mockOpenSlider).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(true);
    expect(result.current.handle).not.toBeNull();
  });
});
