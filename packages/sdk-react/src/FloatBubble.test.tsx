import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { FloatBubble } from "./FloatBubble";

const mockUnmount = vi.fn();
const mockOpen = vi.fn();
const mockClose = vi.fn();
const mockToggle = vi.fn();
const mockUpdate = vi.fn();

// Stable reference so useEmbedConfig doesn't trigger extra effect runs
const mockEmbedConfig = {
  primaryColor: "#7c3aed",
  textColor: "#ffffff",
  darkPrimaryColor: "#a78bfa",
  darkTextColor: "#ffffff",
};

vi.mock("@perspective-ai/sdk", () => ({
  createFloatBubble: vi.fn(() => ({
    unmount: mockUnmount,
    update: mockUpdate,
    destroy: mockUnmount,
    open: mockOpen,
    close: mockClose,
    toggle: mockToggle,
    researchId: "test-research-id",
    type: "float",
    iframe: null,
    container: null,
    isOpen: false,
  })),
  fetchEmbedConfig: vi.fn(() => Promise.resolve(mockEmbedConfig)),
}));

import { createFloatBubble } from "@perspective-ai/sdk";
const mockCreateFloatBubble = vi.mocked(createFloatBubble);

describe("FloatBubble", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders only attribution metadata (bubble is added to document.body)", async () => {
    const { container } = render(<FloatBubble researchId="test-research-id" />);
    await act(async () => {});

    expect(
      container.querySelector("script[data-perspective-jsonld]")
    ).toBeTruthy();
    // No visible DOM elements — only the JSON-LD script tag
    expect(container.querySelectorAll(":not(script)")).toHaveLength(0);
  });

  it("calls createFloatBubble on mount", async () => {
    render(<FloatBubble researchId="test-research-id" />);
    await act(async () => {});

    expect(mockCreateFloatBubble).toHaveBeenCalledTimes(1);
    expect(mockCreateFloatBubble).toHaveBeenCalledWith(
      expect.objectContaining({
        researchId: "test-research-id",
      })
    );
  });

  it("calls unmount on cleanup", async () => {
    const { unmount } = render(<FloatBubble researchId="test-research-id" />);
    await act(async () => {});

    expect(mockUnmount).not.toHaveBeenCalled();

    unmount();

    expect(mockUnmount).toHaveBeenCalledTimes(1);
  });

  it("passes config to createFloatBubble", async () => {
    const onReady = vi.fn();
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    const onError = vi.fn();

    render(
      <FloatBubble
        researchId="test-research-id"
        params={{ source: "test" }}
        theme="dark"
        host="https://custom.example.com"
        onReady={onReady}
        onSubmit={onSubmit}
        onClose={onClose}
        onError={onError}
      />
    );
    await act(async () => {});

    expect(mockCreateFloatBubble).toHaveBeenCalledTimes(1);
    const config = mockCreateFloatBubble.mock.calls[0]![0];
    expect(config.researchId).toBe("test-research-id");
    expect(config.params).toEqual({ source: "test" });
    expect(config.theme).toBe("dark");
    expect(config.host).toBe("https://custom.example.com");
  });

  it("re-creates float bubble when researchId changes", async () => {
    const { rerender } = render(<FloatBubble researchId="research-1" />);
    await act(async () => {});

    expect(mockCreateFloatBubble).toHaveBeenCalledTimes(1);

    rerender(<FloatBubble researchId="research-2" />);
    await act(async () => {});

    expect(mockUnmount).toHaveBeenCalledTimes(1);
    expect(mockCreateFloatBubble).toHaveBeenCalledTimes(2);
  });

  it("re-creates float bubble when theme changes", async () => {
    const { rerender } = render(
      <FloatBubble researchId="test-research-id" theme="light" />
    );
    await act(async () => {});

    expect(mockCreateFloatBubble).toHaveBeenCalledTimes(1);

    rerender(<FloatBubble researchId="test-research-id" theme="dark" />);
    await act(async () => {});

    expect(mockUnmount).toHaveBeenCalledTimes(1);
    expect(mockCreateFloatBubble).toHaveBeenCalledTimes(2);
  });

  it("passes brand colors to createFloatBubble", async () => {
    render(
      <FloatBubble
        researchId="test-research-id"
        brand={{
          light: { primary: "#ff0000", bg: "#ffffff" },
          dark: { primary: "#0000ff", bg: "#000000" },
        }}
      />
    );
    await act(async () => {});

    const config = mockCreateFloatBubble.mock.calls[0]![0];
    expect(config.brand).toEqual({
      light: { primary: "#ff0000", bg: "#ffffff" },
      dark: { primary: "#0000ff", bg: "#000000" },
    });
  });
});
