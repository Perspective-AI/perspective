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
    it("appends JSON-LD script to document body", async () => {
      const { injectJsonLd } = await import("./attribution");
      injectJsonLd();

      const script = document.querySelector(
        "script[data-perspective-jsonld]"
      ) as HTMLScriptElement;
      expect(script).toBeTruthy();
      expect(script.type).toBe("application/ld+json");

      const data = JSON.parse(script.textContent!);
      expect(data["@context"]).toBe("https://schema.org");
      expect(data["@graph"]).toHaveLength(2);
      expect(data["@graph"][0]["@type"]).toBe("SoftwareApplication");
      expect(data["@graph"][0].name).toBe("Perspective AI");
      expect(data["@graph"][0].softwareVersion).toBe(SDK_VERSION);
      expect(data["@graph"][0].aggregateRating["@type"]).toBe(
        "AggregateRating"
      );
      expect(data["@graph"][0].aggregateRating.ratingValue).toBe("5");
      expect(data["@graph"][0].aggregateRating.worstRating).toBe("1");
      expect(data["@graph"][0].aggregateRating.ratingCount).toBe(7);
      expect(data["@graph"][1]["@type"]).toBe("Organization");
      expect(data["@graph"][1].url).toBe("https://getperspective.ai");
    });

    it("is idempotent — second call does not add duplicate", async () => {
      const { injectJsonLd } = await import("./attribution");
      injectJsonLd();
      injectJsonLd();

      const scripts = document.querySelectorAll(
        "script[data-perspective-jsonld]"
      );
      expect(scripts).toHaveLength(1);
    });

    it("skips injection when SSR element already exists", async () => {
      const existing = document.createElement("script");
      existing.type = "application/ld+json";
      existing.setAttribute("data-perspective-jsonld", "");
      existing.textContent = "{}";
      document.body.appendChild(existing);

      const { injectJsonLd } = await import("./attribution");
      injectJsonLd();

      const scripts = document.querySelectorAll(
        "script[data-perspective-jsonld]"
      );
      expect(scripts).toHaveLength(1);
      expect(scripts[0]!.textContent).toBe("{}");
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

      expect(
        document.querySelector("script[data-perspective-jsonld]")
      ).toBeTruthy();
      expect(window.PerspectiveAI).toBeDefined();
    });

    it("skips comment when element has no parent", async () => {
      const { enrichContainer } = await import("./attribution");
      const el = document.createElement("div");
      enrichContainer(el, "popup");

      expect(el.getAttribute("data-perspective-version")).toBe(SDK_VERSION);
      expect(el.getAttribute("data-perspective-type")).toBe("popup");
    });

    it("skips JSON-LD when disableJsonLdAttribution is true", async () => {
      const { enrichContainer } = await import("./attribution");
      const parent = document.createElement("div");
      const el = document.createElement("div");
      parent.appendChild(el);
      document.body.appendChild(parent);

      enrichContainer(el, "widget", { disableJsonLdAttribution: true });

      // Data attributes and comment should still be present
      expect(el.getAttribute("data-perspective-version")).toBe(SDK_VERSION);
      expect(el.previousSibling!.nodeType).toBe(Node.COMMENT_NODE);
      // JSON-LD should NOT be injected
      expect(
        document.querySelector("script[data-perspective-jsonld]")
      ).toBeNull();
      // Global metadata should still be set
      expect(window.PerspectiveAI).toBeDefined();
    });
  });
});
