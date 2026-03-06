import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, cleanup, act } from "@testing-library/react";
import { useFloatBubble } from "./useFloatBubble";

const mockOpen = vi.fn();
const mockClose = vi.fn();
const mockUnmount = vi.fn();
const mockToggle = vi.fn();
const mockDestroy = vi.fn();
const mockUpdate = vi.fn();

const stableMockHandle = {
  open: mockOpen,
  close: mockClose,
  unmount: mockUnmount,
  toggle: mockToggle,
  destroy: mockDestroy,
  update: mockUpdate,
  isOpen: false,
  researchId: "test-research-id",
  type: "float" as const,
  iframe: null,
  container: null,
};

vi.mock("@perspective-ai/sdk", () => ({
  createFloatBubble: vi.fn(() => stableMockHandle),
}));

import { createFloatBubble } from "@perspective-ai/sdk";
const mockCreateFloatBubble = vi.mocked(createFloatBubble);

describe("useFloatBubble", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stableMockHandle.isOpen = false;
  });

  afterEach(() => {
    cleanup();
  });

  it("creates bubble on mount and cleans up on unmount", () => {
    const { unmount } = renderHook(() =>
      useFloatBubble({ researchId: "test-research-id" })
    );

    expect(mockCreateFloatBubble).toHaveBeenCalledTimes(1);
    expect(mockCreateFloatBubble).toHaveBeenCalledWith(
      expect.objectContaining({ researchId: "test-research-id" })
    );

    unmount();

    expect(mockUnmount).toHaveBeenCalledTimes(1);
  });

  it("returns expected interface", () => {
    const { result, unmount } = renderHook(() =>
      useFloatBubble({ researchId: "test-research-id" })
    );

    expect(result.current.open).toBeInstanceOf(Function);
    expect(result.current.close).toBeInstanceOf(Function);
    expect(result.current.toggle).toBeInstanceOf(Function);
    expect(result.current.unmount).toBeInstanceOf(Function);
    expect(result.current.handle).not.toBeNull();
    expect(typeof result.current.isOpen).toBe("boolean");

    unmount();
  });

  it("manual unmount clears handle and prevents double cleanup", () => {
    const { result, unmount } = renderHook(() =>
      useFloatBubble({ researchId: "test-research-id" })
    );

    expect(result.current.handle).not.toBeNull();

    act(() => {
      result.current.unmount();
    });

    expect(mockUnmount).toHaveBeenCalledTimes(1);
    expect(result.current.handle).toBeNull();

    unmount();

    expect(mockUnmount).toHaveBeenCalledTimes(1);
  });
});
