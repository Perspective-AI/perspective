import { describe, it, expect, afterEach, vi } from "vitest";
import { openPopup } from "./popup";
import * as config from "./config";

describe("openPopup", () => {
  afterEach(() => {
    // Clean up any popups left in the DOM
    document
      .querySelectorAll(".perspective-overlay")
      .forEach((el) => el.remove());
    vi.restoreAllMocks();
  });

  it("creates popup overlay in body", () => {
    const handle = openPopup({ researchId: "test-research-id" });

    expect(handle.researchId).toBe("test-research-id");
    expect(handle.type).toBe("popup");
    expect(document.querySelector(".perspective-overlay")).toBeTruthy();
    expect(document.querySelector(".perspective-modal")).toBeTruthy();

    handle.destroy();
  });

  it("creates iframe inside modal", () => {
    const handle = openPopup({ researchId: "test-research-id" });

    const iframe = document.querySelector(
      ".perspective-modal iframe[data-perspective]"
    );
    expect(iframe).toBeTruthy();

    handle.destroy();
  });

  it("creates close button", () => {
    const handle = openPopup({ researchId: "test-research-id" });

    const closeBtn = document.querySelector(".perspective-close");
    expect(closeBtn).toBeTruthy();
    expect(closeBtn?.getAttribute("aria-label")).toBe("Close");

    handle.destroy();
  });

  it("creates loading indicator", () => {
    const handle = openPopup({ researchId: "test-research-id" });

    const loading = document.querySelector(".perspective-loading");
    expect(loading).toBeTruthy();

    handle.destroy();
  });

  it("returns no-op handle when no DOM", () => {
    vi.spyOn(config, "hasDom").mockReturnValue(false);

    const handle = openPopup({ researchId: "test-research-id" });

    expect(handle.iframe).toBeNull();
    expect(handle.container).toBeNull();
    expect(document.querySelector(".perspective-overlay")).toBeFalsy();
  });

  it("destroy removes overlay", () => {
    const handle = openPopup({ researchId: "test-research-id" });

    expect(document.querySelector(".perspective-overlay")).toBeTruthy();

    handle.destroy();

    expect(document.querySelector(".perspective-overlay")).toBeFalsy();
  });

  it("close button click hides popup and fires onClose", () => {
    const onClose = vi.fn();
    const handle = openPopup({
      researchId: "test-research-id",
      onClose,
    });

    const closeBtn = document.querySelector(
      ".perspective-close"
    ) as HTMLElement;
    closeBtn.click();

    expect(onClose).toHaveBeenCalled();
    // Overlay stays in DOM but is hidden
    const overlay = document.querySelector(
      ".perspective-overlay"
    ) as HTMLElement;
    expect(overlay).toBeTruthy();
    expect(overlay.style.display).toBe("none");
    expect(handle.isOpen).toBe(false);

    handle.destroy();
  });

  it("clicking overlay background hides popup", () => {
    const onClose = vi.fn();
    const handle = openPopup({
      researchId: "test-research-id",
      onClose,
    });

    const overlay = document.querySelector(
      ".perspective-overlay"
    ) as HTMLElement;
    overlay.click();

    expect(onClose).toHaveBeenCalled();
    expect(overlay.style.display).toBe("none");

    handle.destroy();
  });

  it("clicking modal does not close popup", () => {
    const onClose = vi.fn();
    openPopup({
      researchId: "test-research-id",
      onClose,
    });

    const modal = document.querySelector(".perspective-modal") as HTMLElement;
    modal.click();

    expect(onClose).not.toHaveBeenCalled();
    expect(document.querySelector(".perspective-overlay")).toBeTruthy();

    // Clean up
    (document.querySelector(".perspective-close") as HTMLElement).click();
  });

  it("ESC key hides popup", () => {
    const onClose = vi.fn();
    const handle = openPopup({
      researchId: "test-research-id",
      onClose,
    });

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(onClose).toHaveBeenCalled();
    const overlay = document.querySelector(
      ".perspective-overlay"
    ) as HTMLElement;
    expect(overlay.style.display).toBe("none");

    handle.destroy();
  });

  it("unmount removes overlay from DOM", () => {
    const handle = openPopup({
      researchId: "test-research-id",
    });

    handle.unmount();

    expect(document.querySelector(".perspective-overlay")).toBeFalsy();
  });

  it("show() restores hidden popup", () => {
    const handle = openPopup({
      researchId: "test-research-id",
    });

    handle.hide();
    expect(handle.isOpen).toBe(false);

    handle.show();
    expect(handle.isOpen).toBe(true);
    const overlay = document.querySelector(
      ".perspective-overlay"
    ) as HTMLElement;
    expect(overlay.style.display).toBe("");

    handle.destroy();
  });

  it("update modifies config", () => {
    const onSubmit = vi.fn();
    const handle = openPopup({
      researchId: "test-research-id",
    });

    expect(() => handle.update({ onSubmit })).not.toThrow();

    handle.destroy();
  });

  it("applies theme class", () => {
    const handle = openPopup({
      researchId: "test-research-id",
      theme: "dark",
    });

    const overlay = document.querySelector(".perspective-overlay");
    expect(overlay?.classList.contains("perspective-dark-theme")).toBe(true);

    handle.destroy();
  });

  it("uses custom host", () => {
    const handle = openPopup({
      researchId: "test-research-id",
      host: "https://custom.example.com",
    });

    const iframe = handle.iframe as HTMLIFrameElement;
    expect(iframe.src).toContain("https://custom.example.com");

    handle.destroy();
  });

  describe("update() behavior", () => {
    const host = "https://getperspective.ai";
    const researchId = "test-research-id";

    const sendMessage = (
      iframe: HTMLIFrameElement,
      type: string,
      extra?: Record<string, unknown>
    ) => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type, researchId, ...extra },
          origin: host,
          source: iframe.contentWindow,
        })
      );
    };

    it("update changes which callback is invoked", () => {
      const onSubmit1 = vi.fn();
      const onSubmit2 = vi.fn();

      const handle = openPopup({
        researchId,
        host,
        onSubmit: onSubmit1,
      });

      // Update to new callback
      handle.update({ onSubmit: onSubmit2 });

      // Send submit message
      sendMessage(handle.iframe!, "perspective:submit");

      // New callback should be called, old one should not
      expect(onSubmit2).toHaveBeenCalledTimes(1);
      expect(onSubmit1).not.toHaveBeenCalled();

      handle.destroy();
    });

    it("sequential updates only use latest callback", () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const fn3 = vi.fn();

      const handle = openPopup({
        researchId,
        host,
        onSubmit: fn1,
      });

      // Update twice
      handle.update({ onSubmit: fn2 });
      handle.update({ onSubmit: fn3 });

      // Send submit message
      sendMessage(handle.iframe!, "perspective:submit");

      // Only the latest callback should be called
      expect(fn3).toHaveBeenCalledTimes(1);
      expect(fn2).not.toHaveBeenCalled();
      expect(fn1).not.toHaveBeenCalled();

      handle.destroy();
    });

    it("destroy prevents further callback invocations", () => {
      const onSubmit = vi.fn();
      const onClose = vi.fn();

      const handle = openPopup({
        researchId,
        host,
        onSubmit,
        onClose,
      });

      const iframe = handle.iframe!;

      // fullDestroy fires onClose once (was open), then tears down listeners
      handle.destroy();
      expect(onClose).toHaveBeenCalledTimes(1);

      // Subsequent messages should not trigger callbacks
      sendMessage(iframe, "perspective:submit");
      sendMessage(iframe, "perspective:close");

      expect(onSubmit).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("update after destroy is safe (no-op)", () => {
      const handle = openPopup({
        researchId,
        host,
      });

      handle.destroy();

      // Should not throw
      expect(() => handle.update({ onSubmit: vi.fn() })).not.toThrow();
    });

    it("update preserves other config values", () => {
      const onReady = vi.fn();
      const onSubmit1 = vi.fn();
      const onSubmit2 = vi.fn();

      const handle = openPopup({
        researchId,
        host,
        onReady,
        onSubmit: onSubmit1,
      });

      // Update only onSubmit
      handle.update({ onSubmit: onSubmit2 });

      // onReady should still work
      sendMessage(handle.iframe!, "perspective:ready");
      expect(onReady).toHaveBeenCalledTimes(1);

      // New onSubmit should work
      sendMessage(handle.iframe!, "perspective:submit");
      expect(onSubmit2).toHaveBeenCalledTimes(1);
      expect(onSubmit1).not.toHaveBeenCalled();

      handle.destroy();
    });
  });

  it("hide is idempotent", () => {
    const onClose = vi.fn();
    const handle = openPopup({
      researchId: "test-research-id",
      onClose,
    });

    handle.hide();
    handle.hide();
    handle.hide();

    // onClose only called once
    expect(onClose).toHaveBeenCalledTimes(1);

    handle.destroy();
  });
});
