import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  preloadIframe,
  ensurePreloadedIframe,
  claimPreloadedIframe,
  destroyPreloaded,
  destroyPreloadedByType,
} from "./preload";

describe("preloadIframe", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });
  afterEach(() => {
    destroyPreloaded();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("creates a hidden iframe in the DOM", () => {
    preloadIframe("test-research", "popup", "https://getperspective.ai");

    const iframe = document.querySelector(
      "iframe[data-perspective-preload]"
    ) as HTMLIFrameElement;
    expect(iframe).not.toBeNull();
    expect(iframe.style.opacity).toBe("0");
    expect(iframe.src).toContain("/interview/test-research");
  });

  it("replaces preloaded iframe for same researchId + type", () => {
    preloadIframe("research-1", "popup", "https://getperspective.ai");
    preloadIframe("research-1", "popup", "https://getperspective.ai");

    const iframes = document.querySelectorAll(
      "iframe[data-perspective-preload]"
    );
    expect(iframes.length).toBe(1);
  });

  it("ensurePreloadedIframe keeps the existing iframe for same researchId + type", () => {
    preloadIframe("research-1", "popup", "https://getperspective.ai");
    const firstIframe = document.querySelector(
      "iframe[data-perspective-preload]"
    ) as HTMLIFrameElement;

    ensurePreloadedIframe("research-1", "popup", "https://getperspective.ai");

    const iframes = document.querySelectorAll(
      "iframe[data-perspective-preload]"
    );
    expect(iframes.length).toBe(1);
    expect(iframes[0]).toBe(firstIframe);
  });

  it("allows multiple preloaded iframes for different types", () => {
    preloadIframe("research-1", "popup", "https://getperspective.ai");
    preloadIframe("research-1", "float", "https://getperspective.ai");

    const iframes = document.querySelectorAll(
      "iframe[data-perspective-preload]"
    );
    expect(iframes.length).toBe(2);
  });

  it("allows multiple preloaded iframes for different researchIds", () => {
    preloadIframe("research-1", "popup", "https://getperspective.ai");
    preloadIframe("research-2", "popup", "https://getperspective.ai");

    const iframes = document.querySelectorAll(
      "iframe[data-perspective-preload]"
    );
    expect(iframes.length).toBe(2);
  });

  it("claimPreloadedIframe returns the iframe and clears state", () => {
    preloadIframe("test-research", "popup", "https://getperspective.ai");

    const claimed = claimPreloadedIframe("test-research", "popup");
    expect(claimed).not.toBeNull();
    expect(claimed?.iframe.getAttribute("data-perspective-preload")).toBeNull();
    expect(claimed?.wasReady).toBe(false);

    const again = claimPreloadedIframe("test-research", "popup");
    expect(again).toBeNull();
  });

  it("claimPreloadedIframe returns null for mismatched researchId", () => {
    preloadIframe("test-research", "popup", "https://getperspective.ai");
    expect(claimPreloadedIframe("wrong-id", "popup")).toBeNull();
  });

  it("claimPreloadedIframe returns null for mismatched type", () => {
    preloadIframe("test-research", "popup", "https://getperspective.ai");
    expect(claimPreloadedIframe("test-research", "slider")).toBeNull();
  });

  it("destroyPreloaded removes all preloaded iframes from DOM", () => {
    preloadIframe("research-1", "popup", "https://getperspective.ai");
    preloadIframe("research-1", "float", "https://getperspective.ai");
    destroyPreloaded();
    expect(
      document.querySelector("iframe[data-perspective-preload]")
    ).toBeNull();
  });

  it("destroyPreloadedByType removes only the matching iframe", () => {
    preloadIframe("research-1", "popup", "https://getperspective.ai");
    preloadIframe("research-1", "float", "https://getperspective.ai");
    destroyPreloadedByType("research-1", "popup");

    const iframes = document.querySelectorAll(
      "iframe[data-perspective-preload]"
    );
    expect(iframes.length).toBe(1);
    expect(claimPreloadedIframe("research-1", "float")).not.toBeNull();
  });

  it("wasReady is true after perspective:ready fires during preload", () => {
    const host = "https://getperspective.ai";
    preloadIframe("test-research", "popup", host);

    const iframe = document.querySelector(
      "iframe[data-perspective-preload]"
    ) as HTMLIFrameElement;

    // Simulate perspective:ready from iframe
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "perspective:ready", researchId: "test-research" },
        origin: host,
        source: iframe.contentWindow,
      })
    );

    const claimed = claimPreloadedIframe("test-research", "popup");
    expect(claimed).not.toBeNull();
    expect(claimed?.wasReady).toBe(true);
  });
});
