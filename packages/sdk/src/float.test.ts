import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createFloatBubble, createChatBubble } from "./float";
import { preloadIframe, destroyPreloaded } from "./preload";
import * as config from "./config";

describe("createFloatBubble", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    destroyPreloaded();
    document.body.innerHTML = "";
    vi.useRealTimers();
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

  it("preloads a hidden float iframe when the bubble is created", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    const preloadIframe = document.querySelector(
      "iframe[data-perspective-preload='test-research-id']"
    ) as HTMLIFrameElement | null;

    expect(preloadIframe).toBeTruthy();
    expect(preloadIframe?.style.opacity).toBe("0");

    handle.unmount();
  });

  it("does not replace an existing preloaded float iframe", () => {
    preloadIframe("test-research-id", "float", "https://getperspective.ai");
    const existingPreload = document.querySelector(
      "iframe[data-perspective-preload='test-research-id']"
    );

    const handle = createFloatBubble({
      researchId: "test-research-id",
      host: "https://getperspective.ai",
    });

    expect(
      document.querySelector(
        "iframe[data-perspective-preload='test-research-id']"
      )
    ).toBe(existingPreload);

    handle.unmount();
  });

  it("uses messages icon when channel is text-only", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
      channel: "TEXT",
    });

    const bubble = document.querySelector(
      ".perspective-float-bubble"
    ) as HTMLButtonElement;

    expect(bubble.innerHTML).toContain("lucide-messages-square");

    handle.unmount();
  });

  it("uses microphone icon when channel includes voice", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
      channel: ["VOICE", "TEXT"],
    });

    const bubble = document.querySelector(
      ".perspective-float-bubble"
    ) as HTMLButtonElement;

    expect(bubble.innerHTML).not.toContain("lucide-messages-square");

    handle.unmount();
  });

  it("shows welcome teaser and notification dot after delay", () => {
    vi.useFakeTimers();

    const handle = createFloatBubble({
      researchId: "test-research-id",
      welcomeMessage: "Have questions? I can help.",
    });

    expect(document.querySelector(".perspective-float-teaser")).toBeFalsy();
    expect(
      document.querySelector(".perspective-float-notification-dot")
    ).toBeFalsy();

    vi.advanceTimersByTime(3000);

    expect(document.querySelector(".perspective-float-teaser")).toBeTruthy();
    expect(
      document.querySelector(".perspective-float-notification-dot")
    ).toBeTruthy();

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

  it("does not create float window until opened", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    expect(document.querySelector(".perspective-float-window")).toBeFalsy();
    expect(handle.isOpen).toBe(false);

    handle.unmount();
  });

  it("open() shows float window", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    handle.open();

    const floatWindow = document.querySelector(
      ".perspective-float-window"
    ) as HTMLElement;
    expect(handle.isOpen).toBe(true);
    expect(floatWindow.style.display).toBe("");

    handle.unmount();
  });

  it("close() hides float window", () => {
    const onClose = vi.fn();
    const handle = createFloatBubble({
      researchId: "test-research-id",
      onClose,
    });

    handle.open();
    expect(handle.isOpen).toBe(true);

    handle.close();

    const floatWindow = document.querySelector(
      ".perspective-float-window"
    ) as HTMLElement;
    expect(handle.isOpen).toBe(false);
    expect(floatWindow.style.display).toBe("none");
    expect(onClose).toHaveBeenCalled();
  });

  it("toggle() toggles float window visibility", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    expect(handle.isOpen).toBe(false);

    handle.toggle();
    const floatWindow = document.querySelector(
      ".perspective-float-window"
    ) as HTMLElement;
    expect(handle.isOpen).toBe(true);
    expect(floatWindow.style.display).toBe("");

    handle.toggle();
    expect(handle.isOpen).toBe(false);
    expect(floatWindow.style.display).toBe("none");

    handle.unmount();
  });

  it("clicking bubble toggles float window visibility", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    const bubble = document.querySelector(
      ".perspective-float-bubble"
    ) as HTMLButtonElement;
    expect(bubble).toBeTruthy();

    bubble.click();
    const floatWindow = document.querySelector(
      ".perspective-float-window"
    ) as HTMLElement;
    expect(handle.isOpen).toBe(true);
    expect(floatWindow.style.display).toBe("");

    bubble.click();
    expect(handle.isOpen).toBe(false);
    expect(floatWindow.style.display).toBe("none");

    handle.unmount();
  });

  it("close button in float window hides it", () => {
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

    const floatWindow = document.querySelector(
      ".perspective-float-window"
    ) as HTMLElement;
    expect(handle.isOpen).toBe(false);
    expect(floatWindow.style.display).toBe("none");
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

  it("unmount removes hidden preloaded iframe when float was never opened", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    expect(
      document.querySelector(
        "iframe[data-perspective-preload='test-research-id']"
      )
    ).toBeTruthy();

    handle.unmount();

    expect(
      document.querySelector(
        "iframe[data-perspective-preload='test-research-id']"
      )
    ).toBeFalsy();
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

    it("callbacks are gated while float is hidden", () => {
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

      // Iframe is still alive but hidden — callbacks should not fire
      sendMessage(iframe, "perspective:submit");
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("does not navigate parent page while float is hidden", () => {
      const originalHref = window.location.href;
      const mockLocation = { href: originalHref };

      Object.defineProperty(window, "location", {
        value: mockLocation,
        writable: true,
        configurable: true,
      });

      const handle = createFloatBubble({
        researchId,
        host,
      });

      handle.open();
      const iframe = handle.iframe!;
      handle.close();

      sendMessage(iframe, "perspective:redirect", {
        url: "https://example.com/hidden-float",
      });

      expect(mockLocation.href).toBe(originalHref);

      handle.unmount();

      Object.defineProperty(window, "location", {
        value: { href: originalHref },
        writable: true,
        configurable: true,
      });
    });

    it("fires onClose when unmounted while open", () => {
      const onClose = vi.fn();
      const handle = createFloatBubble({
        researchId,
        host,
        onClose,
      });

      handle.open();
      handle.unmount();

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("preloaded iframe callback replay", () => {
    const host = "https://getperspective.ai";
    const researchId = "test-research-id";

    const simulateReady = (iframe: HTMLIFrameElement) => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "perspective:ready", researchId },
          origin: host,
          source: iframe.contentWindow,
        })
      );
    };

    it("fires onReady immediately when claiming a ready preloaded iframe", () => {
      const onReady = vi.fn();

      preloadIframe(researchId, "float", host);

      const preloadedIframe = document.querySelector(
        "iframe[data-perspective-preload]"
      ) as HTMLIFrameElement;

      simulateReady(preloadedIframe);

      const handle = createFloatBubble({ researchId, host, onReady });

      expect(onReady).not.toHaveBeenCalled();

      handle.open();

      expect(onReady).toHaveBeenCalledTimes(1);
      expect(handle.iframe).toBe(preloadedIframe);

      handle.unmount();
    });

    it("does not fire onReady immediately if preloaded iframe was not ready", () => {
      const onReady = vi.fn();

      preloadIframe(researchId, "float", host);

      const handle = createFloatBubble({ researchId, host, onReady });

      expect(onReady).not.toHaveBeenCalled();

      handle.open();
      expect(onReady).not.toHaveBeenCalled();

      simulateReady(handle.iframe!);
      expect(onReady).toHaveBeenCalledTimes(1);

      handle.unmount();
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
