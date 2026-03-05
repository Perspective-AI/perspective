import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { openSlider } from "./slider";
import * as config from "./config";

describe("openSlider", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("creates slider with backdrop", () => {
    const handle = openSlider({
      researchId: "test-research-id",
    });

    expect(handle.researchId).toBe("test-research-id");
    expect(handle.type).toBe("slider");
    expect(handle.iframe).toBeInstanceOf(HTMLIFrameElement);
    expect(document.querySelector(".perspective-slider")).toBeTruthy();
    expect(document.querySelector(".perspective-slider-backdrop")).toBeTruthy();

    handle.unmount();
  });

  it("creates loading indicator", () => {
    const handle = openSlider({
      researchId: "test-research-id",
    });

    const loading = document.querySelector(".perspective-loading");
    expect(loading).toBeTruthy();

    handle.unmount();
  });

  it("returns no-op handle when no DOM", () => {
    vi.spyOn(config, "hasDom").mockReturnValue(false);

    const handle = openSlider({
      researchId: "test-research-id",
    });

    expect(handle.iframe).toBeNull();
    expect(handle.container).toBeNull();
    expect(handle.unmount).toBeInstanceOf(Function);
    expect(() => handle.unmount()).not.toThrow();
  });

  it("unmount removes slider and backdrop", () => {
    const handle = openSlider({
      researchId: "test-research-id",
    });

    expect(document.querySelector(".perspective-slider")).toBeTruthy();
    expect(document.querySelector(".perspective-slider-backdrop")).toBeTruthy();

    handle.unmount();

    expect(document.querySelector(".perspective-slider")).toBeFalsy();
    expect(document.querySelector(".perspective-slider-backdrop")).toBeFalsy();
  });

  it("destroy is alias for unmount", () => {
    const handle = openSlider({
      researchId: "test-research-id",
    });

    expect(document.querySelector(".perspective-slider")).toBeTruthy();

    handle.destroy();

    expect(document.querySelector(".perspective-slider")).toBeFalsy();
  });

  it("close button hides slider and fires onClose", () => {
    const onClose = vi.fn();
    const handle = openSlider({
      researchId: "test-research-id",
      onClose,
    });

    const closeBtn = document.querySelector(
      ".perspective-slider .perspective-close"
    ) as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();

    closeBtn.click();

    const slider = document.querySelector(".perspective-slider") as HTMLElement;
    expect(slider.style.display).toBe("none");
    expect(onClose).toHaveBeenCalled();
    expect(handle.isOpen).toBe(false);

    handle.destroy();
  });

  it("backdrop click hides slider", () => {
    const onClose = vi.fn();
    const handle = openSlider({
      researchId: "test-research-id",
      onClose,
    });

    const backdrop = document.querySelector(
      ".perspective-slider-backdrop"
    ) as HTMLElement;
    expect(backdrop).toBeTruthy();

    backdrop.click();

    expect(backdrop.style.display).toBe("none");
    expect(onClose).toHaveBeenCalled();

    handle.destroy();
  });

  it("ESC key hides slider", () => {
    const onClose = vi.fn();
    const handle = openSlider({
      researchId: "test-research-id",
      onClose,
    });

    expect(document.querySelector(".perspective-slider")).toBeTruthy();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    const slider = document.querySelector(".perspective-slider") as HTMLElement;
    expect(slider.style.display).toBe("none");
    expect(onClose).toHaveBeenCalled();

    handle.destroy();
  });

  it("hide is idempotent", () => {
    const onClose = vi.fn();
    const handle = openSlider({
      researchId: "test-research-id",
      onClose,
    });

    handle.hide();
    handle.hide();
    handle.hide();

    expect(onClose).toHaveBeenCalledTimes(1);

    handle.destroy();
  });

  it("show() restores hidden slider", () => {
    const handle = openSlider({
      researchId: "test-research-id",
    });

    handle.hide();
    expect(handle.isOpen).toBe(false);

    handle.show();
    expect(handle.isOpen).toBe(true);
    const slider = document.querySelector(".perspective-slider") as HTMLElement;
    expect(slider.style.display).toBe("");

    handle.destroy();
  });

  it("applies theme class", () => {
    const handle = openSlider({
      researchId: "test-research-id",
      theme: "dark",
    });

    const slider = document.querySelector(".perspective-slider");
    expect(slider?.classList.contains("perspective-dark-theme")).toBe(true);

    handle.unmount();
  });

  it("uses custom host", () => {
    const handle = openSlider({
      researchId: "test-research-id",
      host: "https://custom.example.com",
    });

    const iframe = handle.iframe as HTMLIFrameElement;
    expect(iframe.src).toContain("https://custom.example.com");

    handle.unmount();
  });

  it("update modifies config", () => {
    const onSubmit1 = vi.fn();
    const onSubmit2 = vi.fn();

    const handle = openSlider({
      researchId: "test-research-id",
      onSubmit: onSubmit1,
    });

    expect(() => handle.update({ onSubmit: onSubmit2 })).not.toThrow();

    handle.unmount();
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

      const handle = openSlider({
        researchId,
        host,
        onSubmit: onSubmit1,
      });

      handle.update({ onSubmit: onSubmit2 });

      sendMessage(handle.iframe!, "perspective:submit");

      expect(onSubmit2).toHaveBeenCalledTimes(1);
      expect(onSubmit1).not.toHaveBeenCalled();

      handle.unmount();
    });

    it("sequential updates only use latest callback", () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const fn3 = vi.fn();

      const handle = openSlider({
        researchId,
        host,
        onSubmit: fn1,
      });

      handle.update({ onSubmit: fn2 });
      handle.update({ onSubmit: fn3 });

      sendMessage(handle.iframe!, "perspective:submit");

      expect(fn3).toHaveBeenCalledTimes(1);
      expect(fn2).not.toHaveBeenCalled();
      expect(fn1).not.toHaveBeenCalled();

      handle.unmount();
    });

    it("destroy prevents further callback invocations", () => {
      const onSubmit = vi.fn();
      const onClose = vi.fn();

      const handle = openSlider({
        researchId,
        host,
        onSubmit,
        onClose,
      });

      const iframe = handle.iframe!;

      // fullDestroy fires onClose once (was open), then tears down listeners
      handle.unmount();
      expect(onClose).toHaveBeenCalledTimes(1);

      sendMessage(iframe, "perspective:submit");
      sendMessage(iframe, "perspective:close");

      expect(onSubmit).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("update after destroy is safe (no-op)", () => {
      const handle = openSlider({
        researchId,
        host,
      });

      handle.unmount();

      expect(() => handle.update({ onSubmit: vi.fn() })).not.toThrow();
    });
  });
});
