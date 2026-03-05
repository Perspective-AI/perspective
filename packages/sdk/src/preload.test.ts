import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  preloadIframe,
  claimPreloadedIframe,
  destroyPreloaded,
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

  it("only keeps one preloaded iframe at a time", () => {
    preloadIframe("research-1", "popup", "https://getperspective.ai");
    preloadIframe("research-2", "popup", "https://getperspective.ai");

    const iframes = document.querySelectorAll(
      "iframe[data-perspective-preload]"
    );
    expect(iframes.length).toBe(1);
  });

  it("claimPreloadedIframe returns the iframe and clears state", () => {
    preloadIframe("test-research", "popup", "https://getperspective.ai");

    const iframe = claimPreloadedIframe("test-research");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("data-perspective-preload")).toBeNull();

    const again = claimPreloadedIframe("test-research");
    expect(again).toBeNull();
  });

  it("claimPreloadedIframe returns null for mismatched researchId", () => {
    preloadIframe("test-research", "popup", "https://getperspective.ai");
    expect(claimPreloadedIframe("wrong-id")).toBeNull();
  });

  it("destroyPreloaded removes the iframe from DOM", () => {
    preloadIframe("test-research", "popup", "https://getperspective.ai");
    destroyPreloaded();
    expect(
      document.querySelector("iframe[data-perspective-preload]")
    ).toBeNull();
  });
});
