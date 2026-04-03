import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useEmbedConfig } from "./useEmbedConfig";

const mockFetchEmbedConfig = vi.fn();

vi.mock("@perspective-ai/sdk", () => ({
  fetchEmbedConfig: (...args: unknown[]) => mockFetchEmbedConfig(...args),
}));

const MOCK_CONFIG = {
  primaryColor: "#ff0000",
  textColor: "#ffffff",
  darkPrimaryColor: "#cc0000",
  darkTextColor: "#ffffff",
  embedSettings: {
    appearance: { hideProgress: true },
    launcher: { icon: "avatar" as const },
  },
};

describe("useEmbedConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchEmbedConfig.mockResolvedValue(MOCK_CONFIG);
  });

  afterEach(() => {
    cleanup();
  });

  it("returns undefined initially, then config after fetch resolves", async () => {
    const { result } = renderHook(() => useEmbedConfig("test-research-id"));

    expect(result.current).toBeUndefined();

    await act(async () => {});

    expect(result.current).toEqual(MOCK_CONFIG);
  });

  it("calls fetchEmbedConfig with researchId and host", async () => {
    renderHook(() =>
      useEmbedConfig("test-research-id", "https://custom.example.com")
    );

    await act(async () => {});

    expect(mockFetchEmbedConfig).toHaveBeenCalledWith(
      "test-research-id",
      "https://custom.example.com"
    );
  });

  it("calls fetchEmbedConfig without host when not provided", async () => {
    renderHook(() => useEmbedConfig("test-research-id"));

    await act(async () => {});

    expect(mockFetchEmbedConfig).toHaveBeenCalledWith(
      "test-research-id",
      undefined
    );
  });

  it("re-fetches when researchId changes", async () => {
    const { rerender } = renderHook(({ id }) => useEmbedConfig(id), {
      initialProps: { id: "research-1" },
    });

    await act(async () => {});
    expect(mockFetchEmbedConfig).toHaveBeenCalledWith("research-1", undefined);

    rerender({ id: "research-2" });
    await act(async () => {});

    expect(mockFetchEmbedConfig).toHaveBeenCalledWith("research-2", undefined);
    expect(mockFetchEmbedConfig).toHaveBeenCalledTimes(2);
  });

  it("re-fetches when host changes", async () => {
    const { rerender } = renderHook(
      ({ host }) => useEmbedConfig("test-id", host),
      { initialProps: { host: "https://host-1.com" } }
    );

    await act(async () => {});

    rerender({ host: "https://host-2.com" });
    await act(async () => {});

    expect(mockFetchEmbedConfig).toHaveBeenCalledTimes(2);
    expect(mockFetchEmbedConfig).toHaveBeenLastCalledWith(
      "test-id",
      "https://host-2.com"
    );
  });

  it("ignores stale fetch results after unmount", async () => {
    let resolvePromise: (value: unknown) => void;
    mockFetchEmbedConfig.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    const { result, unmount } = renderHook(() =>
      useEmbedConfig("test-research-id")
    );

    expect(result.current).toBeUndefined();

    unmount();

    // Resolve after unmount — should not cause state update error
    await act(async () => {
      resolvePromise!(MOCK_CONFIG);
    });
  });
});
