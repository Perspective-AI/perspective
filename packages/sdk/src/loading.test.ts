import { describe, it, expect, beforeEach, vi } from "vitest";
import { createLoadingIndicator } from "./loading";

describe("createLoadingIndicator", () => {
  beforeEach(async () => {
    // Clean up injected shimmer keyframes and reset module state
    document.getElementById("perspective-shimmer-keyframes")?.remove();
    // Re-import module to reset shimmerInjected flag
    vi.resetModules();
  });

  it("returns an element with perspective-loading class", () => {
    const el = createLoadingIndicator();
    expect(el.className).toBe("perspective-loading");
  });

  it("renders skeleton card with 4 shimmer lines", () => {
    const el = createLoadingIndicator();
    const card = el.children[0] as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.style.borderRadius).toBe("16px");
    // Title + 3 body lines = 4 shimmer divs
    expect(card.children).toHaveLength(4);
  });

  it("renders chat input area with button skeleton", () => {
    const el = createLoadingIndicator();
    const inputArea = el.children[1] as HTMLElement;
    expect(inputArea).toBeTruthy();
    expect(inputArea.style.borderRadius).toBe("28px");
    const button = inputArea.children[0] as HTMLElement;
    expect(button).toBeTruthy();
    expect(button.style.borderRadius).toBe("9999px");
  });

  it("applies shimmer animation to skeleton lines", () => {
    const el = createLoadingIndicator();
    const card = el.children[0] as HTMLElement;
    const firstLine = card.children[0] as HTMLElement;
    expect(firstLine.style.animation).toContain("perspective-shimmer");
  });

  it("injects shimmer keyframes into document head", async () => {
    const { createLoadingIndicator: create } = await import("./loading");
    create();
    const style = document.getElementById("perspective-shimmer-keyframes");
    expect(style).toBeTruthy();
    expect(style?.textContent).toContain("@keyframes perspective-shimmer");
  });

  it("injects shimmer keyframes only once across multiple calls", async () => {
    const { createLoadingIndicator: create } = await import("./loading");
    create();
    create();
    const styles = document.querySelectorAll("#perspective-shimmer-keyframes");
    expect(styles).toHaveLength(1);
  });

  it("uses light theme colors by default", () => {
    const el = createLoadingIndicator();
    expect(el.style.background).toBe("#ffffff");
  });

  it("uses dark theme colors when specified", () => {
    const el = createLoadingIndicator({ theme: "dark" });
    expect(el.style.background).toBe("#02040a");
  });

  it("uses brand bg color when provided", () => {
    const el = createLoadingIndicator({
      theme: "light",
      brand: { light: { primary: "#ff0000", bg: "#fef2f2" } },
    });
    expect(el.style.background).toBe("#fef2f2");
  });

  it("uses dark brand bg when dark theme", () => {
    const el = createLoadingIndicator({
      theme: "dark",
      brand: { dark: { primary: "#ef4444", bg: "#1a0000" } },
    });
    expect(el.style.background).toBe("#1a0000");
  });

  it("falls back to default bg when brand has no bg", () => {
    const el = createLoadingIndicator({
      theme: "light",
      brand: { light: { primary: "#ff0000" } },
    });
    expect(el.style.background).toBe("#ffffff");
  });

  it("container uses flex column layout", () => {
    const el = createLoadingIndicator();
    expect(el.style.display).toBe("flex");
    expect(el.style.flexDirection).toBe("column");
  });

  it("is removable from DOM", () => {
    const el = createLoadingIndicator();
    document.body.appendChild(el);
    expect(document.querySelector(".perspective-loading")).toBeTruthy();
    el.remove();
    expect(document.querySelector(".perspective-loading")).toBeFalsy();
  });
});
