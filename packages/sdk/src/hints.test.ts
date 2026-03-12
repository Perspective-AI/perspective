import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { injectResourceHints } from "./hints";

describe("injectResourceHints", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("injects preconnect and dns-prefetch links", () => {
    injectResourceHints("https://getperspective.ai");

    const preconnect = document.querySelector(
      'link[rel="preconnect"][href="https://getperspective.ai"]'
    );
    const dnsPrefetch = document.querySelector(
      'link[rel="dns-prefetch"][href="https://getperspective.ai"]'
    );

    expect(preconnect).not.toBeNull();
    expect(preconnect?.getAttribute("crossorigin")).toBe("");
    expect(dnsPrefetch).not.toBeNull();
  });

  it("is idempotent", () => {
    injectResourceHints("https://getperspective.ai");
    injectResourceHints("https://getperspective.ai");

    const links = document.querySelectorAll(
      'link[rel="preconnect"][href="https://getperspective.ai"]'
    );
    expect(links.length).toBe(1);
  });
});
