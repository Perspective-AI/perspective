import { describe, it, expect, afterEach, vi } from "vitest";
import { openPopup } from "./popup";
import * as config from "./config";
import { getPersistedOpenState } from "./state";

describe("openPopup", () => {
  afterEach(() => {
    // Clean up any popups left in the DOM
    document
      .querySelectorAll(".perspective-overlay")
      .forEach((el) => el.remove());
    sessionStorage.clear();
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
    expect(
      getPersistedOpenState({
        researchId: "test-research-id",
        type: "popup",
      })
    ).toBe(true);

    handle.destroy();

    expect(document.querySelector(".perspective-overlay")).toBeFalsy();
    expect(
      getPersistedOpenState({
        researchId: "test-research-id",
        type: "popup",
      })
    ).toBe(false);
  });

  it("calls onClose callback when destroyed", () => {
    const onClose = vi.fn();
    const handle = openPopup({
      researchId: "test-research-id",
      onClose,
    });

    handle.destroy();

    expect(onClose).toHaveBeenCalled();
  });

  it("close button click closes popup", () => {
    const onClose = vi.fn();
    openPopup({
      researchId: "test-research-id",
      onClose,
    });

    const closeBtn = document.querySelector(
      ".perspective-close"
    ) as HTMLElement;
    closeBtn.click();

    expect(onClose).toHaveBeenCalled();
    expect(document.querySelector(".perspective-overlay")).toBeFalsy();
  });

  it("clicking overlay background closes popup", () => {
    const onClose = vi.fn();
    openPopup({
      researchId: "test-research-id",
      onClose,
    });

    const overlay = document.querySelector(
      ".perspective-overlay"
    ) as HTMLElement;
    overlay.click();

    expect(onClose).toHaveBeenCalled();
    expect(document.querySelector(".perspective-overlay")).toBeFalsy();
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

  it("ESC key closes popup", () => {
    const onClose = vi.fn();
    openPopup({
      researchId: "test-research-id",
      onClose,
    });

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(onClose).toHaveBeenCalled();
    expect(document.querySelector(".perspective-overlay")).toBeFalsy();
  });

  it("unmount removes overlay", () => {
    const onClose = vi.fn();
    const handle = openPopup({
      researchId: "test-research-id",
      onClose,
    });

    handle.unmount();

    expect(onClose).toHaveBeenCalled();
    expect(document.querySelector(".perspective-overlay")).toBeFalsy();
    expect(
      getPersistedOpenState({
        researchId: "test-research-id",
        type: "popup",
      })
    ).toBe(true);
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

      // Destroy calls onClose once
      handle.destroy();
      expect(onClose).toHaveBeenCalledTimes(1);

      // Subsequent messages should not trigger callbacks
      sendMessage(iframe, "perspective:submit");
      sendMessage(iframe, "perspective:close");

      expect(onSubmit).not.toHaveBeenCalled();
      // onClose should still be called only once (from destroy)
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

  describe("disableClose", () => {
    it("hides close button when disableClose is true", () => {
      const handle = openPopup({
        researchId: "test-research-id",
        disableClose: true,
      });

      const closeBtn = document.querySelector(
        ".perspective-close"
      ) as HTMLElement;
      expect(closeBtn.style.display).toBe("none");

      handle.unmount();
    });

    it("close button click does not close popup when disableClose is true", () => {
      const onClose = vi.fn();
      const handle = openPopup({
        researchId: "test-research-id",
        disableClose: true,
        onClose,
      });

      const closeBtn = document.querySelector(
        ".perspective-close"
      ) as HTMLElement;
      closeBtn.click();

      expect(onClose).not.toHaveBeenCalled();
      expect(document.querySelector(".perspective-overlay")).toBeTruthy();

      handle.unmount();
    });

    it("overlay click does not close popup when disableClose is true", () => {
      const onClose = vi.fn();
      const handle = openPopup({
        researchId: "test-research-id",
        disableClose: true,
        onClose,
      });

      const overlay = document.querySelector(
        ".perspective-overlay"
      ) as HTMLElement;
      overlay.click();

      expect(onClose).not.toHaveBeenCalled();
      expect(document.querySelector(".perspective-overlay")).toBeTruthy();

      handle.unmount();
    });

    it("ESC key does not close popup when disableClose is true", () => {
      const onClose = vi.fn();
      const handle = openPopup({
        researchId: "test-research-id",
        disableClose: true,
        onClose,
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(onClose).not.toHaveBeenCalled();
      expect(document.querySelector(".perspective-overlay")).toBeTruthy();

      handle.unmount();
    });

    it("programmatic unmount still works when disableClose is true", () => {
      const onClose = vi.fn();
      const handle = openPopup({
        researchId: "test-research-id",
        disableClose: true,
        onClose,
      });

      handle.unmount();

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(document.querySelector(".perspective-overlay")).toBeFalsy();
    });

    it("sends hasCloseButton: false in init message when disableClose is true", () => {
      const host = "https://getperspective.ai";
      const researchId = "test-research-id";
      const postMessageSpy = vi.fn();

      const handle = openPopup({
        researchId,
        host,
        disableClose: true,
      });

      // Spy on postMessage to the iframe
      handle.iframe!.contentWindow!.postMessage = postMessageSpy;

      // Simulate iframe ready
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "perspective:ready", researchId },
          origin: host,
          source: handle.iframe!.contentWindow,
        })
      );

      const initCall = postMessageSpy.mock.calls.find(
        (args: unknown[]) =>
          (args[0] as { type: string }).type === "perspective:init"
      );
      expect(initCall).toBeTruthy();
      expect((initCall![0] as { hasCloseButton: boolean }).hasCloseButton).toBe(
        false
      );

      handle.unmount();
    });

    it("sends hasCloseButton: true in init message when disableClose is not set", () => {
      const host = "https://getperspective.ai";
      const researchId = "test-research-id";
      const postMessageSpy = vi.fn();

      const handle = openPopup({
        researchId,
        host,
      });

      handle.iframe!.contentWindow!.postMessage = postMessageSpy;

      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "perspective:ready", researchId },
          origin: host,
          source: handle.iframe!.contentWindow,
        })
      );

      const initCall = postMessageSpy.mock.calls.find(
        (args: unknown[]) =>
          (args[0] as { type: string }).type === "perspective:init"
      );
      expect(initCall).toBeTruthy();
      expect((initCall![0] as { hasCloseButton: boolean }).hasCloseButton).toBe(
        true
      );

      handle.unmount();
    });
  });

  it("destroy is idempotent", () => {
    const onClose = vi.fn();
    const handle = openPopup({
      researchId: "test-research-id",
      onClose,
    });

    handle.destroy();
    handle.destroy();
    handle.destroy();

    // onClose only called once
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
