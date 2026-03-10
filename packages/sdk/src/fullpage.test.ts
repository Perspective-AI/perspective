import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createFullpage } from "./fullpage";
import * as config from "./config";
import { MESSAGE_TYPES } from "./constants";
import * as timing from "./timing";

describe("createFullpage", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("creates fullpage container", () => {
    const handle = createFullpage({
      researchId: "test-research-id",
    });

    expect(handle.researchId).toBe("test-research-id");
    expect(handle.type).toBe("fullpage");
    expect(handle.iframe).toBeInstanceOf(HTMLIFrameElement);
    expect(document.querySelector(".perspective-fullpage")).toBeTruthy();

    handle.unmount();
  });

  it("creates loading indicator", () => {
    const handle = createFullpage({
      researchId: "test-research-id",
    });

    const loading = document.querySelector(".perspective-loading");
    expect(loading).toBeTruthy();

    handle.unmount();
  });

  it("removes the load timer on unmount", () => {
    const removeTimerSpy = vi.spyOn(timing, "removeTimer");

    const handle = createFullpage({
      researchId: "test-research-id",
    });

    handle.unmount();

    expect(removeTimerSpy).toHaveBeenCalledWith("test-research-id");
  });

  it("returns no-op handle when no DOM", () => {
    vi.spyOn(config, "hasDom").mockReturnValue(false);

    const handle = createFullpage({
      researchId: "test-research-id",
    });

    expect(handle.iframe).toBeNull();
    expect(handle.container).toBeNull();
    expect(handle.unmount).toBeInstanceOf(Function);
    expect(() => handle.unmount()).not.toThrow();
  });

  it("unmount removes fullpage container", () => {
    const handle = createFullpage({
      researchId: "test-research-id",
    });

    expect(document.querySelector(".perspective-fullpage")).toBeTruthy();

    handle.unmount();

    expect(document.querySelector(".perspective-fullpage")).toBeFalsy();
  });

  it("destroy removes the fullpage container", () => {
    const handle = createFullpage({
      researchId: "test-research-id",
    });

    expect(document.querySelector(".perspective-fullpage")).toBeTruthy();

    handle.destroy();

    expect(document.querySelector(".perspective-fullpage")).toBeFalsy();
  });

  it("does not call onClose on unmount", () => {
    const onClose = vi.fn();
    const handle = createFullpage({
      researchId: "test-research-id",
      onClose,
    });

    handle.unmount();

    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose on destroy", () => {
    const onClose = vi.fn();
    const handle = createFullpage({
      researchId: "test-research-id",
      onClose,
    });

    handle.destroy();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("applies theme class", () => {
    const handle = createFullpage({
      researchId: "test-research-id",
      theme: "dark",
    });

    const container = document.querySelector(".perspective-fullpage");
    expect(container?.classList.contains("perspective-dark-theme")).toBe(true);

    handle.unmount();
  });

  it("uses custom host", () => {
    const handle = createFullpage({
      researchId: "test-research-id",
      host: "https://custom.example.com",
    });

    const iframe = handle.iframe as HTMLIFrameElement;
    expect(iframe.src).toContain("https://custom.example.com");

    handle.unmount();
  });

  it("passes params to iframe", () => {
    const handle = createFullpage({
      researchId: "test-research-id",
      params: { source: "test", campaign: "demo" },
    });

    const iframe = handle.iframe as HTMLIFrameElement;
    const url = new URL(iframe.src);
    expect(url.searchParams.get("source")).toBe("test");
    expect(url.searchParams.get("campaign")).toBe("demo");

    handle.unmount();
  });

  it("update modifies config", () => {
    const onSubmit1 = vi.fn();
    const onSubmit2 = vi.fn();

    const handle = createFullpage({
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

      const handle = createFullpage({
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

    it("forwards auth-complete messages to onAuth", () => {
      const onAuth = vi.fn();
      const popupWindow = {} as Window;
      vi.spyOn(window, "open").mockReturnValue(popupWindow);

      const handle = createFullpage({
        researchId,
        host,
        onAuth,
      });

      sendMessage(handle.iframe!, MESSAGE_TYPES.authRequest, {
        provider: "google",
        authUrl: `${host}/embed-auth/google`,
      });

      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: MESSAGE_TYPES.popupAuthComplete,
            token: "test-token",
          },
          origin: host,
          source: popupWindow,
        })
      );

      expect(onAuth).toHaveBeenCalledWith({
        researchId,
        token: "test-token",
      });

      handle.unmount();
    });

    it("sequential updates only use latest callback", () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const fn3 = vi.fn();

      const handle = createFullpage({
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

      const handle = createFullpage({
        researchId,
        host,
        onSubmit,
        onClose,
      });

      const iframe = handle.iframe!;

      handle.destroy();
      expect(onClose).toHaveBeenCalledTimes(1);

      sendMessage(iframe, "perspective:submit");
      sendMessage(iframe, "perspective:close");

      expect(onSubmit).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("close messages tear down the embed and fire onClose once", () => {
      const onClose = vi.fn();

      const handle = createFullpage({
        researchId,
        host,
        onClose,
      });

      sendMessage(handle.iframe!, "perspective:close");

      expect(document.querySelector(".perspective-fullpage")).toBeFalsy();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
