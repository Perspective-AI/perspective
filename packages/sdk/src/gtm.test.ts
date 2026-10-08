/**
 * Google Tag Manager loader behavior.
 *
 * These tests dynamic-import the browser bundle so a queue stub (or a
 * document that is still loading) can be installed before the module's
 * side effects run. Each case resets the module graph to simulate another
 * script evaluation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type PerspectiveGlobal = typeof window.Perspective;

function installStub(): void {
  const w = window as Window & {
    Perspective?: PerspectiveGlobal & { q?: ArrayLike<unknown>[] };
  };
  w.Perspective = function perspectiveStub() {
    (w.Perspective!.q = w.Perspective!.q || []).push(arguments);
  } as PerspectiveGlobal;
}

async function importBrowser() {
  vi.resetModules();
  return import("./browser");
}

function clearSdkGlobals(): void {
  delete window.__PERSPECTIVE_SDK_INITIALIZED__;
  delete window.__PERSPECTIVE_PUBLIC_API__;
  delete window.Perspective;
}

describe("GTM loader", () => {
  beforeEach(() => {
    clearSdkGlobals();
    document.body.innerHTML = "";
    sessionStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          primaryColor: "#7c3aed",
          textColor: "#ffffff",
          darkPrimaryColor: "#a78bfa",
          darkTextColor: "#ffffff",
          allowedChannels: null,
          welcomeMessage: "",
          avatarUrl: null,
        }),
      })
    );
  });

  afterEach(() => {
    window.__PERSPECTIVE_PUBLIC_API__?.configure?.({ observe: false });
    window.__PERSPECTIVE_PUBLIC_API__?.destroyAll?.();
    clearSdkGlobals();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Object.defineProperty(document, "readyState", {
      configurable: true,
      get: () => "complete",
    });
  });

  it("replays a queue stub, then stays callable with the method API", async () => {
    installStub();
    const slot = document.createElement("div");
    slot.id = "slot";
    document.body.appendChild(slot);

    const stub = window.Perspective!;
    stub("configure", { host: "https://cdn.example.com" });
    stub("mount", "#slot", { researchId: "queued-widget" });

    const mod = await importBrowser();

    expect(mod.getConfig().host).toBe("https://cdn.example.com");
    expect(slot.querySelector("iframe")).toBeTruthy();
    expect(slot.querySelector("iframe")?.getAttribute("src")).toContain(
      "https://cdn.example.com/"
    );

    expect(typeof window.Perspective).toBe("function");
    expect(typeof window.Perspective?.openPopup).toBe("function");
    expect(typeof window.Perspective?.autoInit).toBe("function");
    expect(typeof window.Perspective?.destroy).toBe("function");
    expect(window.Perspective).toBe(window.__PERSPECTIVE_PUBLIC_API__);

    window.Perspective?.("init", { researchId: "queued-popup", type: "popup" });
    expect(document.querySelector(".perspective-overlay")).toBeTruthy();

    window.Perspective?.("destroy", "queued-widget");
    expect(slot.querySelector("iframe")).toBeFalsy();
    window.Perspective?.("destroy", "queued-popup");
    expect(document.querySelector(".perspective-overlay")).toBeFalsy();
  });

  it("defers a queued mount until the container exists at DOMContentLoaded", async () => {
    Object.defineProperty(document, "readyState", {
      configurable: true,
      get: () => "loading",
    });
    installStub();
    const stub = window.Perspective!;
    stub("configure", { host: "https://cdn.example.com" });
    stub("mount", "#slot", { researchId: "late-mount" });

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await importBrowser();

    expect(document.querySelector("iframe")).toBeFalsy();
    expect(warn).not.toHaveBeenCalled();

    const slot = document.createElement("div");
    slot.id = "slot";
    document.body.appendChild(slot);
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(slot.querySelector("iframe")).toBeTruthy();
    expect(slot.querySelector("iframe")?.getAttribute("src")).toContain(
      "https://cdn.example.com/"
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it("defers Perspective('mount') calls made while the document is still loading", async () => {
    Object.defineProperty(document, "readyState", {
      configurable: true,
      get: () => "loading",
    });
    await importBrowser();

    window.Perspective?.("configure", { host: "https://cdn.example.com" });
    window.Perspective?.("mount", "#direct-slot", {
      researchId: "direct-late",
    });
    expect(document.querySelector("iframe")).toBeFalsy();

    const slot = document.createElement("div");
    slot.id = "direct-slot";
    document.body.appendChild(slot);
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(slot.querySelector("iframe")?.getAttribute("src")).toContain(
      "https://cdn.example.com/"
    );
  });

  it("waits for DOMContentLoaded before the initial autoInit", async () => {
    Object.defineProperty(document, "readyState", {
      configurable: true,
      get: () => "loading",
    });
    document.body.innerHTML =
      '<div data-perspective-widget="late-widget"></div>';

    await importBrowser();
    expect(document.querySelector("iframe")).toBeFalsy();

    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(
      document.querySelector("[data-perspective-widget] iframe")
    ).toBeTruthy();
  });

  it("does not double-mount a live float when the script evaluates again", async () => {
    document.body.innerHTML = '<div data-perspective-float="live-float"></div>';
    await importBrowser();
    const first = window.__PERSPECTIVE_PUBLIC_API__;
    expect(document.querySelectorAll(".perspective-float-bubble").length).toBe(
      1
    );

    await importBrowser();

    expect(window.__PERSPECTIVE_PUBLIC_API__).toBe(first);
    expect(window.Perspective).toBe(first);
    expect(document.querySelectorAll(".perspective-float-bubble").length).toBe(
      1
    );
  });

  it("replays a new stub queue and remounts on a second evaluation", async () => {
    const first = document.createElement("div");
    first.setAttribute("data-perspective-float", "spa-float");
    document.body.appendChild(first);
    await importBrowser();
    const firstBubble = document.querySelector(".perspective-float-bubble");
    const api = window.__PERSPECTIVE_PUBLIC_API__;
    expect(firstBubble).toBeTruthy();

    first.remove();
    const second = document.createElement("div");
    second.setAttribute("data-perspective-float", "spa-float");
    document.body.appendChild(second);

    installStub();
    window.Perspective?.("autoInit");

    await importBrowser();

    expect(window.Perspective).toBe(api);
    const bubbles = document.querySelectorAll(".perspective-float-bubble");
    expect(bubbles.length).toBe(1);
    expect(bubbles[0]).not.toBe(firstBubble);
  });

  it("defers a second evaluation's queued mount until DOMContentLoaded", async () => {
    Object.defineProperty(document, "readyState", {
      configurable: true,
      get: () => "loading",
    });
    await importBrowser();

    installStub();
    window.Perspective?.("mount", "#second-slot", {
      researchId: "second-late",
    });

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await importBrowser();
    expect(document.querySelector("iframe")).toBeFalsy();

    const slot = document.createElement("div");
    slot.id = "second-slot";
    document.body.appendChild(slot);
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(slot.querySelector("iframe")).toBeTruthy();
    expect(warn).not.toHaveBeenCalled();
  });

  it("remounts a widget whose container was replaced before the second load", async () => {
    document.body.innerHTML =
      '<div data-perspective-widget="spa-widget"></div>';
    await importBrowser();
    expect(document.querySelector("iframe")).toBeTruthy();

    document.body.innerHTML =
      '<div data-perspective-widget="spa-widget"></div>';
    await importBrowser();

    const slot = document.querySelector("[data-perspective-widget]");
    expect(slot?.querySelector("iframe")).toBeTruthy();
    expect(document.querySelectorAll("iframe[data-perspective]").length).toBe(
      1
    );
  });
});
