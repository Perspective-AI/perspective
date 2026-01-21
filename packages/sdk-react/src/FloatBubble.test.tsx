import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { FloatBubble } from "./FloatBubble";

const mockUnmount = vi.fn();
const mockOpen = vi.fn();
const mockClose = vi.fn();
const mockToggle = vi.fn();
const mockUpdate = vi.fn();

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

  it("renders nothing (bubble is added to document.body)", () => {
    const { container } = render(<FloatBubble researchId="test-research-id" />);

    expect(container.innerHTML).toBe("");
  });

  it("calls createFloatBubble on mount", () => {
    render(<FloatBubble researchId="test-research-id" />);

    expect(mockCreateFloatBubble).toHaveBeenCalledTimes(1);
    expect(mockCreateFloatBubble).toHaveBeenCalledWith(
      expect.objectContaining({
        researchId: "test-research-id",
      })
    );
  });

  it("calls unmount on cleanup", () => {
    const { unmount } = render(<FloatBubble researchId="test-research-id" />);

    expect(mockUnmount).not.toHaveBeenCalled();

    unmount();

    expect(mockUnmount).toHaveBeenCalledTimes(1);
  });

  it("passes config to createFloatBubble", () => {
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

    expect(mockCreateFloatBubble).toHaveBeenCalledTimes(1);
    const config = mockCreateFloatBubble.mock.calls[0]![0];
    expect(config.researchId).toBe("test-research-id");
    expect(config.params).toEqual({ source: "test" });
    expect(config.theme).toBe("dark");
    expect(config.host).toBe("https://custom.example.com");
  });

  it("re-creates float bubble when researchId changes", () => {
    const { rerender } = render(<FloatBubble researchId="research-1" />);

    expect(mockCreateFloatBubble).toHaveBeenCalledTimes(1);

    rerender(<FloatBubble researchId="research-2" />);

    expect(mockUnmount).toHaveBeenCalledTimes(1);
    expect(mockCreateFloatBubble).toHaveBeenCalledTimes(2);
  });

  it("re-creates float bubble when theme changes", () => {
    const { rerender } = render(
      <FloatBubble researchId="test-research-id" theme="light" />
    );

    expect(mockCreateFloatBubble).toHaveBeenCalledTimes(1);

    rerender(<FloatBubble researchId="test-research-id" theme="dark" />);

    expect(mockUnmount).toHaveBeenCalledTimes(1);
    expect(mockCreateFloatBubble).toHaveBeenCalledTimes(2);
  });

  it("passes brand colors to createFloatBubble", () => {
    render(
      <FloatBubble
        researchId="test-research-id"
        brand={{
          light: { primary: "#ff0000", bg: "#ffffff" },
          dark: { primary: "#0000ff", bg: "#000000" },
        }}
      />
    );

    const config = mockCreateFloatBubble.mock.calls[0]![0];
    expect(config.brand).toEqual({
      light: { primary: "#ff0000", bg: "#ffffff" },
      dark: { primary: "#0000ff", bg: "#000000" },
    });
  });
});
