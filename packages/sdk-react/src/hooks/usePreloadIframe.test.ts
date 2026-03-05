import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { usePreloadIframe } from "./usePreloadIframe";

const mockPreloadIframe = vi.fn();
const mockDestroyPreloadedByType = vi.fn();
const mockGetHost = vi.fn(
  (host?: string) => host ?? "https://getperspective.ai"
);

vi.mock("@perspective-ai/sdk", () => ({
  preloadIframe: (...args: unknown[]) => mockPreloadIframe(...args),
  destroyPreloadedByType: (...args: unknown[]) =>
    mockDestroyPreloadedByType(...args),
  getHost: (host?: string) => mockGetHost(host),
}));

describe("usePreloadIframe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("calls preloadIframe on mount", () => {
    const handleRef = { current: null };
    renderHook(() =>
      usePreloadIframe("popup", "research-1", undefined, handleRef)
    );

    expect(mockPreloadIframe).toHaveBeenCalledOnce();
    expect(mockPreloadIframe).toHaveBeenCalledWith(
      "research-1",
      "popup",
      "https://getperspective.ai",
      undefined,
      undefined,
      undefined
    );
  });

  it("skips preload when handleRef.current is set", () => {
    const handleRef = { current: { some: "handle" } };
    renderHook(() =>
      usePreloadIframe("popup", "research-1", undefined, handleRef)
    );

    expect(mockPreloadIframe).not.toHaveBeenCalled();
  });

  it("calls destroyPreloadedByType on unmount when unclaimed", () => {
    const handleRef = { current: null };
    const { unmount } = renderHook(() =>
      usePreloadIframe("popup", "research-1", undefined, handleRef)
    );

    unmount();
    expect(mockDestroyPreloadedByType).toHaveBeenCalledOnce();
    expect(mockDestroyPreloadedByType).toHaveBeenCalledWith(
      "research-1",
      "popup"
    );
  });

  it("does NOT call destroyPreloadedByType on unmount when handle exists (claimed)", () => {
    const handleRef: { current: unknown } = { current: null };
    const { unmount } = renderHook(() =>
      usePreloadIframe("popup", "research-1", undefined, handleRef)
    );

    // Simulate handle being created (iframe was claimed by openPopup)
    handleRef.current = { some: "handle" };

    unmount();
    expect(mockDestroyPreloadedByType).not.toHaveBeenCalled();
  });

  it("resolves host via getHost", () => {
    const handleRef = { current: null };
    renderHook(() =>
      usePreloadIframe("slider", "research-1", "https://custom.host", handleRef)
    );

    expect(mockGetHost).toHaveBeenCalledWith("https://custom.host");
    expect(mockPreloadIframe).toHaveBeenCalledWith(
      "research-1",
      "slider",
      "https://custom.host",
      undefined,
      undefined,
      undefined
    );
  });

  it("does not re-preload when object references change but values are equal", () => {
    const handleRef = { current: null };
    const { rerender } = renderHook(
      ({ params }) =>
        usePreloadIframe("popup", "research-1", undefined, handleRef, params),
      { initialProps: { params: { foo: "bar" } } }
    );

    expect(mockPreloadIframe).toHaveBeenCalledOnce();

    // Re-render with new object reference, same values
    rerender({ params: { foo: "bar" } });
    expect(mockPreloadIframe).toHaveBeenCalledOnce();
  });

  it("re-preloads when object values actually change", () => {
    const handleRef = { current: null };
    const { rerender } = renderHook(
      ({ params }) =>
        usePreloadIframe("popup", "research-1", undefined, handleRef, params),
      { initialProps: { params: { foo: "bar" } } }
    );

    expect(mockPreloadIframe).toHaveBeenCalledOnce();

    rerender({ params: { foo: "baz" } });
    expect(mockPreloadIframe).toHaveBeenCalledTimes(2);
  });
});
