import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { SliderButton, type SliderButtonHandle } from "./SliderButton";

const mockDestroy = vi.fn();
const mockUnmount = vi.fn();

vi.mock("@perspective/sdk", () => ({
  openSlider: vi.fn(() => ({
    unmount: mockUnmount,
    update: vi.fn(),
    destroy: mockDestroy,
    researchId: "test-research-id",
    type: "slider",
    iframe: null,
    container: null,
  })),
}));

import { openSlider } from "@perspective/sdk";
const mockOpenSlider = vi.mocked(openSlider);

describe("SliderButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a button with children", () => {
    render(
      <SliderButton researchId="test-research-id">Open Interview</SliderButton>
    );

    const button = screen.getByRole("button");
    expect(button).toBeDefined();
    expect(button.textContent).toBe("Open Interview");
  });

  it("has correct test id", () => {
    render(<SliderButton researchId="test-research-id">Open</SliderButton>);

    const button = screen.getByTestId("perspective-slider-button");
    expect(button).toBeDefined();
  });

  it("opens slider on click", () => {
    render(<SliderButton researchId="test-research-id">Open</SliderButton>);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(mockOpenSlider).toHaveBeenCalledTimes(1);
    expect(mockOpenSlider).toHaveBeenCalledWith(
      expect.objectContaining({
        researchId: "test-research-id",
      })
    );
  });

  it("closes slider on second click", () => {
    render(<SliderButton researchId="test-research-id">Open</SliderButton>);

    const button = screen.getByRole("button");

    fireEvent.click(button);
    expect(mockOpenSlider).toHaveBeenCalledTimes(1);

    fireEvent.click(button);
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it("passes config to openSlider", () => {
    const onReady = vi.fn();
    const onSubmit = vi.fn();

    render(
      <SliderButton
        researchId="test-research-id"
        params={{ source: "test" }}
        theme="dark"
        host="https://custom.example.com"
        onReady={onReady}
        onSubmit={onSubmit}
      >
        Open
      </SliderButton>
    );

    fireEvent.click(screen.getByRole("button"));

    const config = mockOpenSlider.mock.calls[0]![0];
    expect(config.researchId).toBe("test-research-id");
    expect(config.params).toEqual({ source: "test" });
    expect(config.theme).toBe("dark");
    expect(config.host).toBe("https://custom.example.com");
  });

  it("calls custom onClick handler", () => {
    const onClick = vi.fn();

    render(
      <SliderButton researchId="test-research-id" onClick={onClick}>
        Open
      </SliderButton>
    );

    fireEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(mockOpenSlider).toHaveBeenCalledTimes(1);
  });

  it("does not open slider if onClick prevents default", () => {
    const onClick = vi.fn((e: React.MouseEvent) => e.preventDefault());

    render(
      <SliderButton researchId="test-research-id" onClick={onClick}>
        Open
      </SliderButton>
    );

    fireEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(mockOpenSlider).not.toHaveBeenCalled();
  });

  it("supports controlled mode via open prop", () => {
    const onOpenChange = vi.fn();

    const { rerender } = render(
      <SliderButton
        researchId="test-research-id"
        open={false}
        onOpenChange={onOpenChange}
      >
        Open
      </SliderButton>
    );

    expect(mockOpenSlider).not.toHaveBeenCalled();

    rerender(
      <SliderButton
        researchId="test-research-id"
        open={true}
        onOpenChange={onOpenChange}
      >
        Open
      </SliderButton>
    );

    expect(mockOpenSlider).toHaveBeenCalledTimes(1);

    rerender(
      <SliderButton
        researchId="test-research-id"
        open={false}
        onOpenChange={onOpenChange}
      >
        Open
      </SliderButton>
    );

    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it("exposes handle via embedRef", () => {
    const embedRef = createRef<SliderButtonHandle | null>();

    render(
      <SliderButton researchId="test-research-id" embedRef={embedRef}>
        Open
      </SliderButton>
    );

    expect(embedRef.current).not.toBeNull();
    expect(typeof embedRef.current?.open).toBe("function");
    expect(typeof embedRef.current?.close).toBe("function");
    expect(typeof embedRef.current?.toggle).toBe("function");
    expect(embedRef.current?.researchId).toBe("test-research-id");
  });

  it("embedRef.open() opens slider", () => {
    const embedRef = createRef<SliderButtonHandle | null>();

    render(
      <SliderButton researchId="test-research-id" embedRef={embedRef}>
        Open
      </SliderButton>
    );

    embedRef.current?.open();

    expect(mockOpenSlider).toHaveBeenCalledTimes(1);
  });

  it("embedRef.close() closes slider", () => {
    const embedRef = createRef<SliderButtonHandle | null>();

    render(
      <SliderButton researchId="test-research-id" embedRef={embedRef}>
        Open
      </SliderButton>
    );

    embedRef.current?.open();
    expect(mockOpenSlider).toHaveBeenCalledTimes(1);

    embedRef.current?.close();
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it("embedRef.toggle() toggles slider state", () => {
    const embedRef = createRef<SliderButtonHandle | null>();
    const onOpenChange = vi.fn();

    render(
      <SliderButton
        researchId="test-research-id"
        embedRef={embedRef}
        onOpenChange={onOpenChange}
      >
        Open
      </SliderButton>
    );

    embedRef.current?.toggle();
    expect(mockOpenSlider).toHaveBeenCalledTimes(1);

    embedRef.current?.toggle();
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it("passes button props", () => {
    render(
      <SliderButton
        researchId="test-research-id"
        className="custom-button"
        disabled
        aria-label="Open interview slider"
      >
        Open
      </SliderButton>
    );

    const button = screen.getByRole("button");
    expect(button.classList.contains("custom-button")).toBe(true);
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.getAttribute("aria-label")).toBe("Open interview slider");
  });

  it("has type button", () => {
    render(<SliderButton researchId="test-research-id">Open</SliderButton>);

    const button = screen.getByRole("button");
    expect(button.getAttribute("type")).toBe("button");
  });

  it("clears embedRef on unmount", () => {
    const embedRef = createRef<SliderButtonHandle | null>();

    const { unmount } = render(
      <SliderButton researchId="test-research-id" embedRef={embedRef}>
        Open
      </SliderButton>
    );

    expect(embedRef.current).not.toBeNull();

    unmount();

    expect(embedRef.current).toBeNull();
  });
});
