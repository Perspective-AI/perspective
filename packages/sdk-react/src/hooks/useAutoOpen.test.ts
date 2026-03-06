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
  preloadIframe: vi.fn(),
  destroyPreloadedByType: vi.fn(),
  setupTrigger: vi.fn(() => vi.fn()),
  shouldShow: vi.fn(() => true),
  markShown: vi.fn(),
  getHost: vi.fn((host?: string) => host ?? "https://getperspective.ai"),
}));

import {
  openPopup,
  preloadIframe,
  destroyPreloadedByType,
  setupTrigger,
  shouldShow,
  markShown,
  getHost,
} from "@perspective-ai/sdk";

const mockOpenPopup = vi.mocked(openPopup);
const mockPreloadIframe = vi.mocked(preloadIframe);
const mockDestroyPreloadedByType = vi.mocked(destroyPreloadedByType);
const mockSetupTrigger = vi.mocked(setupTrigger);
const mockShouldShow = vi.mocked(shouldShow);
const mockMarkShown = vi.mocked(markShown);
const mockGetHost = vi.mocked(getHost);

describe("useAutoOpen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShouldShow.mockReturnValue(true);
    mockSetupTrigger.mockReturnValue(vi.fn());
    mockGetHost.mockImplementation(
      (host?: string) => host ?? "https://getperspective.ai"
    );
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("preloads the popup and registers the trigger on mount", () => {
    renderHook(() =>
      useAutoOpen({
        researchId: "test-id",
        trigger: { type: "timeout", delay: 5000 },
      })
    );

    expect(mockShouldShow).toHaveBeenCalledWith("test-id", "session");
    expect(mockGetHost).toHaveBeenCalledWith(undefined);
    expect(mockPreloadIframe).toHaveBeenCalledWith(
      "test-id",
      "popup",
      "https://getperspective.ai",
      undefined,
      undefined,
      undefined
    );
    expect(mockSetupTrigger).toHaveBeenCalledWith(
      { type: "timeout", delay: 5000 },
      expect.any(Function)
    );
  });

  it("does not preload or register a trigger when shouldShow returns false", () => {
    mockShouldShow.mockReturnValue(false);

    renderHook(() =>
      useAutoOpen({
        researchId: "test-id",
        trigger: { type: "timeout", delay: 5000 },
      })
    );

    expect(mockPreloadIframe).not.toHaveBeenCalled();
    expect(mockSetupTrigger).not.toHaveBeenCalled();
  });

  it("calls markShown and openPopup when the trigger fires", () => {
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

  it("only fires once even if the trigger callback runs multiple times", () => {
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

  it("cleans up the trigger and preload on unmount", () => {
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
    expect(mockDestroyPreloadedByType).toHaveBeenCalledWith("test-id", "popup");
  });

  it("cancel() stops the trigger and removes the preload", () => {
    const mockCleanup = vi.fn();
    mockSetupTrigger.mockReturnValue(mockCleanup);

    const { result } = renderHook(() =>
      useAutoOpen({
        researchId: "test-id",
        trigger: { type: "timeout", delay: 5000 },
      })
    );

    act(() => {
      result.current.cancel();
    });

    expect(mockCleanup).toHaveBeenCalled();
    expect(mockDestroyPreloadedByType).toHaveBeenCalledWith("test-id", "popup");
  });

  it("refreshes the preload when iframe-defining config changes", () => {
    const { rerender } = renderHook(
      ({ params, theme }) =>
        useAutoOpen({
          researchId: "test-id",
          trigger: { type: "timeout", delay: 5000 },
          params,
          theme,
        }),
      {
        initialProps: {
          params: { source: "first" },
          theme: "light" as "light" | "dark",
        },
      }
    );

    expect(mockPreloadIframe).toHaveBeenCalledTimes(1);
    expect(mockSetupTrigger).toHaveBeenCalledTimes(1);

    rerender({
      params: { source: "second" },
      theme: "dark" as const,
    });

    expect(mockPreloadIframe).toHaveBeenCalledTimes(2);
    expect(mockPreloadIframe).toHaveBeenLastCalledWith(
      "test-id",
      "popup",
      "https://getperspective.ai",
      { source: "second" },
      undefined,
      "dark"
    );
    expect(mockDestroyPreloadedByType).toHaveBeenCalledWith("test-id", "popup");
    expect(mockSetupTrigger).toHaveBeenCalledTimes(1);
  });

  it("passes the latest popup config when the trigger fires", () => {
    let triggerCallback: () => void;
    mockSetupTrigger.mockImplementation((_config, cb) => {
      triggerCallback = cb;
      return vi.fn();
    });

    const { rerender } = renderHook(
      ({ params, host }) =>
        useAutoOpen({
          researchId: "test-id",
          trigger: { type: "timeout", delay: 5000 },
          params,
          host,
        }),
      {
        initialProps: {
          params: { source: "first" },
          host: "https://first.example.com",
        },
      }
    );

    rerender({
      params: { source: "second" },
      host: "https://second.example.com",
    });

    act(() => triggerCallback!());

    expect(mockOpenPopup).toHaveBeenCalledWith(
      expect.objectContaining({
        researchId: "test-id",
        params: { source: "second" },
        host: "https://second.example.com",
      })
    );
  });
});
