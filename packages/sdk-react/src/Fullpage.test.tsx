import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { createRef } from "react";
import { Fullpage } from "./Fullpage";
import type { EmbedHandle } from "@perspective-ai/sdk";

const mockUnmount = vi.fn();
const mockUpdate = vi.fn();

// Stable reference so useEmbedConfig doesn't trigger extra effect runs
const mockEmbedConfig = {
  primaryColor: "#7c3aed",
  textColor: "#ffffff",
  darkPrimaryColor: "#a78bfa",
  darkTextColor: "#ffffff",
};

vi.mock("@perspective-ai/sdk", () => ({
  createFullpage: vi.fn(() => ({
    unmount: mockUnmount,
    update: mockUpdate,
    destroy: mockUnmount,
    researchId: "test-research-id",
    type: "fullpage",
    iframe: null,
    container: null,
  })),
  fetchEmbedConfig: vi.fn(() => Promise.resolve(mockEmbedConfig)),
}));

import { createFullpage } from "@perspective-ai/sdk";
const mockCreateFullpage = vi.mocked(createFullpage);

describe("Fullpage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders nothing (fullpage overlay is added to document.body)", async () => {
    const { container } = render(<Fullpage researchId="test-research-id" />);
    await act(async () => {});

    expect(container.innerHTML).toBe("");
  });

  it("calls createFullpage on mount", async () => {
    render(<Fullpage researchId="test-research-id" />);
    await act(async () => {});

    expect(mockCreateFullpage).toHaveBeenCalledTimes(1);
    expect(mockCreateFullpage).toHaveBeenCalledWith(
      expect.objectContaining({
        researchId: "test-research-id",
      })
    );
  });

  it("calls unmount on cleanup", async () => {
    const { unmount } = render(<Fullpage researchId="test-research-id" />);
    await act(async () => {});

    expect(mockUnmount).not.toHaveBeenCalled();

    unmount();

    expect(mockUnmount).toHaveBeenCalledTimes(1);
  });

  it("passes config to createFullpage", async () => {
    const onReady = vi.fn();
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    const onError = vi.fn();

    render(
      <Fullpage
        researchId="test-research-id"
        params={{ source: "test" }}
        theme="dark"
        host="https://custom.example.com"
        onReady={onReady}
        onSubmit={onSubmit}
        onClose={onClose}
        onNavigate={onNavigate}
        onError={onError}
      />
    );
    await act(async () => {});

    expect(mockCreateFullpage).toHaveBeenCalledTimes(1);
    const config = mockCreateFullpage.mock.calls[0]![0];
    expect(config.researchId).toBe("test-research-id");
    expect(config.params).toEqual({ source: "test" });
    expect(config.theme).toBe("dark");
    expect(config.host).toBe("https://custom.example.com");
  });

  it("passes _apiConfig from fetched embed config", async () => {
    render(<Fullpage researchId="test-research-id" />);
    await act(async () => {});

    expect(mockCreateFullpage).toHaveBeenCalledTimes(1);
    const config = mockCreateFullpage.mock.calls[0]![0];
    expect(config._apiConfig).toEqual(mockEmbedConfig);
  });

  it("exposes handle via embedRef", async () => {
    const mockHandle: EmbedHandle = {
      unmount: mockUnmount,
      update: mockUpdate,
      destroy: mockUnmount,
      researchId: "test-research-id",
      type: "fullpage",
      iframe: null,
      container: null,
    };
    mockCreateFullpage.mockReturnValueOnce(mockHandle);

    const embedRef = createRef<EmbedHandle | null>();

    render(<Fullpage researchId="test-research-id" embedRef={embedRef} />);
    await act(async () => {});

    expect(embedRef.current).toBe(mockHandle);
  });

  it("clears embedRef on unmount", async () => {
    const embedRef = createRef<EmbedHandle | null>();

    const { unmount } = render(
      <Fullpage researchId="test-research-id" embedRef={embedRef} />
    );
    await act(async () => {});

    expect(embedRef.current).not.toBeNull();

    unmount();

    expect(embedRef.current).toBeNull();
  });

  it("re-creates fullpage when researchId changes", async () => {
    const { rerender } = render(<Fullpage researchId="research-1" />);
    await act(async () => {});

    expect(mockCreateFullpage).toHaveBeenCalledTimes(1);

    rerender(<Fullpage researchId="research-2" />);
    await act(async () => {});

    expect(mockUnmount).toHaveBeenCalledTimes(1);
    expect(mockCreateFullpage).toHaveBeenCalledTimes(2);
  });

  it("re-creates fullpage when theme changes", async () => {
    const { rerender } = render(
      <Fullpage researchId="test-research-id" theme="light" />
    );
    await act(async () => {});

    expect(mockCreateFullpage).toHaveBeenCalledTimes(1);

    rerender(<Fullpage researchId="test-research-id" theme="dark" />);
    await act(async () => {});

    expect(mockUnmount).toHaveBeenCalledTimes(1);
    expect(mockCreateFullpage).toHaveBeenCalledTimes(2);
  });

  it("passes brand colors to createFullpage", async () => {
    render(
      <Fullpage
        researchId="test-research-id"
        brand={{
          light: { primary: "#ff0000", bg: "#ffffff" },
          dark: { primary: "#0000ff", bg: "#000000" },
        }}
      />
    );
    await act(async () => {});

    const config = mockCreateFullpage.mock.calls[0]![0];
    expect(config.brand).toEqual({
      light: { primary: "#ff0000", bg: "#ffffff" },
      dark: { primary: "#0000ff", bg: "#000000" },
    });
  });
});
