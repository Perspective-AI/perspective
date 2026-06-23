import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createWidget } from "./widget";
import * as config from "./config";
import * as iframe from "./iframe";

describe("createWidget", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  it("creates widget in container", () => {
    const handle = createWidget(container, {
      researchId: "test-research-id",
    });

    expect(handle.researchId).toBe("test-research-id");
    expect(handle.type).toBe("widget");
    expect(handle.container).toBe(container);
    expect(handle.iframe).toBeInstanceOf(HTMLIFrameElement);
    expect(container.querySelector("iframe[data-perspective]")).toBeTruthy();

    handle.unmount();
  });

  it("applies the framed card class for a bare drop-in container", () => {
    const handle = createWidget(container, {
      researchId: "test-research-id",
    });

    const wrapper = container.querySelector(".perspective-embed-root");
    // An unsized container gets the centered, framed card default. The visual
    // defaults come from these classes in the injected stylesheet so host
    // pages can override them with plain CSS.
    expect(wrapper?.classList.contains("perspective-widget")).toBe(true);
    expect(wrapper?.classList.contains("perspective-widget-card")).toBe(true);

    handle.unmount();
  });

  it("fills the container (no card framing) when the host sized it", () => {
    // Custom "full page" layouts size the container themselves; we must not
    // collapse them into a centered card. An explicit height signals intent.
    container.style.height = "600px";

    const handle = createWidget(container, {
      researchId: "test-research-id",
    });

    const wrapper = container.querySelector(".perspective-embed-root");
    expect(wrapper?.classList.contains("perspective-widget")).toBe(true);
    expect(wrapper?.classList.contains("perspective-widget-card")).toBe(false);

    handle.unmount();
  });

  it("frame.layout:'fill' forces fill mode on a bare container", () => {
    const handle = createWidget(container, {
      researchId: "test-research-id",
      frame: { layout: "fill" },
    });

    const wrapper = container.querySelector(".perspective-embed-root");
    expect(wrapper?.classList.contains("perspective-widget-card")).toBe(false);

    handle.unmount();
  });

  it("frame.layout:'card' forces the card even when the host sized it", () => {
    container.style.height = "600px";

    const handle = createWidget(container, {
      researchId: "test-research-id",
      frame: { layout: "card" },
    });

    const wrapper = container.querySelector(".perspective-embed-root");
    expect(wrapper?.classList.contains("perspective-widget-card")).toBe(true);

    handle.unmount();
  });

  it("applies frame appearance as CSS variables on the wrapper", () => {
    const handle = createWidget(container, {
      researchId: "test-research-id",
      frame: {
        radius: "4px",
        border: "none",
        shadow: "none",
        background: "#fff",
        maxWidth: "720px",
        minHeight: "720px",
      },
    });

    const wrapper = container.querySelector<HTMLElement>(
      ".perspective-embed-root"
    );
    const style = wrapper!.style;
    expect(style.getPropertyValue("--perspective-widget-radius")).toBe("4px");
    expect(style.getPropertyValue("--perspective-widget-border")).toBe("none");
    expect(style.getPropertyValue("--perspective-widget-shadow")).toBe("none");
    expect(style.getPropertyValue("--perspective-widget-bg")).toBe("#fff");
    expect(style.getPropertyValue("--perspective-widget-max-width")).toBe(
      "720px"
    );
    expect(style.getPropertyValue("--perspective-widget-min-height")).toBe(
      "720px"
    );

    handle.unmount();
  });

  it("creates loading indicator", () => {
    const handle = createWidget(container, {
      researchId: "test-research-id",
    });

    const loading = container.querySelector(".perspective-loading");
    expect(loading).toBeTruthy();

    handle.unmount();
  });

  it("returns no-op handle when no DOM", () => {
    vi.spyOn(config, "hasDom").mockReturnValue(false);

    const handle = createWidget(container, {
      researchId: "test-research-id",
    });

    expect(handle.iframe).toBeNull();
    expect(handle.container).toBeNull();
    expect(handle.unmount).toBeInstanceOf(Function);
    expect(() => handle.unmount()).not.toThrow();
  });

  it("returns no-op handle when container is null", () => {
    const handle = createWidget(null, {
      researchId: "test-research-id",
    });

    expect(handle.iframe).toBeNull();
    expect(handle.container).toBeNull();
  });

  it("is idempotent (React Strict Mode safe)", () => {
    const handle1 = createWidget(container, {
      researchId: "test-research-id",
    });

    const handle2 = createWidget(container, {
      researchId: "test-research-id",
    });

    expect(handle1.iframe).toBeInstanceOf(HTMLIFrameElement);
    expect(handle2.iframe).toBeInstanceOf(HTMLIFrameElement);
    expect(handle2.iframe).toBe(handle1.iframe);

    const iframes = container.querySelectorAll("iframe[data-perspective]");
    expect(iframes.length).toBe(1);

    handle1.unmount();
  });

  it("idempotent handle can clean up existing widget", () => {
    createWidget(container, {
      researchId: "test-research-id",
    });

    expect(container.querySelector("iframe[data-perspective]")).toBeTruthy();

    const handle2 = createWidget(container, {
      researchId: "test-research-id",
    });

    handle2.unmount();

    expect(container.querySelector("iframe[data-perspective]")).toBeFalsy();
    expect(container.querySelector(".perspective-embed-root")).toBeFalsy();
  });

  it("idempotent handle cleans up message listeners and iframe registry", () => {
    const cleanupSpy = vi.fn();
    const unregisterSpy = vi.fn();

    vi.spyOn(iframe, "setupMessageListener").mockReturnValue(cleanupSpy);
    vi.spyOn(iframe, "registerIframe").mockReturnValue(unregisterSpy);

    createWidget(container, {
      researchId: "test-research-id",
    });

    const handle2 = createWidget(container, {
      researchId: "test-research-id",
    });

    expect(cleanupSpy).not.toHaveBeenCalled();
    expect(unregisterSpy).not.toHaveBeenCalled();

    handle2.unmount();

    expect(cleanupSpy).toHaveBeenCalledTimes(1);
    expect(unregisterSpy).toHaveBeenCalledTimes(1);
  });

  it("unmount removes elements", () => {
    const handle = createWidget(container, {
      researchId: "test-research-id",
    });

    expect(container.querySelector("iframe[data-perspective]")).toBeTruthy();

    handle.unmount();

    expect(container.querySelector("iframe[data-perspective]")).toBeFalsy();
    expect(container.querySelector(".perspective-embed-root")).toBeFalsy();
  });

  it("destroy is alias for unmount", () => {
    const handle = createWidget(container, {
      researchId: "test-research-id",
    });

    expect(container.querySelector("iframe[data-perspective]")).toBeTruthy();

    handle.destroy();

    expect(container.querySelector("iframe[data-perspective]")).toBeFalsy();
  });

  it("update modifies config", () => {
    const onSubmit1 = vi.fn();
    const onSubmit2 = vi.fn();

    const handle = createWidget(container, {
      researchId: "test-research-id",
      onSubmit: onSubmit1,
    });

    handle.update({ onSubmit: onSubmit2 });

    // The update should not throw
    expect(() => handle.update({ onSubmit: onSubmit2 })).not.toThrow();

    handle.unmount();
  });

  it("applies theme class", () => {
    const handle = createWidget(container, {
      researchId: "test-research-id",
      theme: "dark",
    });

    const wrapper = container.querySelector(".perspective-embed-root");
    expect(wrapper?.classList.contains("perspective-dark-theme")).toBe(true);

    handle.unmount();
  });

  it("uses custom host", () => {
    const handle = createWidget(container, {
      researchId: "test-research-id",
      host: "https://custom.example.com",
    });

    const iframe = handle.iframe as HTMLIFrameElement;
    expect(iframe.src).toContain("https://custom.example.com");

    handle.unmount();
  });

  it("passes params to iframe", () => {
    const handle = createWidget(container, {
      researchId: "test-research-id",
      params: { source: "test", campaign: "demo" },
    });

    const iframe = handle.iframe as HTMLIFrameElement;
    const url = new URL(iframe.src);
    expect(url.searchParams.get("source")).toBe("test");
    expect(url.searchParams.get("campaign")).toBe("demo");

    handle.unmount();
  });

  it("unmount is idempotent - calling twice does not throw", () => {
    const cleanupSpy = vi.fn();
    const unregisterSpy = vi.fn();

    vi.spyOn(iframe, "setupMessageListener").mockReturnValue(cleanupSpy);
    vi.spyOn(iframe, "registerIframe").mockReturnValue(unregisterSpy);

    const handle = createWidget(container, {
      researchId: "test-research-id",
    });

    expect(() => {
      handle.unmount();
      handle.unmount();
    }).not.toThrow();

    // Cleanup functions should only be called once
    expect(cleanupSpy).toHaveBeenCalledTimes(1);
    expect(unregisterSpy).toHaveBeenCalledTimes(1);
  });

  it("destroy is idempotent - calling twice does not throw", () => {
    const cleanupSpy = vi.fn();
    const unregisterSpy = vi.fn();

    vi.spyOn(iframe, "setupMessageListener").mockReturnValue(cleanupSpy);
    vi.spyOn(iframe, "registerIframe").mockReturnValue(unregisterSpy);

    const handle = createWidget(container, {
      researchId: "test-research-id",
    });

    expect(() => {
      handle.destroy();
      handle.destroy();
    }).not.toThrow();

    // Cleanup functions should only be called once
    expect(cleanupSpy).toHaveBeenCalledTimes(1);
    expect(unregisterSpy).toHaveBeenCalledTimes(1);
  });

  it("mixed unmount then destroy does not double-cleanup", () => {
    const cleanupSpy = vi.fn();
    const unregisterSpy = vi.fn();

    vi.spyOn(iframe, "setupMessageListener").mockReturnValue(cleanupSpy);
    vi.spyOn(iframe, "registerIframe").mockReturnValue(unregisterSpy);

    const handle = createWidget(container, {
      researchId: "test-research-id",
    });

    expect(() => {
      handle.unmount();
      handle.destroy();
    }).not.toThrow();

    // Cleanup functions should only be called once
    expect(cleanupSpy).toHaveBeenCalledTimes(1);
    expect(unregisterSpy).toHaveBeenCalledTimes(1);
  });

  it("idempotent handle unmount is also idempotent", () => {
    const cleanupSpy = vi.fn();
    const unregisterSpy = vi.fn();

    vi.spyOn(iframe, "setupMessageListener").mockReturnValue(cleanupSpy);
    vi.spyOn(iframe, "registerIframe").mockReturnValue(unregisterSpy);

    // Create first handle
    createWidget(container, {
      researchId: "test-research-id",
    });

    // Get idempotent handle
    const handle2 = createWidget(container, {
      researchId: "test-research-id",
    });

    expect(() => {
      handle2.unmount();
      handle2.unmount();
    }).not.toThrow();

    // Cleanup functions should only be called once
    expect(cleanupSpy).toHaveBeenCalledTimes(1);
    expect(unregisterSpy).toHaveBeenCalledTimes(1);
  });

  describe("update() behavior", () => {
    const host = "https://getperspective.ai";
    const researchId = "test-research-id";

    const sendMessage = (
      iframeEl: HTMLIFrameElement,
      type: string,
      extra?: Record<string, unknown>
    ) => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type, researchId, ...extra },
          origin: host,
          source: iframeEl.contentWindow,
        })
      );
    };

    it("update changes which callback is invoked", () => {
      const onSubmit1 = vi.fn();
      const onSubmit2 = vi.fn();

      const handle = createWidget(container, {
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

      const handle = createWidget(container, {
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

      const handle = createWidget(container, {
        researchId,
        host,
        onSubmit,
      });

      const iframeEl = handle.iframe!;

      handle.unmount();

      sendMessage(iframeEl, "perspective:submit");

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
