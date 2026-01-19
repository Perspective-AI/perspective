import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createFloatBubble, createChatBubble } from "./float";
import * as config from "./config";

describe("createFloatBubble", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("creates float bubble", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    expect(handle.researchId).toBe("test-research-id");
    expect(handle.type).toBe("float");
    expect(handle.isOpen).toBe(false);
    expect(document.querySelector(".perspective-float-bubble")).toBeTruthy();

    handle.unmount();
  });

  it("returns no-op handle when no DOM", () => {
    vi.spyOn(config, "hasDom").mockReturnValue(false);

    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    expect(handle.iframe).toBeNull();
    expect(handle.container).toBeNull();
    expect(handle.isOpen).toBe(false);
    expect(handle.unmount).toBeInstanceOf(Function);
    expect(() => handle.unmount()).not.toThrow();
    expect(() => handle.open()).not.toThrow();
    expect(() => handle.close()).not.toThrow();
    expect(() => handle.toggle()).not.toThrow();
  });

  it("open() opens float window", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    expect(handle.isOpen).toBe(false);
    expect(document.querySelector(".perspective-float-window")).toBeFalsy();

    handle.open();

    expect(handle.isOpen).toBe(true);
    expect(document.querySelector(".perspective-float-window")).toBeTruthy();

    handle.unmount();
  });

  it("close() closes float window", () => {
    const onClose = vi.fn();
    const handle = createFloatBubble({
      researchId: "test-research-id",
      onClose,
    });

    handle.open();
    expect(handle.isOpen).toBe(true);
    expect(document.querySelector(".perspective-float-window")).toBeTruthy();

    handle.close();

    expect(handle.isOpen).toBe(false);
    expect(document.querySelector(".perspective-float-window")).toBeFalsy();
    expect(onClose).toHaveBeenCalled();
  });

  it("toggle() toggles float window", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    expect(handle.isOpen).toBe(false);

    handle.toggle();
    expect(handle.isOpen).toBe(true);
    expect(document.querySelector(".perspective-float-window")).toBeTruthy();

    handle.toggle();
    expect(handle.isOpen).toBe(false);
    expect(document.querySelector(".perspective-float-window")).toBeFalsy();

    handle.unmount();
  });

  it("clicking bubble toggles float window", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    const bubble = document.querySelector(
      ".perspective-float-bubble"
    ) as HTMLButtonElement;
    expect(bubble).toBeTruthy();

    bubble.click();
    expect(handle.isOpen).toBe(true);
    expect(document.querySelector(".perspective-float-window")).toBeTruthy();

    bubble.click();
    expect(handle.isOpen).toBe(false);
    expect(document.querySelector(".perspective-float-window")).toBeFalsy();

    handle.unmount();
  });

  it("close button in float window closes it", () => {
    const onClose = vi.fn();
    const handle = createFloatBubble({
      researchId: "test-research-id",
      onClose,
    });

    handle.open();

    const closeBtn = document.querySelector(
      ".perspective-float-window .perspective-close"
    ) as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();

    closeBtn.click();

    expect(handle.isOpen).toBe(false);
    expect(document.querySelector(".perspective-float-window")).toBeFalsy();
    expect(onClose).toHaveBeenCalled();
  });

  it("unmount removes bubble and window", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    handle.open();
    expect(document.querySelector(".perspective-float-bubble")).toBeTruthy();
    expect(document.querySelector(".perspective-float-window")).toBeTruthy();

    handle.unmount();

    expect(document.querySelector(".perspective-float-bubble")).toBeFalsy();
    expect(document.querySelector(".perspective-float-window")).toBeFalsy();
  });

  it("destroy is alias for unmount", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    expect(document.querySelector(".perspective-float-bubble")).toBeTruthy();

    handle.destroy();

    expect(document.querySelector(".perspective-float-bubble")).toBeFalsy();
  });

  it("open when already open is no-op", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    handle.open();
    const window1 = document.querySelector(".perspective-float-window");

    handle.open();
    const window2 = document.querySelector(".perspective-float-window");

    expect(window1).toBe(window2);

    handle.unmount();
  });

  it("close when already closed is no-op", () => {
    const onClose = vi.fn();
    const handle = createFloatBubble({
      researchId: "test-research-id",
      onClose,
    });

    handle.close();
    handle.close();
    handle.close();

    expect(onClose).not.toHaveBeenCalled();

    handle.unmount();
  });

  it("uses custom host", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
      host: "https://custom.example.com",
    });

    handle.open();

    const iframe = handle.iframe as HTMLIFrameElement;
    expect(iframe.src).toContain("https://custom.example.com");

    handle.unmount();
  });

  it("update modifies config", () => {
    const onSubmit1 = vi.fn();
    const onSubmit2 = vi.fn();

    const handle = createFloatBubble({
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

      const handle = createFloatBubble({
        researchId,
        host,
        onSubmit: onSubmit1,
      });

      handle.open();
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

      const handle = createFloatBubble({
        researchId,
        host,
        onSubmit: fn1,
      });

      handle.open();
      handle.update({ onSubmit: fn2 });
      handle.update({ onSubmit: fn3 });

      sendMessage(handle.iframe!, "perspective:submit");

      expect(fn3).toHaveBeenCalledTimes(1);
      expect(fn2).not.toHaveBeenCalled();
      expect(fn1).not.toHaveBeenCalled();

      handle.unmount();
    });

    it("close prevents further callback invocations from that window", () => {
      const onSubmit = vi.fn();
      const onClose = vi.fn();

      const handle = createFloatBubble({
        researchId,
        host,
        onSubmit,
        onClose,
      });

      handle.open();
      const iframe = handle.iframe!;

      handle.close();
      expect(onClose).toHaveBeenCalledTimes(1);

      sendMessage(iframe, "perspective:submit");

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});

describe("createChatBubble", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("is alias for createFloatBubble", () => {
    expect(createChatBubble).toBe(createFloatBubble);
  });

  it("creates float bubble", () => {
    const handle = createChatBubble({
      researchId: "test-research-id",
    });

    expect(handle.type).toBe("float");
    expect(document.querySelector(".perspective-float-bubble")).toBeTruthy();

    handle.unmount();
  });
});
