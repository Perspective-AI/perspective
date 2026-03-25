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
} from "./browser";
import { getPersistedOpenState, setPersistedOpenState } from "./state";

const DEFAULT_CONFIG = {
  primaryColor: "#7c3aed",
  textColor: "#ffffff",
  darkPrimaryColor: "#a78bfa",
  darkTextColor: "#ffffff",
  allowedChannels: null,
  welcomeMessage: "",
  avatarUrl: null,
};

/** Flush microtask queue to resolve fetchConfig promises */
async function flushConfigFetch() {
  await Promise.resolve(); // fetch resolves
  await Promise.resolve(); // .json() resolves
  await Promise.resolve(); // .then() callback runs
}

describe("browser entry", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    sessionStorage.clear();
    // Default fetch mock for autoInit config fetching
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => DEFAULT_CONFIG,
      })
    );
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
      expect(getPersistedOpenState({ researchId: "test", type: "popup" })).toBe(
        false
      );
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

    it("preserves persisted open state for teardown", () => {
      init({ researchId: "test1", type: "popup" });

      destroyAll();

      expect(
        getPersistedOpenState({ researchId: "test1", type: "popup" })
      ).toBe(true);
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

  describe("autoInit robustness", () => {
    it("ignores element with empty widget attribute", () => {
      document.body.innerHTML = `
        <div data-perspective-widget=""></div>
      `;

      expect(() => autoInit()).not.toThrow();
      expect(document.querySelector("iframe")).toBeFalsy();
    });

    it("treats whitespace-only widget attribute as truthy (creates iframe with empty researchId)", async () => {
      document.body.innerHTML = `
        <div data-perspective-widget="   "></div>
      `;

      expect(() => autoInit()).not.toThrow();
      await flushConfigFetch();
      expect(document.querySelector("iframe[data-perspective]")).toBeTruthy();
    });

    it("handles malformed params attribute gracefully", async () => {
      document.body.innerHTML = `
        <div data-perspective-widget="test" data-perspective-params="malformed,,=value,key="></div>
      `;

      expect(() => autoInit()).not.toThrow();
      await flushConfigFetch();
      expect(document.querySelector("iframe[data-perspective]")).toBeTruthy();
    });

    it("handles empty params attribute", async () => {
      document.body.innerHTML = `
        <div data-perspective-widget="test" data-perspective-params=""></div>
      `;

      expect(() => autoInit()).not.toThrow();
      await flushConfigFetch();
      expect(document.querySelector("iframe[data-perspective]")).toBeTruthy();
    });

    it("handles invalid theme attribute value", async () => {
      document.body.innerHTML = `
        <div data-perspective-widget="test" data-perspective-theme="invalid-theme"></div>
      `;

      expect(() => autoInit()).not.toThrow();
      await flushConfigFetch();
      expect(document.querySelector("iframe[data-perspective]")).toBeTruthy();
    });

    it("handles malformed brand attribute", async () => {
      document.body.innerHTML = `
        <div data-perspective-widget="test" data-perspective-brand="not-valid-format"></div>
      `;

      expect(() => autoInit()).not.toThrow();
      await flushConfigFetch();
      expect(document.querySelector("iframe[data-perspective]")).toBeTruthy();
    });

    it("calling autoInit twice does not duplicate widgets", async () => {
      document.body.innerHTML = `
        <div data-perspective-widget="test-widget"></div>
      `;

      autoInit();
      await flushConfigFetch();
      autoInit();
      await flushConfigFetch();

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

    it("multiple elements with same researchId - second element does not create iframe (dedupe)", async () => {
      document.body.innerHTML = `
        <div id="widget1" data-perspective-widget="same-research-id"></div>
        <div id="widget2" data-perspective-widget="same-research-id"></div>
      `;

      autoInit();
      await flushConfigFetch();

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
    it("initializes widget from data-perspective-widget", async () => {
      document.body.innerHTML = `
        <div data-perspective-widget="test-widget"></div>
      `;

      autoInit();
      await flushConfigFetch();

      expect(
        document.querySelector("[data-perspective-widget] iframe")
      ).toBeTruthy();
    });

    it("initializes fullpage from data-perspective-fullpage", async () => {
      document.body.innerHTML = `
        <div data-perspective-fullpage="test-fullpage"></div>
      `;

      autoInit();
      await flushConfigFetch();

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

    it("restores popup open state from sessionStorage", async () => {
      setPersistedOpenState({
        researchId: "test-popup",
        type: "popup",
        open: true,
      });
      document.body.innerHTML = `
        <button data-perspective-popup="test-popup">Open</button>
      `;

      autoInit();
      await flushConfigFetch();

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

    it("restores slider open state from sessionStorage", async () => {
      setPersistedOpenState({
        researchId: "test-slider",
        type: "slider",
        open: true,
      });
      document.body.innerHTML = `
        <button data-perspective-slider="test-slider">Open</button>
      `;

      autoInit();
      await flushConfigFetch();

      expect(document.querySelector(".perspective-slider")).toBeTruthy();
    });

    it("initializes float from data-perspective-float", () => {
      document.body.innerHTML = `
        <div data-perspective-float="test-float"></div>
      `;

      autoInit();

      expect(document.querySelector(".perspective-float-bubble")).toBeTruthy();
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

    it("parses params from data-perspective-params", async () => {
      document.body.innerHTML = `
        <div data-perspective-widget="test" data-perspective-params="source=test,user=abc"></div>
      `;

      autoInit();
      await flushConfigFetch();

      const iframe = document.querySelector(
        "[data-perspective-widget] iframe"
      ) as HTMLIFrameElement;
      const url = new URL(iframe.src);
      expect(url.searchParams.get("source")).toBe("test");
      expect(url.searchParams.get("user")).toBe("abc");
    });

    it("parses theme from data-perspective-theme", async () => {
      document.body.innerHTML = `
        <div data-perspective-widget="test" data-perspective-theme="dark"></div>
      `;

      autoInit();
      await flushConfigFetch();

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

  describe("float launcher data attributes", () => {
    beforeEach(() => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            primaryColor: "#7c3aed",
            textColor: "#ffffff",
            darkPrimaryColor: "#a78bfa",
            darkTextColor: "#ffffff",
            avatarUrl: null,
          }),
        })
      );
    });

    it("parses launcher-style as CSS overrides", () => {
      document.body.innerHTML = `
        <div data-perspective-float="test-id"
             data-perspective-launcher-style="width:64px;border-radius:12px"></div>
      `;
      autoInit();

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLElement;
      expect(bubble.style.width).toBe("64px");
      expect(bubble.style.borderRadius).toBe("12px");
    });

    it("parses launcher-class as className", () => {
      document.body.innerHTML = `
        <div data-perspective-float="test-id"
             data-perspective-launcher-class="my-class"></div>
      `;
      autoInit();

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLElement;
      expect(bubble.classList.contains("my-class")).toBe(true);
    });

    it("parses launcher-icon URL starting with http", () => {
      document.body.innerHTML = `
        <div data-perspective-float="test-id"
             data-perspective-launcher-icon="https://example.com/icon.png"></div>
      `;
      autoInit();

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLElement;
      const img = bubble.querySelector("img");
      expect(img).toBeTruthy();
      expect(img!.src).toBe("https://example.com/icon.png");
    });

    it("parses launcher-icon='avatar' and renders img after fetch", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            primaryColor: "#7c3aed",
            textColor: "#ffffff",
            darkPrimaryColor: "#a78bfa",
            darkTextColor: "#ffffff",
            avatarUrl: "https://example.com/avatar.png",
          }),
        })
      );

      document.body.innerHTML = `
        <div data-perspective-float="test-id-avatar"
             data-perspective-launcher-icon="avatar"></div>
      `;
      autoInit();

      // Flush: fetch() → .json() → .then()
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLElement;
      const img = bubble.querySelector("img");
      expect(img).toBeTruthy();
      expect(img!.src).toBe("https://example.com/avatar.png");
    });
  });
});
