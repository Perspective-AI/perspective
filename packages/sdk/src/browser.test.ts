import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  autoInit,
  init,
  mount,
  destroy,
  destroyAll,
  createWidget,
  openPopup,
  openSlider,
  createFloatBubble,
  createChatBubble,
  createFullpage,
  isToggleable,
} from "./browser";

describe("browser entry", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    destroyAll();
    document.body.innerHTML = "";
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("exports", () => {
    it("exports all public functions", () => {
      expect(autoInit).toBeInstanceOf(Function);
      expect(init).toBeInstanceOf(Function);
      expect(mount).toBeInstanceOf(Function);
      expect(destroy).toBeInstanceOf(Function);
      expect(destroyAll).toBeInstanceOf(Function);
      expect(createWidget).toBeInstanceOf(Function);
      expect(openPopup).toBeInstanceOf(Function);
      expect(openSlider).toBeInstanceOf(Function);
      expect(createFloatBubble).toBeInstanceOf(Function);
      expect(createFullpage).toBeInstanceOf(Function);
    });

    it("exports createChatBubble as legacy alias", () => {
      expect(createChatBubble).toBe(createFloatBubble);
    });
  });

  describe("init", () => {
    it("opens popup", () => {
      const handle = init({ researchId: "test", type: "popup" });
      expect(document.querySelector(".perspective-overlay")).toBeTruthy();
      handle.unmount();
    });

    it("opens slider", () => {
      const handle = init({ researchId: "test", type: "slider" });
      expect(document.querySelector(".perspective-slider")).toBeTruthy();
      handle.unmount();
    });

    it("creates float bubble", () => {
      const handle = init({ researchId: "test", type: "float" });
      expect(document.querySelector(".perspective-float-bubble")).toBeTruthy();
      handle.unmount();
    });

    it("handles legacy chat type as float", () => {
      const handle = init({ researchId: "test", type: "chat" });
      expect(document.querySelector(".perspective-float-bubble")).toBeTruthy();
      handle.unmount();
    });

    it("creates fullpage", () => {
      const handle = init({ researchId: "test", type: "fullpage" });
      expect(document.querySelector(".perspective-fullpage")).toBeTruthy();
      handle.unmount();
    });

    it("throws for invalid type", () => {
      expect(() =>
        init({ researchId: "test", type: "invalid" as "popup" })
      ).toThrow(/Unknown embed type/);
    });

    it("destroys previous instance with same researchId", () => {
      init({ researchId: "test", type: "popup" });
      expect(document.querySelectorAll(".perspective-overlay").length).toBe(1);

      const handle2 = init({ researchId: "test", type: "popup" });
      expect(document.querySelectorAll(".perspective-overlay").length).toBe(1);

      handle2.unmount();
    });
  });

  describe("mount", () => {
    it("creates widget in container", () => {
      const container = document.createElement("div");
      document.body.appendChild(container);

      const handle = mount(container, { researchId: "test" });
      expect(container.querySelector("iframe[data-perspective]")).toBeTruthy();
      handle.unmount();
    });

    it("accepts selector string", () => {
      const container = document.createElement("div");
      container.id = "embed-container";
      document.body.appendChild(container);

      const handle = mount("#embed-container", { researchId: "test" });
      expect(container.querySelector("iframe[data-perspective]")).toBeTruthy();
      handle.unmount();
    });

    it("throws for invalid selector", () => {
      expect(() => mount("#nonexistent", { researchId: "test" })).toThrow(
        /Container not found/
      );
    });

    it("falls back to init for non-widget types", () => {
      const container = document.createElement("div");
      document.body.appendChild(container);

      const handle = mount(container, { researchId: "test", type: "popup" });
      expect(document.querySelector(".perspective-overlay")).toBeTruthy();
      handle.unmount();
    });
  });

  describe("destroy", () => {
    it("destroys instance by researchId", () => {
      init({ researchId: "test", type: "popup" });
      expect(document.querySelector(".perspective-overlay")).toBeTruthy();

      destroy("test");
      expect(document.querySelector(".perspective-overlay")).toBeFalsy();
    });

    it("is no-op for unknown researchId", () => {
      expect(() => destroy("unknown")).not.toThrow();
    });
  });

  describe("destroyAll", () => {
    it("destroys all instances", () => {
      init({ researchId: "test1", type: "popup" });
      init({ researchId: "test2", type: "slider" });
      expect(document.querySelector(".perspective-overlay")).toBeTruthy();
      expect(document.querySelector(".perspective-slider")).toBeTruthy();

      destroyAll();

      expect(document.querySelector(".perspective-overlay")).toBeFalsy();
      expect(document.querySelector(".perspective-slider")).toBeFalsy();
    });

    it("resets data-perspective-initialized so autoInit can re-process elements", () => {
      document.body.innerHTML = `
        <button data-perspective-popup="res1">Open</button>
        <button data-perspective-slider="res2">Slide</button>
      `;
      autoInit();
      expect(
        document
          .querySelector("[data-perspective-popup]")!
          .hasAttribute("data-perspective-initialized")
      ).toBe(true);
      expect(
        document
          .querySelector("[data-perspective-slider]")!
          .hasAttribute("data-perspective-initialized")
      ).toBe(true);

      destroyAll();

      expect(
        document
          .querySelector("[data-perspective-popup]")!
          .hasAttribute("data-perspective-initialized")
      ).toBe(false);
      expect(
        document
          .querySelector("[data-perspective-slider]")!
          .hasAttribute("data-perspective-initialized")
      ).toBe(false);

      // autoInit should be able to re-process the elements now
      const clickSpy = vi.fn();
      document
        .querySelector("[data-perspective-popup]")!
        .addEventListener("click", clickSpy);
      autoInit();
      expect(
        document
          .querySelector("[data-perspective-popup]")!
          .hasAttribute("data-perspective-initialized")
      ).toBe(true);
    });
  });

  describe("hide-on-close and reuse", () => {
    const host = "https://getperspective.ai";

    it("reuses hidden popup on second init() call instead of recreating", () => {
      const handle1 = init({ researchId: "test", type: "popup", host });
      const iframe1 = handle1.iframe;

      expect(document.querySelector(".perspective-overlay")).toBeTruthy();

      // Close (hide) the popup
      const closeBtn = document.querySelector(
        ".perspective-close"
      ) as HTMLElement;
      closeBtn.click();

      // Overlay hidden but still in DOM
      const overlay = document.querySelector(
        ".perspective-overlay"
      ) as HTMLElement;
      expect(overlay.style.display).toBe("none");

      // Re-open via init() — should reuse the hidden instance
      const handle2 = init({ researchId: "test", type: "popup", host });

      // Same handle returned (same iframe, no recreation)
      expect(handle2).toBe(handle1);
      expect(handle2.iframe).toBe(iframe1);

      // Overlay visible again
      expect(overlay.style.display).toBe("");

      handle2.unmount();
    });

    it("reuses hidden slider on second init() call", () => {
      const handle1 = init({ researchId: "test", type: "slider", host });
      const iframe1 = handle1.iframe;

      // Close (hide)
      const closeBtn = document.querySelector(
        ".perspective-slider .perspective-close"
      ) as HTMLElement;
      closeBtn.click();

      const slider = document.querySelector(
        ".perspective-slider"
      ) as HTMLElement;
      expect(slider.style.display).toBe("none");

      // Re-open
      const handle2 = init({ researchId: "test", type: "slider", host });
      expect(handle2).toBe(handle1);
      expect(handle2.iframe).toBe(iframe1);
      expect(slider.style.display).toBe("");

      handle2.unmount();
    });

    it("updates config when reusing hidden instance", () => {
      const onSubmit1 = vi.fn();
      const onSubmit2 = vi.fn();

      const handle = init({
        researchId: "test",
        type: "popup",
        host,
        onSubmit: onSubmit1,
      });

      // Close
      expect(isToggleable(handle)).toBe(true);
      if (isToggleable(handle)) handle.hide();

      // Reopen with different callback
      init({
        researchId: "test",
        type: "popup",
        host,
        onSubmit: onSubmit2,
      });

      // Send submit message — should use new callback
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "perspective:submit",
            researchId: "test",
          },
          origin: host,
          source: handle.iframe!.contentWindow,
        })
      );

      expect(onSubmit2).toHaveBeenCalledTimes(1);
      expect(onSubmit1).not.toHaveBeenCalled();

      handle.unmount();
    });

    it("replays ready callbacks when reusing a ready hidden popup", () => {
      const onReady = vi.fn();

      const handle = init({ researchId: "test", type: "popup", host });

      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "perspective:ready",
            researchId: "test",
          },
          origin: host,
          source: handle.iframe!.contentWindow,
        })
      );

      expect(isToggleable(handle)).toBe(true);
      if (isToggleable(handle)) {
        handle.hide();
      }

      const reopened = init({
        researchId: "test",
        type: "popup",
        host,
        onReady,
      });

      expect(reopened).toBe(handle);
      expect(onReady).toHaveBeenCalledTimes(1);

      reopened.unmount();
    });

    it("does not reuse hidden popup when iframe-defining config changes", () => {
      const handle1 = init({
        researchId: "test",
        type: "popup",
        host,
        params: { step: "1" },
      });
      const iframe1 = handle1.iframe;

      expect(isToggleable(handle1)).toBe(true);
      if (isToggleable(handle1)) {
        handle1.hide();
      }

      const handle2 = init({
        researchId: "test",
        type: "popup",
        host,
        params: { step: "2" },
      });

      expect(handle2).not.toBe(handle1);
      expect(handle2.iframe).not.toBe(iframe1);

      handle2.unmount();
    });

    it("destroy() fully removes and allows fresh creation", () => {
      const handle1 = init({ researchId: "test", type: "popup", host });
      const iframe1 = handle1.iframe;

      // Full destroy (not hide)
      destroy("test");
      expect(document.querySelector(".perspective-overlay")).toBeFalsy();

      // New init creates a fresh instance
      const handle2 = init({ researchId: "test", type: "popup", host });
      expect(handle2).not.toBe(handle1);
      expect(handle2.iframe).not.toBe(iframe1);
      expect(document.querySelector(".perspective-overlay")).toBeTruthy();

      handle2.unmount();
    });

    it("does not reuse hidden popup when type changes to slider", () => {
      const handle1 = init({ researchId: "test", type: "popup", host });

      // Hide popup
      expect(isToggleable(handle1)).toBe(true);
      if (isToggleable(handle1)) handle1.hide();

      // Init with different type — should NOT reuse the hidden popup
      const handle2 = init({ researchId: "test", type: "slider", host });
      expect(handle2).not.toBe(handle1);
      expect(handle2.type).toBe("slider");
      expect(document.querySelector(".perspective-slider")).toBeTruthy();

      handle2.unmount();
    });

    it("destroyAll() fully cleans up hidden instances", () => {
      init({ researchId: "test1", type: "popup", host });
      init({ researchId: "test2", type: "slider", host });

      // Hide both
      (
        document.querySelector(
          ".perspective-overlay .perspective-close"
        ) as HTMLElement
      ).click();
      (
        document.querySelector(
          ".perspective-slider .perspective-close"
        ) as HTMLElement
      ).click();

      // Both hidden but in DOM
      expect(
        (document.querySelector(".perspective-overlay") as HTMLElement).style
          .display
      ).toBe("none");
      expect(
        (document.querySelector(".perspective-slider") as HTMLElement).style
          .display
      ).toBe("none");

      destroyAll();

      // Both fully removed
      expect(document.querySelector(".perspective-overlay")).toBeFalsy();
      expect(document.querySelector(".perspective-slider")).toBeFalsy();
    });
  });

  describe("autoInit robustness", () => {
    it("ignores element with empty widget attribute", () => {
      document.body.innerHTML = `
        <div data-perspective-widget=""></div>
      `;

      expect(() => autoInit()).not.toThrow();
      expect(document.querySelector("iframe")).toBeFalsy();
    });

    it("treats whitespace-only widget attribute as truthy (creates iframe with empty researchId)", () => {
      document.body.innerHTML = `
        <div data-perspective-widget="   "></div>
      `;

      expect(() => autoInit()).not.toThrow();
      expect(document.querySelector("iframe[data-perspective]")).toBeTruthy();
    });

    it("handles malformed params attribute gracefully", () => {
      document.body.innerHTML = `
        <div data-perspective-widget="test" data-perspective-params="malformed,,=value,key="></div>
      `;

      expect(() => autoInit()).not.toThrow();
      expect(document.querySelector("iframe[data-perspective]")).toBeTruthy();
    });

    it("handles empty params attribute", () => {
      document.body.innerHTML = `
        <div data-perspective-widget="test" data-perspective-params=""></div>
      `;

      expect(() => autoInit()).not.toThrow();
      expect(document.querySelector("iframe[data-perspective]")).toBeTruthy();
    });

    it("handles invalid theme attribute value", () => {
      document.body.innerHTML = `
        <div data-perspective-widget="test" data-perspective-theme="invalid-theme"></div>
      `;

      expect(() => autoInit()).not.toThrow();
      expect(document.querySelector("iframe[data-perspective]")).toBeTruthy();
    });

    it("handles malformed brand attribute", () => {
      document.body.innerHTML = `
        <div data-perspective-widget="test" data-perspective-brand="not-valid-format"></div>
      `;

      expect(() => autoInit()).not.toThrow();
      expect(document.querySelector("iframe[data-perspective]")).toBeTruthy();
    });

    it("calling autoInit twice does not duplicate widgets", () => {
      document.body.innerHTML = `
        <div data-perspective-widget="test-widget"></div>
      `;

      autoInit();
      autoInit();

      const iframes = document.querySelectorAll("iframe[data-perspective]");
      expect(iframes.length).toBe(1);
    });

    it("calling autoInit twice does not duplicate popup handlers", () => {
      document.body.innerHTML = `
        <button data-perspective-popup="test-popup">Open</button>
      `;

      autoInit();
      autoInit();

      const button = document.querySelector(
        "[data-perspective-popup]"
      ) as HTMLButtonElement;
      button.click();

      expect(document.querySelectorAll(".perspective-overlay").length).toBe(1);
    });

    it("multiple elements with same researchId - second element does not create iframe (dedupe)", () => {
      document.body.innerHTML = `
        <div id="widget1" data-perspective-widget="same-research-id"></div>
        <div id="widget2" data-perspective-widget="same-research-id"></div>
      `;

      autoInit();

      const widget1Iframe = document.querySelector("#widget1 iframe");
      const widget2Iframe = document.querySelector("#widget2 iframe");

      expect(widget1Iframe).toBeTruthy();
      expect(widget2Iframe).toBeFalsy();
    });

    it("widget with no-style attribute skips styling", () => {
      document.body.innerHTML = `
        <button data-perspective-popup="test" data-perspective-no-style>Open</button>
      `;

      autoInit();

      const button = document.querySelector(
        "[data-perspective-popup]"
      ) as HTMLButtonElement;
      expect(button.style.backgroundColor).toBeFalsy();
    });
  });

  describe("autoInit", () => {
    it("initializes widget from data-perspective-widget", () => {
      document.body.innerHTML = `
        <div data-perspective-widget="test-widget"></div>
      `;

      autoInit();

      expect(
        document.querySelector("[data-perspective-widget] iframe")
      ).toBeTruthy();
    });

    it("initializes fullpage from data-perspective-fullpage", () => {
      document.body.innerHTML = `
        <div data-perspective-fullpage="test-fullpage"></div>
      `;

      autoInit();

      expect(document.querySelector(".perspective-fullpage")).toBeTruthy();
    });

    it("attaches popup click handler from data-perspective-popup", () => {
      document.body.innerHTML = `
        <button data-perspective-popup="test-popup">Open</button>
      `;

      autoInit();

      expect(document.querySelector(".perspective-overlay")).toBeFalsy();

      const button = document.querySelector(
        "[data-perspective-popup]"
      ) as HTMLButtonElement;
      button.click();

      expect(document.querySelector(".perspective-overlay")).toBeTruthy();
    });

    it("attaches slider click handler from data-perspective-slider", () => {
      document.body.innerHTML = `
        <button data-perspective-slider="test-slider">Open</button>
      `;

      autoInit();

      expect(document.querySelector(".perspective-slider")).toBeFalsy();

      const button = document.querySelector(
        "[data-perspective-slider]"
      ) as HTMLButtonElement;
      button.click();

      expect(document.querySelector(".perspective-slider")).toBeTruthy();
    });

    it("preloads the first slider button when no popup button exists", () => {
      vi.useFakeTimers();

      document.body.innerHTML = `
        <button data-perspective-slider="test-slider">Open</button>
      `;

      autoInit();
      vi.advanceTimersByTime(200);

      const preloadIframe = document.querySelector(
        "iframe[data-perspective-preload='test-slider']"
      ) as HTMLIFrameElement | null;

      expect(preloadIframe).toBeTruthy();
      expect(preloadIframe?.style.opacity).toBe("0");
    });

    it("initializes float from data-perspective-float", () => {
      document.body.innerHTML = `
        <div data-perspective-float="test-float"></div>
      `;

      autoInit();

      expect(document.querySelector(".perspective-float-bubble")).toBeTruthy();
      const floatWindow = document.querySelector(
        ".perspective-float-window"
      ) as HTMLElement | null;
      expect(floatWindow).toBeTruthy();
      expect(floatWindow?.style.display).toBe("none");
      expect(
        floatWindow?.querySelector("iframe[data-perspective]")
      ).toBeTruthy();
    });

    it("initializes float from legacy data-perspective-chat", () => {
      document.body.innerHTML = `
        <div data-perspective-chat="test-chat"></div>
      `;

      autoInit();

      expect(document.querySelector(".perspective-float-bubble")).toBeTruthy();
    });

    it("uses fetched channel and welcomeMessage for float bubble", async () => {
      vi.useFakeTimers();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            primaryColor: "#7c3aed",
            textColor: "#ffffff",
            darkPrimaryColor: "#a78bfa",
            darkTextColor: "#ffffff",
            allowedChannels: ["TEXT"],
            welcomeMessage: "Need help?",
          }),
        })
      );

      document.body.innerHTML = `
        <div data-perspective-float="test-float-config"></div>
      `;

      autoInit();

      // flush: fetch() resolve → .json() resolve → .then() callback
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      expect(bubble.innerHTML).toContain("lucide-messages-square");

      vi.advanceTimersByTime(3000);
      expect(document.querySelector(".perspective-float-teaser")).toBeTruthy();
    });

    it("parses params from data-perspective-params", () => {
      document.body.innerHTML = `
        <div data-perspective-widget="test" data-perspective-params="source=test,user=abc"></div>
      `;

      autoInit();

      const iframe = document.querySelector(
        "[data-perspective-widget] iframe"
      ) as HTMLIFrameElement;
      const url = new URL(iframe.src);
      expect(url.searchParams.get("source")).toBe("test");
      expect(url.searchParams.get("user")).toBe("abc");
    });

    it("parses theme from data-perspective-theme", () => {
      document.body.innerHTML = `
        <div data-perspective-widget="test" data-perspective-theme="dark"></div>
      `;

      autoInit();

      const wrapper = document.querySelector(".perspective-embed-root");
      expect(wrapper?.classList.contains("perspective-dark-theme")).toBe(true);
    });

    it("does not reinitialize popup buttons", () => {
      document.body.innerHTML = `
        <button data-perspective-popup="test">Open</button>
      `;

      autoInit();
      autoInit();

      const button = document.querySelector(
        "[data-perspective-popup]"
      ) as HTMLButtonElement;

      button.click();
      expect(document.querySelectorAll(".perspective-overlay").length).toBe(1);
    });
  });
});
