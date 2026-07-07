import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createLoadingIndicator, prefetchSceneImage } from "./loading";

/** The shared stylesheet is injected once; read it back for assertions. */
function injectedStyles(): string {
  return (
    document.getElementById("perspective-loading-styles")?.textContent ?? ""
  );
}

describe("createLoadingIndicator", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("returns an element with perspective-loading class", () => {
    const el = createLoadingIndicator();
    expect(el.className).toBe("perspective-loading");
  });

  it("renders scene layer, then content > frosted card > ring loader", () => {
    const el = createLoadingIndicator();
    const scene = el.children[0] as HTMLElement;
    expect(scene.className).toBe("perspective-loading__scene");
    const content = el.children[1] as HTMLElement;
    expect(content.className).toBe("perspective-loading__content");
    const card = content.firstElementChild as HTMLElement;
    expect(card.className).toBe("perspective-loading__card");
    expect(card.children.length).toBe(1);
    const ring = card.firstElementChild as HTMLElement;
    expect(ring.className).toBe("perspective-loading__ring");
  });

  it("animates the ring via CSS keyframes (always — essential motion)", () => {
    createLoadingIndicator();
    const css = injectedStyles();
    expect(css).toContain("@keyframes perspective-spin");
    expect(css).toMatch(
      /\.perspective-loading__ring\s*\{[^}]*animation:[^}]*perspective-spin/
    );
    // arc-only fallback declared before the color-mix track layer
    expect(css).toMatch(
      /background-image:\s*conic-gradient[^;]*;\s*background-image:\s*\n?\s*conic-gradient[\s\S]*color-mix/
    );
    // no reduced-motion override — a frozen spinner reads as hung
    expect(css).not.toContain("@media (prefers-reduced-motion");
  });

  it("sizes the ring at 40px", () => {
    createLoadingIndicator();
    expect(injectedStyles()).toMatch(
      /\.perspective-loading__ring\s*\{[^}]*width:\s*40px/
    );
  });

  it("builds the scene URL from host + researchId (encoded)", () => {
    const el = createLoadingIndicator({
      researchId: "pb b/vdh26",
      host: "https://s.getperspective.ai",
    });
    const scene = el.children[0] as HTMLElement;
    expect(scene.dataset.sceneUrl).toBe(
      "https://s.getperspective.ai/interview/pb%20b%2Fvdh26/scene-image"
    );
    // not applied as a background until the image actually loads
    expect(scene.style.backgroundImage).toBe("");
  });

  it("skips the scene image without researchId", () => {
    const el = createLoadingIndicator();
    const scene = el.children[0] as HTMLElement;
    expect(scene.dataset.sceneUrl).toBeUndefined();
    expect(scene.style.backgroundImage).toBe("");
  });

  it("normalizes the host to an origin (matches prefetch's dedupe key)", () => {
    const el = createLoadingIndicator({
      researchId: "path-host",
      host: "https://s.getperspective.ai/some/path",
    });
    const scene = el.children[0] as HTMLElement;
    expect(scene.dataset.sceneUrl).toBe(
      "https://s.getperspective.ai/interview/path-host/scene-image"
    );
    // prefetch for the same research is now a dedupe no-op
    expect(
      prefetchSceneImage("path-host", "https://s.getperspective.ai")
    ).toBeNull();
  });

  it("falls back to the default host when host is omitted", () => {
    const el = createLoadingIndicator({ researchId: "no-host" });
    const scene = el.children[0] as HTMLElement;
    expect(scene.dataset.sceneUrl).toBe(
      "https://getperspective.ai/interview/no-host/scene-image"
    );
  });

  it("injects a stylesheet with the container query targeting descendants", () => {
    createLoadingIndicator();
    const css = injectedStyles();
    // container-type: size (both axes) so height breakpoints match the app.
    expect(css).toContain("container-type: size");
    // px, not the app's rem — the overlay is in the host page (see loading.ts).
    expect(css).toContain("@container (min-width: 672px)");
    expect(css).not.toContain("@media (min-width");
    // An element can't be styled by the container it establishes.
    expect(css).toMatch(
      /@container[^{]*\{\s*\.perspective-loading__content\s*\{/
    );
    expect(css).not.toMatch(/@container[^{]*\{\s*\.perspective-loading\s*\{/);
  });

  it("steps the card's vertical padding at the app's height breakpoints", () => {
    createLoadingIndicator();
    const css = injectedStyles();
    // matched to the app: py-1 base, py-12 at @hsm (448px), py-20 at @hlg (768px)
    expect(css).toMatch(
      /@container \(min-width: 672px\) and \(min-height: 448px\)\s*\{\s*\.perspective-loading__content\s*\{\s*padding: 48px 4px/
    );
    expect(css).toMatch(
      /@container \(min-width: 672px\) and \(min-height: 768px\)\s*\{\s*\.perspective-loading__content\s*\{\s*padding: 80px 4px/
    );
  });

  it("frosts the card with the panel color and backdrop blur", () => {
    createLoadingIndicator();
    const css = injectedStyles();
    expect(css).toMatch(
      /\.perspective-loading__card\s*\{[^}]*background:\s*var\(--pl-panel\)/
    );
    expect(css).toContain("backdrop-filter: blur(22px)");
  });

  it("defaults to the app's light interview background", () => {
    const el = createLoadingIndicator();
    expect(el.style.background).toContain("#f5f2f0");
    expect(el.style.getPropertyValue("--pl-panel")).toContain("255, 255, 255");
  });

  it("defaults to the app's dark interview background", () => {
    const el = createLoadingIndicator({ theme: "dark" });
    expect(el.style.background).toContain("#15171e");
    expect(el.style.getPropertyValue("--pl-panel")).toContain("21, 23, 30");
  });

  it("uses brand bg color when provided", () => {
    const el = createLoadingIndicator({
      brand: { light: { bg: "#1a3a2a" } },
    });
    expect(el.style.background).toContain("#1a3a2a");
  });

  it("picks a dark panel palette for a dark brand bg under light theme", () => {
    const el = createLoadingIndicator({
      theme: "light",
      brand: { light: { bg: "#0a0a0a" } }, // dark bg despite light theme
    });
    expect(el.style.background).toContain("#0a0a0a");
    expect(el.style.getPropertyValue("--pl-panel")).toContain("21, 23, 30");
  });

  it("picks a light panel palette for a light brand bg under dark theme", () => {
    const el = createLoadingIndicator({
      theme: "dark",
      brand: { dark: { bg: "#fafafa" } }, // light bg despite dark theme
    });
    expect(el.style.background).toContain("#fafafa");
    expect(el.style.getPropertyValue("--pl-panel")).toContain("255, 255, 255");
  });

  describe("ring primary color precedence", () => {
    it("defaults to the Perspective primary per theme", () => {
      const light = createLoadingIndicator({ theme: "light" });
      expect(light.style.getPropertyValue("--pl-primary")).toBe("#7c3aed");
      const dark = createLoadingIndicator({ theme: "dark" });
      expect(dark.style.getPropertyValue("--pl-primary")).toBe("#a78bfa");
    });

    it("uses the API embed config primary when provided", () => {
      const light = createLoadingIndicator({
        theme: "light",
        apiConfig: { primaryColor: "#0ea5e9", darkPrimaryColor: "#38bdf8" },
      });
      expect(light.style.getPropertyValue("--pl-primary")).toBe("#0ea5e9");
      const dark = createLoadingIndicator({
        theme: "dark",
        apiConfig: { primaryColor: "#0ea5e9", darkPrimaryColor: "#38bdf8" },
      });
      expect(dark.style.getPropertyValue("--pl-primary")).toBe("#38bdf8");
    });

    it("local brand primary beats the API config", () => {
      const el = createLoadingIndicator({
        theme: "light",
        brand: { light: { primary: "#e11d48" } },
        apiConfig: { primaryColor: "#0ea5e9", darkPrimaryColor: "#38bdf8" },
      });
      expect(el.style.getPropertyValue("--pl-primary")).toBe("#e11d48");
    });

    it("falls back to default when API config omits the dark variant", () => {
      const el = createLoadingIndicator({
        theme: "dark",
        apiConfig: { primaryColor: "#0ea5e9" },
      });
      expect(el.style.getPropertyValue("--pl-primary")).toBe("#a78bfa");
    });

    it("treats empty strings as unset, keeping theme-appropriate defaults", () => {
      // empty brand falls through to the API config
      const viaApi = createLoadingIndicator({
        theme: "light",
        brand: { light: { primary: "" } },
        apiConfig: { primaryColor: "#0ea5e9" },
      });
      expect(viaApi.style.getPropertyValue("--pl-primary")).toBe("#0ea5e9");
      // empty everything in dark theme → dark default, never the light one
      const dark = createLoadingIndicator({
        theme: "dark",
        brand: { dark: { primary: "" } },
        apiConfig: { darkPrimaryColor: "" },
      });
      expect(dark.style.getPropertyValue("--pl-primary")).toBe("#a78bfa");
    });
  });

  it("lets callers override the root border radius (float/popup windows)", () => {
    const el = createLoadingIndicator();
    el.style.borderRadius = "16px";
    const css = injectedStyles();
    expect(el.style.borderRadius).toBe("16px");
    expect(css).toMatch(/\.perspective-loading\s*\{[^}]*overflow:\s*hidden/);
  });

  it("accepts the deprecated appearance option and ignores it", () => {
    const el = createLoadingIndicator({
      appearance: {
        hideBranding: true,
        hideProgress: true,
        hideGreeting: true,
      },
    });
    // structure is unchanged — the loading state has no branding/progress/greeting
    expect(el.querySelector(".perspective-loading__card")).toBeTruthy();
    expect(el.querySelector(".perspective-loading__ring")).toBeTruthy();
  });

  it("prefetchSceneImage fetches once per URL and dedupes after", () => {
    const url = prefetchSceneImage(
      "prefetch-once",
      "https://s.getperspective.ai"
    );
    expect(url).toBe(
      "https://s.getperspective.ai/interview/prefetch-once/scene-image"
    );
    // second intent signal for the same research is a no-op
    expect(
      prefetchSceneImage("prefetch-once", "https://s.getperspective.ai")
    ).toBeNull();
  });

  it("prefetchSceneImage is a no-op without a researchId", () => {
    expect(prefetchSceneImage(undefined, "https://x.example")).toBeNull();
  });

  it("mounting the loading state marks its scene URL as already requested", () => {
    createLoadingIndicator({
      researchId: "mounted-first",
      host: "https://s.getperspective.ai",
    });
    expect(
      prefetchSceneImage("mounted-first", "https://s.getperspective.ai")
    ).toBeNull();
  });

  it("bounds the dedupe set so it can't grow without limit", () => {
    const host = "https://bound.getperspective.ai";
    // Prefetch far more distinct research ids than the cap (50).
    prefetchSceneImage("bounded-oldest", host);
    for (let i = 0; i < 60; i++) prefetchSceneImage(`bounded-${i}`, host);
    // The oldest entry was evicted, so it is no longer suppressed and
    // re-prefetching it fires again (returns the URL rather than null).
    expect(prefetchSceneImage("bounded-oldest", host)).toBe(
      `${host}/interview/bounded-oldest/scene-image`
    );
    // A recent entry is still remembered (deduped).
    expect(prefetchSceneImage("bounded-59", host)).toBeNull();
  });
});
