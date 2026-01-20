import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { createRef } from "react";
import { Fullpage } from "./Fullpage";
import type { EmbedHandle } from "@perspective-ai/sdk";

const mockUnmount = vi.fn();
const mockUpdate = vi.fn();

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

  it("renders nothing (fullpage overlay is added to document.body)", () => {
    const { container } = render(<Fullpage researchId="test-research-id" />);

    expect(container.innerHTML).toBe("");
  });

  it("calls createFullpage on mount", () => {
    render(<Fullpage researchId="test-research-id" />);

    expect(mockCreateFullpage).toHaveBeenCalledTimes(1);
    expect(mockCreateFullpage).toHaveBeenCalledWith(
      expect.objectContaining({
        researchId: "test-research-id",
      })
    );
  });

  it("calls unmount on cleanup", () => {
    const { unmount } = render(<Fullpage researchId="test-research-id" />);

    expect(mockUnmount).not.toHaveBeenCalled();

    unmount();

    expect(mockUnmount).toHaveBeenCalledTimes(1);
  });

  it("passes config to createFullpage", () => {
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

    expect(mockCreateFullpage).toHaveBeenCalledTimes(1);
    const config = mockCreateFullpage.mock.calls[0]![0];
    expect(config.researchId).toBe("test-research-id");
    expect(config.params).toEqual({ source: "test" });
    expect(config.theme).toBe("dark");
    expect(config.host).toBe("https://custom.example.com");
  });

  it("exposes handle via embedRef", () => {
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

    expect(embedRef.current).toBe(mockHandle);
  });

  it("clears embedRef on unmount", () => {
    const embedRef = createRef<EmbedHandle | null>();

    const { unmount } = render(
      <Fullpage researchId="test-research-id" embedRef={embedRef} />
    );

    expect(embedRef.current).not.toBeNull();

    unmount();

    expect(embedRef.current).toBeNull();
  });

  it("re-creates fullpage when researchId changes", () => {
    const { rerender } = render(<Fullpage researchId="research-1" />);

    expect(mockCreateFullpage).toHaveBeenCalledTimes(1);

    rerender(<Fullpage researchId="research-2" />);

    expect(mockUnmount).toHaveBeenCalledTimes(1);
    expect(mockCreateFullpage).toHaveBeenCalledTimes(2);
  });

  it("re-creates fullpage when theme changes", () => {
    const { rerender } = render(
      <Fullpage researchId="test-research-id" theme="light" />
    );

    expect(mockCreateFullpage).toHaveBeenCalledTimes(1);

    rerender(<Fullpage researchId="test-research-id" theme="dark" />);

    expect(mockUnmount).toHaveBeenCalledTimes(1);
    expect(mockCreateFullpage).toHaveBeenCalledTimes(2);
  });

  it("passes brand colors to createFullpage", () => {
    render(
      <Fullpage
        researchId="test-research-id"
        brand={{
          light: { primary: "#ff0000", bg: "#ffffff" },
          dark: { primary: "#0000ff", bg: "#000000" },
        }}
      />
    );

    const config = mockCreateFullpage.mock.calls[0]![0];
    expect(config.brand).toEqual({
      light: { primary: "#ff0000", bg: "#ffffff" },
      dark: { primary: "#0000ff", bg: "#000000" },
    });
  });
});
