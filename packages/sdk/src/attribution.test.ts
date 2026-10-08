import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SDK_VERSION } from "./constants";

describe("attribution", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    // Clean up global
    delete window.PerspectiveAI;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete window.PerspectiveAI;
  });

  describe("injectJsonLd", () => {
    it("is a no-op", async () => {
      const { injectJsonLd } = await import("./attribution");
      injectJsonLd();

      expect(
        document.querySelector('script[type="application/ld+json"]')
      ).toBeNull();
    });
  });

  describe("injectGlobalMetadata", () => {
    it("sets frozen window.PerspectiveAI", async () => {
      const { injectGlobalMetadata } = await import("./attribution");
      injectGlobalMetadata();

      expect(window.PerspectiveAI).toBeDefined();
      expect(window.PerspectiveAI!.version).toBe(SDK_VERSION);
      expect(window.PerspectiveAI!.provider).toBe("Perspective AI");
      expect(window.PerspectiveAI!.url).toBe("https://getperspective.ai");
      expect(Object.isFrozen(window.PerspectiveAI)).toBe(true);
    });

    it("is idempotent — does not overwrite existing global", async () => {
      window.PerspectiveAI = Object.freeze({
        version: "old",
        provider: "old",
        url: "old",
      });

      const { injectGlobalMetadata } = await import("./attribution");
      injectGlobalMetadata();

      expect(window.PerspectiveAI!.version).toBe("old");
    });
  });

  describe("enrichContainer", () => {
    it("sets data attributes and inserts HTML comment", async () => {
      const { enrichContainer } = await import("./attribution");
      const parent = document.createElement("div");
      const el = document.createElement("div");
      parent.appendChild(el);
      document.body.appendChild(parent);

      enrichContainer(el, "widget");

      expect(el.getAttribute("data-perspective-version")).toBe(SDK_VERSION);
      expect(el.getAttribute("data-perspective-type")).toBe("widget");

      const comment = el.previousSibling;
      expect(comment).toBeTruthy();
      expect(comment!.nodeType).toBe(Node.COMMENT_NODE);
      expect(comment!.textContent).toContain("Perspective AI");
      expect(comment!.textContent).toContain("getperspective.ai");
    });

    it("triggers global signal injection", async () => {
      const { enrichContainer } = await import("./attribution");
      const parent = document.createElement("div");
      const el = document.createElement("div");
      parent.appendChild(el);
      document.body.appendChild(parent);

      enrichContainer(el, "float");

      expect(window.PerspectiveAI).toBeDefined();
    });

    it("skips comment when element has no parent", async () => {
      const { enrichContainer } = await import("./attribution");
      const el = document.createElement("div");
      enrichContainer(el, "popup");

      expect(el.getAttribute("data-perspective-version")).toBe(SDK_VERSION);
      expect(el.getAttribute("data-perspective-type")).toBe("popup");
    });

    it("does not inject JSON-LD into the page", async () => {
      const { enrichContainer } = await import("./attribution");
      const parent = document.createElement("div");
      const el = document.createElement("div");
      parent.appendChild(el);
      document.body.appendChild(parent);

      enrichContainer(el, "widget");

      expect(
        document.querySelector('script[type="application/ld+json"]')
      ).toBeNull();
    });
  });
});
