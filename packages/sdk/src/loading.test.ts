import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createLoadingIndicator } from "./loading";

describe("createLoadingIndicator", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns an element with perspective-loading class", () => {
    const el = createLoadingIndicator();
    expect(el.className).toBe("perspective-loading");
  });

  it("renders header with logo and progress bar", () => {
    const el = createLoadingIndicator();
    const header = el.children[0] as HTMLElement;
    expect(header.children.length).toBe(2); // logo + progress bar
  });

  it("renders welcome card with avatar, name, title, and body lines", () => {
    const el = createLoadingIndicator();
    const card = el.children[1] as HTMLElement;
    expect(card.style.borderRadius).toBe("16px");
    // Avatar row + title + 3 body lines = 5 children
    expect(card.children.length).toBe(5);
    // Avatar row has circle + name
    const avatarRow = card.children[0] as HTMLElement;
    const avatar = avatarRow.children[0] as HTMLElement;
    expect(avatar.style.borderRadius).toBe("50%");
  });

  it("renders chat message lines below card", () => {
    const el = createLoadingIndicator();
    const message = el.children[2] as HTMLElement;
    // 2 text lines + icon = 3 children
    expect(message.children.length).toBe(3);
  });

  it("renders input area with pill button", () => {
    const el = createLoadingIndicator();
    const inputArea = el.children[3] as HTMLElement;
    expect(inputArea.style.borderRadius).toBe("28px");
    const pill = inputArea.firstElementChild as HTMLElement;
    expect(pill.style.borderRadius).toBe("9999px");
  });

  it("does not render footer hint line", () => {
    const el = createLoadingIndicator();
    const footer = el.children[4] as HTMLElement;
    expect(footer).toBeFalsy();
  });

  it("shimmer elements have animation applied", () => {
    const el = createLoadingIndicator();
    const header = el.children[0] as HTMLElement;
    const logo = header.firstElementChild as HTMLElement;
    expect(logo.style.animation).toContain("perspective-shimmer");
  });

  it("uses light theme background by default", () => {
    const el = createLoadingIndicator();
    expect(el.style.background).toBe("#ffffff");
  });

  it("uses dark theme background when specified", () => {
    const el = createLoadingIndicator({ theme: "dark" });
    expect(el.style.background).toBe("#02040a");
  });

  it("uses brand bg color when provided", () => {
    const el = createLoadingIndicator({
      brand: { light: { bg: "#1a3a2a" } },
    });
    expect(el.style.background).toBe("#1a3a2a");
  });

  it("has column layout with padding", () => {
    const el = createLoadingIndicator();
    expect(el.style.flexDirection).toBe("column");
    expect(el.style.padding).toBe("1.5rem");
  });

  it("hides logo when hideBranding is true", () => {
    const el = createLoadingIndicator({ appearance: { hideBranding: true } });
    // Header should only have progress bar, no logo
    const header = el.children[0] as HTMLElement;
    expect(header.children.length).toBe(1);
  });

  it("hides progress bar when hideProgress is true", () => {
    const el = createLoadingIndicator({ appearance: { hideProgress: true } });
    // Header should only have logo, no progress bar
    const header = el.children[0] as HTMLElement;
    expect(header.children.length).toBe(1);
  });

  it("hides entire header when both hideBranding and hideProgress", () => {
    const defaultEl = createLoadingIndicator();
    const hiddenEl = createLoadingIndicator({
      appearance: { hideBranding: true, hideProgress: true },
    });
    // One fewer child (no header section)
    expect(hiddenEl.children.length).toBe(defaultEl.children.length - 1);
  });

  it("hides welcome card when hideGreeting is true", () => {
    const el = createLoadingIndicator({ appearance: { hideGreeting: true } });
    // Should have header, message, input, footer — no card
    const children = Array.from(el.children);
    const hasCard = children.some(
      (c) => (c as HTMLElement).style.borderRadius === "16px"
    );
    expect(hasCard).toBe(false);
  });
});
