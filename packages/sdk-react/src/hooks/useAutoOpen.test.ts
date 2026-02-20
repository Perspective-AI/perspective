import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, cleanup, act } from "@testing-library/react";
import { useAutoOpen } from "./useAutoOpen";

vi.mock("@perspective-ai/sdk", () => ({
  openPopup: vi.fn(() => ({
    unmount: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    researchId: "test-id",
    type: "popup",
    iframe: null,
    container: null,
  })),
  setupTrigger: vi.fn(() => vi.fn()),
  shouldShow: vi.fn(() => true),
  markShown: vi.fn(),
}));

// useStableCallback just passes through in tests
vi.mock("./useStableCallback", () => ({
  useStableCallback: (cb: unknown) => cb,
}));

import {
  openPopup,
  setupTrigger,
  shouldShow,
  markShown,
} from "@perspective-ai/sdk";

const mockOpenPopup = vi.mocked(openPopup);
const mockSetupTrigger = vi.mocked(setupTrigger);
const mockShouldShow = vi.mocked(shouldShow);
const mockMarkShown = vi.mocked(markShown);

describe("useAutoOpen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore defaults after clearAllMocks resets implementations
    mockShouldShow.mockReturnValue(true);
    mockSetupTrigger.mockReturnValue(vi.fn());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("calls setupTrigger on mount when shouldShow returns true", () => {
    renderHook(() =>
      useAutoOpen({
        researchId: "test-id",
        trigger: { type: "timeout", delay: 5000 },
      })
    );

    expect(mockShouldShow).toHaveBeenCalledWith("test-id", "session");
    expect(mockSetupTrigger).toHaveBeenCalledWith(
      { type: "timeout", delay: 5000 },
      expect.any(Function)
    );
  });

  it("does not call setupTrigger when shouldShow returns false", () => {
    mockShouldShow.mockReturnValue(false);

    renderHook(() =>
      useAutoOpen({
        researchId: "test-id",
        trigger: { type: "timeout", delay: 5000 },
      })
    );

    expect(mockSetupTrigger).not.toHaveBeenCalled();
  });

  it("calls markShown and openPopup when trigger fires", () => {
    let triggerCallback: () => void;
    mockSetupTrigger.mockImplementation((_config, cb) => {
      triggerCallback = cb;
      return vi.fn();
    });

    const { result } = renderHook(() =>
      useAutoOpen({
        researchId: "test-id",
        trigger: { type: "timeout", delay: 5000 },
        showOnce: "visitor",
      })
    );

    expect(result.current.triggered).toBe(false);

    act(() => triggerCallback!());

    expect(mockMarkShown).toHaveBeenCalledWith("test-id", "visitor");
    expect(mockOpenPopup).toHaveBeenCalledWith(
      expect.objectContaining({ researchId: "test-id" })
    );
    expect(result.current.triggered).toBe(true);
  });

  it("only fires once even if trigger callback called multiple times", () => {
    let triggerCallback: () => void;
    mockSetupTrigger.mockImplementation((_config, cb) => {
      triggerCallback = cb;
      return vi.fn();
    });

    const { result } = renderHook(() =>
      useAutoOpen({
        researchId: "test-id",
        trigger: { type: "timeout", delay: 5000 },
      })
    );

    act(() => triggerCallback!());
    act(() => triggerCallback!());

    expect(mockOpenPopup).toHaveBeenCalledTimes(1);
    expect(result.current.triggered).toBe(true);
  });

  it("defaults showOnce to session", () => {
    renderHook(() =>
      useAutoOpen({
        researchId: "test-id",
        trigger: { type: "exit-intent" },
      })
    );

    expect(mockShouldShow).toHaveBeenCalledWith("test-id", "session");
  });

  it("calls cleanup on unmount", () => {
    const mockCleanup = vi.fn();
    mockSetupTrigger.mockReturnValue(mockCleanup);

    const { unmount } = renderHook(() =>
      useAutoOpen({
        researchId: "test-id",
        trigger: { type: "timeout", delay: 5000 },
      })
    );

    unmount();

    expect(mockCleanup).toHaveBeenCalled();
  });

  it("cancel() stops the trigger", () => {
    const mockCleanup = vi.fn();
    mockSetupTrigger.mockReturnValue(mockCleanup);

    const { result } = renderHook(() =>
      useAutoOpen({
        researchId: "test-id",
        trigger: { type: "timeout", delay: 5000 },
      })
    );

    result.current.cancel();

    expect(mockCleanup).toHaveBeenCalled();
  });
});
