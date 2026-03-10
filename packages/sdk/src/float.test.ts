import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createFloatBubble, createChatBubble } from "./float";
import { preloadIframe, destroyPreloaded } from "./preload";
import * as config from "./config";
import { getPersistedOpenState, setPersistedOpenState } from "./state";

type FloatBubbleConfig = Parameters<typeof createFloatBubble>[0];

describe("createFloatBubble", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    destroyPreloaded();
    document.body.innerHTML = "";
    sessionStorage.clear();
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

  it("creates a hidden float window shell when the bubble is created", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    const floatWindow = document.querySelector(
      ".perspective-float-window"
    ) as HTMLElement | null;
    const iframe = floatWindow?.querySelector(
      "iframe[data-perspective]"
    ) as HTMLIFrameElement | null;

    expect(floatWindow).toBeTruthy();
    expect(floatWindow?.style.display).toBe("none");
    expect(iframe).toBeTruthy();

    handle.unmount();
  });

  it("claims an existing preloaded float iframe when the bubble is created", () => {
    preloadIframe("test-research-id", "float", "https://getperspective.ai");
    const existingPreload = document.querySelector(
      "iframe[data-perspective-preload='test-research-id']"
    );

    const handle = createFloatBubble({
      researchId: "test-research-id",
      host: "https://getperspective.ai",
    });

    expect(handle.iframe).toBe(existingPreload);
    expect(
      existingPreload?.getAttribute("data-perspective-preload")
    ).toBeNull();
    expect(
      document.querySelector(
        ".perspective-float-window iframe[data-perspective]"
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

  it("keeps the float window hidden until opened", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    const floatWindow = document.querySelector(
      ".perspective-float-window"
    ) as HTMLElement;
    expect(floatWindow).toBeTruthy();
    expect(floatWindow.style.display).toBe("none");
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
    expect(
      getPersistedOpenState({
        researchId: "test-research-id",
        type: "float",
      })
    ).toBe(false);
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
    expect(
      getPersistedOpenState({
        researchId: "test-research-id",
        type: "float",
      })
    ).toBe(true);
  });

  it("unmount removes the hidden float window when float was never opened", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    expect(document.querySelector(".perspective-float-window")).toBeTruthy();

    handle.unmount();

    expect(document.querySelector(".perspective-float-window")).toBeFalsy();
  });

  it("destroy clears persisted open state", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    handle.open();

    handle.destroy();

    expect(document.querySelector(".perspective-float-bubble")).toBeFalsy();
    expect(
      getPersistedOpenState({
        researchId: "test-research-id",
        type: "float",
      })
    ).toBe(false);
  });

  it("restores open state from sessionStorage", () => {
    setPersistedOpenState({
      researchId: "test-research-id",
      type: "float",
      open: true,
    });

    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    expect(handle.isOpen).toBe(true);
    expect(document.querySelector(".perspective-float-window")).toBeTruthy();

    handle.unmount();
  });

  it("does not restart welcome sequence after closing a restored float", () => {
    vi.useFakeTimers();

    setPersistedOpenState({
      researchId: "test-research-id",
      type: "float",
      open: true,
    });

    const handle = createFloatBubble({
      researchId: "test-research-id",
      welcomeMessage: "Have questions? I can help.",
    });

    expect(handle.isOpen).toBe(true);

    handle.close();
    handle.update({});
    vi.advanceTimersByTime(3000);

    expect(document.querySelector(".perspective-float-teaser")).toBeFalsy();

    handle.unmount();
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

      expect(onReady).toHaveBeenCalledTimes(1);
      expect(handle.iframe).toBe(preloadedIframe);

      handle.unmount();
    });

    it("waits for onReady when the claimed preloaded iframe is not ready yet", () => {
      const onReady = vi.fn();

      preloadIframe(researchId, "float", host);

      const handle = createFloatBubble({ researchId, host, onReady });

      expect(onReady).not.toHaveBeenCalled();

      simulateReady(handle.iframe!);
      expect(onReady).toHaveBeenCalledTimes(1);

      handle.unmount();
    });
  });

  describe("launcher config", () => {
    afterEach(() => {
      document.body.innerHTML = "";
    });

    it("icon defaults to channel-based SVG when launcher is omitted", () => {
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

    it("icon 'default' uses channel-based SVG", () => {
      const handle = createFloatBubble({
        researchId: "test-research-id",
        channel: "VOICE",
        launcher: { icon: "default" },
      });

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      expect(bubble.innerHTML).not.toContain("lucide-messages-square");
      expect(bubble.querySelector("svg")).toBeTruthy();

      handle.unmount();
    });

    it("icon 'avatar' renders <img> when avatarUrl is available", () => {
      const config: FloatBubbleConfig = {
        researchId: "test-research-id",
        launcher: { icon: "avatar" },
        _themeConfig: {
          primaryColor: "#7c3aed",
          textColor: "#ffffff",
          darkPrimaryColor: "#a78bfa",
          darkTextColor: "#ffffff",
          avatarUrl: "https://example.com/avatar.png",
        },
      };
      const handle = createFloatBubble(config);

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      const img = bubble.querySelector("img");
      expect(img).toBeTruthy();
      expect(img!.src).toBe("https://example.com/avatar.png");
      expect(img!.style.width).toBe("100%");
      expect(img!.style.height).toBe("100%");
      expect(img!.style.objectFit).toBe("cover");
      expect(img!.style.borderRadius).toBe("inherit");

      handle.unmount();
    });

    it("icon 'avatar' falls back to default SVG when no avatarUrl", () => {
      const config: FloatBubbleConfig = {
        researchId: "test-research-id",
        launcher: { icon: "avatar" },
        _themeConfig: {
          primaryColor: "#7c3aed",
          textColor: "#ffffff",
          darkPrimaryColor: "#a78bfa",
          darkTextColor: "#ffffff",
          avatarUrl: null,
        },
      };
      const handle = createFloatBubble(config);

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      expect(bubble.querySelector("img")).toBeFalsy();
      expect(bubble.querySelector("svg")).toBeTruthy();

      handle.unmount();
    });

    it("icon { url } renders <img> with that URL", () => {
      const handle = createFloatBubble({
        researchId: "test-research-id",
        launcher: { icon: { url: "https://example.com/custom-icon.png" } },
      });

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      const img = bubble.querySelector("img");
      expect(img).toBeTruthy();
      expect(img!.src).toBe("https://example.com/custom-icon.png");

      handle.unmount();
    });

    it("icon { url } falls back to default SVG on image error", () => {
      const handle = createFloatBubble({
        researchId: "test-research-id",
        channel: "TEXT",
        launcher: { icon: { url: "https://example.com/broken.png" } },
      });

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      const img = bubble.querySelector("img");
      expect(img).toBeTruthy();

      // Simulate image load error
      img!.dispatchEvent(new Event("error"));

      expect(bubble.querySelector("img")).toBeFalsy();
      expect(bubble.innerHTML).toContain("lucide-messages-square");

      handle.unmount();
    });

    it("icon { svg } sets innerHTML to the SVG string", () => {
      const customSvg =
        '<svg class="custom-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>';
      const handle = createFloatBubble({
        researchId: "test-research-id",
        launcher: { icon: { svg: customSvg } },
      });

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      expect(bubble.innerHTML).toContain("custom-icon");
      expect(bubble.querySelector("svg.custom-icon")).toBeTruthy();

      handle.unmount();
    });

    it("style overrides are applied to bubble element", () => {
      const handle = createFloatBubble({
        researchId: "test-research-id",
        launcher: {
          style: {
            width: "64px",
            height: "64px",
            borderRadius: "12px",
            bottom: "40px",
            right: "40px",
          },
        },
      });

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      expect(bubble.style.width).toBe("64px");
      expect(bubble.style.height).toBe("64px");
      expect(bubble.style.borderRadius).toBe("12px");
      expect(bubble.style.bottom).toBe("40px");
      expect(bubble.style.right).toBe("40px");

      handle.unmount();
    });

    it("style backgroundColor overrides brand primary", () => {
      const handle = createFloatBubble({
        researchId: "test-research-id",
        brand: { light: { primary: "#ff0000" } },
        launcher: {
          style: { backgroundColor: "#00ff00" },
        },
      });

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      expect(bubble.style.backgroundColor).toBe("#00ff00");

      handle.unmount();
    });

    it("className is added to bubble classList", () => {
      const handle = createFloatBubble({
        researchId: "test-research-id",
        launcher: { className: "my-custom-class another-class" },
      });

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      expect(bubble.classList.contains("my-custom-class")).toBe(true);
      expect(bubble.classList.contains("another-class")).toBe(true);
      // Existing classes preserved
      expect(bubble.classList.contains("perspective-float-bubble")).toBe(true);

      handle.unmount();
    });

    it("icon reverts to custom icon on close (not default SVG)", () => {
      const handle = createFloatBubble({
        researchId: "test-research-id",
        launcher: { icon: { url: "https://example.com/icon.png" } },
      });

      handle.open();
      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      // While open, shows close icon
      expect(bubble.innerHTML).toContain("lucide-x");

      handle.close();
      // After close, reverts to custom icon (not default SVG)
      expect(bubble.querySelector("img")).toBeTruthy();
      expect(bubble.querySelector("img")!.src).toBe(
        "https://example.com/icon.png"
      );

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
