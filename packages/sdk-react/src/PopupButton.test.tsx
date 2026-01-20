import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { PopupButton, type PopupButtonHandle } from "./PopupButton";

// Mock the core embed package
const mockDestroy = vi.fn();
const mockUnmount = vi.fn();

vi.mock("@perspective-ai/sdk", () => ({
  openPopup: vi.fn(() => ({
    unmount: mockUnmount,
    update: vi.fn(),
    destroy: mockDestroy,
    researchId: "test-research-id",
    type: "popup",
    iframe: null,
    container: null,
  })),
}));

import { openPopup } from "@perspective-ai/sdk";
const mockOpenPopup = vi.mocked(openPopup);

describe("PopupButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a button with children", () => {
    render(
      <PopupButton researchId="test-research-id">Open Interview</PopupButton>
    );

    const button = screen.getByRole("button");
    expect(button).toBeDefined();
    expect(button.textContent).toBe("Open Interview");
  });

  it("has correct test id", () => {
    render(<PopupButton researchId="test-research-id">Open</PopupButton>);

    const button = screen.getByTestId("perspective-popup-button");
    expect(button).toBeDefined();
  });

  it("opens popup on click", () => {
    render(<PopupButton researchId="test-research-id">Open</PopupButton>);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(mockOpenPopup).toHaveBeenCalledTimes(1);
    expect(mockOpenPopup).toHaveBeenCalledWith(
      expect.objectContaining({
        researchId: "test-research-id",
      })
    );
  });

  it("closes popup on second click", () => {
    render(<PopupButton researchId="test-research-id">Open</PopupButton>);

    const button = screen.getByRole("button");

    // First click opens
    fireEvent.click(button);
    expect(mockOpenPopup).toHaveBeenCalledTimes(1);

    // Second click closes
    fireEvent.click(button);
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it("passes config to openPopup", () => {
    const onReady = vi.fn();
    const onSubmit = vi.fn();

    render(
      <PopupButton
        researchId="test-research-id"
        params={{ source: "test" }}
        theme="dark"
        host="https://custom.example.com"
        onReady={onReady}
        onSubmit={onSubmit}
      >
        Open
      </PopupButton>
    );

    fireEvent.click(screen.getByRole("button"));

    const config = mockOpenPopup.mock.calls[0]![0];
    expect(config.researchId).toBe("test-research-id");
    expect(config.params).toEqual({ source: "test" });
    expect(config.theme).toBe("dark");
    expect(config.host).toBe("https://custom.example.com");
  });

  it("calls custom onClick handler", () => {
    const onClick = vi.fn();

    render(
      <PopupButton researchId="test-research-id" onClick={onClick}>
        Open
      </PopupButton>
    );

    fireEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(mockOpenPopup).toHaveBeenCalledTimes(1);
  });

  it("does not open popup if onClick prevents default", () => {
    const onClick = vi.fn((e: React.MouseEvent) => e.preventDefault());

    render(
      <PopupButton researchId="test-research-id" onClick={onClick}>
        Open
      </PopupButton>
    );

    fireEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(mockOpenPopup).not.toHaveBeenCalled();
  });

  it("supports controlled mode via open prop", () => {
    const onOpenChange = vi.fn();

    const { rerender } = render(
      <PopupButton
        researchId="test-research-id"
        open={false}
        onOpenChange={onOpenChange}
      >
        Open
      </PopupButton>
    );

    // Should not auto-open
    expect(mockOpenPopup).not.toHaveBeenCalled();

    // When open becomes true, popup should open
    rerender(
      <PopupButton
        researchId="test-research-id"
        open={true}
        onOpenChange={onOpenChange}
      >
        Open
      </PopupButton>
    );

    expect(mockOpenPopup).toHaveBeenCalledTimes(1);

    // When open becomes false, popup should close
    rerender(
      <PopupButton
        researchId="test-research-id"
        open={false}
        onOpenChange={onOpenChange}
      >
        Open
      </PopupButton>
    );

    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it("exposes handle via embedRef", () => {
    const embedRef = createRef<PopupButtonHandle | null>();

    render(
      <PopupButton researchId="test-research-id" embedRef={embedRef}>
        Open
      </PopupButton>
    );

    expect(embedRef.current).not.toBeNull();
    expect(typeof embedRef.current?.open).toBe("function");
    expect(typeof embedRef.current?.close).toBe("function");
    expect(typeof embedRef.current?.toggle).toBe("function");
    expect(embedRef.current?.researchId).toBe("test-research-id");
  });

  it("embedRef.open() opens popup", () => {
    const embedRef = createRef<PopupButtonHandle | null>();

    render(
      <PopupButton researchId="test-research-id" embedRef={embedRef}>
        Open
      </PopupButton>
    );

    embedRef.current?.open();

    expect(mockOpenPopup).toHaveBeenCalledTimes(1);
  });

  it("embedRef.close() closes popup", () => {
    const embedRef = createRef<PopupButtonHandle | null>();

    render(
      <PopupButton researchId="test-research-id" embedRef={embedRef}>
        Open
      </PopupButton>
    );

    // First open
    embedRef.current?.open();
    expect(mockOpenPopup).toHaveBeenCalledTimes(1);

    // Then close
    embedRef.current?.close();
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it("embedRef.toggle() toggles popup state", async () => {
    const embedRef = createRef<PopupButtonHandle | null>();
    const onOpenChange = vi.fn();

    render(
      <PopupButton
        researchId="test-research-id"
        embedRef={embedRef}
        onOpenChange={onOpenChange}
      >
        Open
      </PopupButton>
    );

    // Toggle on
    embedRef.current?.toggle();
    expect(mockOpenPopup).toHaveBeenCalledTimes(1);

    // Toggle off
    embedRef.current?.toggle();
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it("passes button props", () => {
    render(
      <PopupButton
        researchId="test-research-id"
        className="custom-button"
        disabled
        aria-label="Open interview popup"
      >
        Open
      </PopupButton>
    );

    const button = screen.getByRole("button");
    expect(button.classList.contains("custom-button")).toBe(true);
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.getAttribute("aria-label")).toBe("Open interview popup");
  });

  it("has type button", () => {
    render(<PopupButton researchId="test-research-id">Open</PopupButton>);

    const button = screen.getByRole("button");
    expect(button.getAttribute("type")).toBe("button");
  });
});
