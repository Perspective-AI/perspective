import { test, expect, Route } from "@playwright/test";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * E2E tests for @perspective-ai/sdk
 *
 * These tests verify:
 * 1. Script tag auto-init with data attributes
 * 2. Manual API (createWidget, openPopup, openSlider, createFloatBubble)
 * 3. Popup/Slider lifecycle (open, close, escape key)
 * 4. PostMessage communication
 * 5. Origin validation security
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Path to built SDK - tests require build first
const SDK_PATH = path.resolve(__dirname, "../dist/cdn/perspective.global.js");
const MOCK_IFRAME_PATH = path.resolve(__dirname, "fixtures/mock-iframe.html");

// Check SDK exists before running tests
test.beforeAll(async () => {
  if (!fs.existsSync(SDK_PATH)) {
    throw new Error(
      `SDK not built. Run "pnpm build" before running E2E tests.\nExpected: ${SDK_PATH}`
    );
  }
});

// Set up route interception for all tests
test.beforeEach(async ({ page }) => {
  // Serve the built SDK at /sdk/perspective.global.js
  await page.route("**/sdk/perspective.global.js", async (route: Route) => {
    const body = fs.readFileSync(SDK_PATH, "utf-8");
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body,
    });
  });

  // Intercept iframe loads and serve mock
  await page.route("**/interview/**", async (route: Route) => {
    const mockHtml = fs.readFileSync(MOCK_IFRAME_PATH, "utf-8");
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: mockHtml,
    });
  });

  // Mock the config API endpoint
  await page.route("**/api/v1/embed/config/**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        primaryColor: "#7c3aed",
        textColor: "#ffffff",
        darkPrimaryColor: "#a78bfa",
        darkTextColor: "#ffffff",
      }),
    });
  });
});

test.describe("Script Tag Auto-Init", () => {
  test("creates widget from data-perspective-widget attribute", async ({
    page,
  }) => {
    await page.goto("/script-tag.html");

    // Widget container should have an iframe
    const iframe = page.locator("#widget-container iframe[data-perspective]");
    await expect(iframe).toBeVisible();

    // Iframe src should contain research ID and embed params
    const src = await iframe.getAttribute("src");
    expect(src).toContain("pbbvdh26");
    expect(src).toContain("embed=true");
    expect(src).toContain("embed_type=widget");
    expect(src).toContain("source=test");
    expect(src).toContain("user=abc");
  });

  test("creates popup trigger from data-perspective-popup attribute", async ({
    page,
  }) => {
    await page.goto("/script-tag.html");

    // Click the popup trigger
    await page.click("#popup-trigger");

    // Popup overlay should appear (class is perspective-overlay)
    const overlay = page.locator(".perspective-overlay");
    await expect(overlay).toBeVisible();

    // Popup should contain an iframe
    const iframe = page.locator(".perspective-modal iframe[data-perspective]");
    await expect(iframe).toBeVisible();

    const src = await iframe.getAttribute("src");
    expect(src).toContain("pbbvdh26");
    expect(src).toContain("embed_type=popup");
  });

  test("creates slider trigger from data-perspective-slider attribute", async ({
    page,
  }) => {
    await page.goto("/script-tag.html");

    // Click the slider trigger
    await page.click("#slider-trigger");

    // Slider container should appear
    const slider = page.locator(".perspective-slider");
    await expect(slider).toBeVisible();

    // Slider should contain an iframe
    const iframe = page.locator(".perspective-slider iframe[data-perspective]");
    await expect(iframe).toBeVisible();

    const src = await iframe.getAttribute("src");
    expect(src).toContain("pbbvdh26");
    expect(src).toContain("embed_type=slider");
  });

  test("creates float bubble from data-perspective-float attribute", async ({
    page,
  }) => {
    await page.goto("/script-tag.html");

    // Float bubble is appended to body, not inside the container
    const floatBubble = page.locator("body > .perspective-float-bubble");
    await expect(floatBubble).toBeVisible();
    await expect(
      page.locator("iframe[data-perspective-preload='pbbvdh26-float']")
    ).toBeAttached();
  });
});

test.describe("Manual API", () => {
  test("Perspective.createWidget creates inline widget", async ({ page }) => {
    await page.goto("/manual-api.html");

    // Click button to create widget
    await page.click("#create-widget-btn");

    // Widget container should have an iframe
    const iframe = page.locator("#widget-container iframe[data-perspective]");
    await expect(iframe).toBeVisible();

    // Verify iframe src
    const src = await iframe.getAttribute("src");
    expect(src).toContain("pbbvdh26");
    expect(src).toContain("source=manual");
    expect(src).toContain("user=xyz");
  });

  test("Perspective.openPopup opens modal popup", async ({ page }) => {
    await page.goto("/manual-api.html");

    // Initially no popup
    await expect(page.locator(".perspective-overlay")).not.toBeVisible();

    // Open popup
    await page.click("#open-popup-btn");

    // Popup should be visible (overlay class is perspective-overlay)
    const overlay = page.locator(".perspective-overlay");
    await expect(overlay).toBeVisible();

    const iframe = page.locator(".perspective-modal iframe[data-perspective]");
    await expect(iframe).toBeVisible();

    const src = await iframe.getAttribute("src");
    expect(src).toContain("pbbvdh26");
  });

  test("Perspective.openSlider opens slider panel", async ({ page }) => {
    await page.goto("/manual-api.html");

    // Initially no slider
    await expect(page.locator(".perspective-slider")).not.toBeVisible();

    // Open slider
    await page.click("#open-slider-btn");

    // Slider should be visible
    const slider = page.locator(".perspective-slider");
    await expect(slider).toBeVisible();

    const iframe = page.locator(".perspective-slider iframe[data-perspective]");
    await expect(iframe).toBeVisible();
  });

  test("Perspective.createFloatBubble creates floating bubble", async ({
    page,
  }) => {
    await page.goto("/manual-api.html");

    // Create float bubble
    await page.click("#create-float-btn");

    // Float bubble should be visible (appended to body)
    const bubble = page.locator("body > .perspective-float-bubble");
    await expect(bubble).toBeVisible();
  });

  test("Perspective.destroyAll removes tracked embeds", async ({ page }) => {
    await page.goto("/manual-api.html");

    // Open popup (tracked via instances map)
    await page.click("#open-popup-btn");
    await expect(page.locator(".perspective-overlay")).toBeVisible();

    // Close popup first using escape key
    await page.keyboard.press("Escape");
    await expect(page.locator(".perspective-overlay")).not.toBeVisible();

    // Open slider now
    await page.click("#open-slider-btn");
    await expect(page.locator(".perspective-slider")).toBeVisible();

    // Destroy all while slider is open (force click through any overlay)
    await page.click("#destroy-all-btn", { force: true });

    // Slider should be removed by destroyAll
    await expect(page.locator(".perspective-slider")).not.toBeVisible();
  });
});

test.describe("Popup Lifecycle", () => {
  test("popup closes on close button click", async ({ page }) => {
    await page.goto("/manual-api.html");

    // Open popup
    await page.click("#open-popup-btn");
    await expect(page.locator(".perspective-overlay")).toBeVisible();

    // Click close button
    await page.click(".perspective-close");

    // Popup should be closed
    await expect(page.locator(".perspective-overlay")).not.toBeVisible();
  });

  test("popup closes on overlay click", async ({ page }) => {
    await page.goto("/manual-api.html");

    // Open popup
    await page.click("#open-popup-btn");
    await expect(page.locator(".perspective-overlay")).toBeVisible();

    // Click overlay (outside modal content) - use force since modal might be on top
    await page
      .locator(".perspective-overlay")
      .click({ position: { x: 10, y: 10 } });

    // Popup should be closed
    await expect(page.locator(".perspective-overlay")).not.toBeVisible();
  });

  test("popup closes on Escape key", async ({ page }) => {
    await page.goto("/manual-api.html");

    // Open popup
    await page.click("#open-popup-btn");
    await expect(page.locator(".perspective-overlay")).toBeVisible();

    // Press Escape
    await page.keyboard.press("Escape");

    // Popup should be closed
    await expect(page.locator(".perspective-overlay")).not.toBeVisible();
  });

  test("popup fires onClose callback", async ({ page }) => {
    await page.goto("/manual-api.html");

    // Open popup
    await page.click("#open-popup-btn");
    await expect(page.locator(".perspective-overlay")).toBeVisible();

    // Close popup
    await page.keyboard.press("Escape");

    // Check callback was fired
    const events = await page.evaluate(() => (window as any).__testEvents);
    expect(events.some((e: any) => e.name === "popup:close")).toBe(true);
  });
});

test.describe("Slider Lifecycle", () => {
  test("slider closes on close button click", async ({ page }) => {
    await page.goto("/manual-api.html");

    // Open slider
    await page.click("#open-slider-btn");
    await expect(page.locator(".perspective-slider")).toBeVisible();

    // Click close button (inside slider)
    await page.locator(".perspective-slider .perspective-close").click();

    // Slider should be closed
    await expect(page.locator(".perspective-slider")).not.toBeVisible();
  });

  test("slider closes on backdrop click", async ({ page }) => {
    await page.goto("/manual-api.html");

    // Open slider
    await page.click("#open-slider-btn");
    await expect(page.locator(".perspective-slider")).toBeVisible();

    // Click backdrop
    await page.locator(".perspective-slider-backdrop").click();

    // Slider should be closed
    await expect(page.locator(".perspective-slider")).not.toBeVisible();
  });

  test("slider closes on Escape key", async ({ page }) => {
    await page.goto("/manual-api.html");

    // Open slider
    await page.click("#open-slider-btn");
    await expect(page.locator(".perspective-slider")).toBeVisible();

    // Press Escape
    await page.keyboard.press("Escape");

    // Slider should be closed
    await expect(page.locator(".perspective-slider")).not.toBeVisible();
  });

  test("slider fires onClose callback", async ({ page }) => {
    await page.goto("/manual-api.html");

    // Open slider
    await page.click("#open-slider-btn");
    await expect(page.locator(".perspective-slider")).toBeVisible();

    // Close slider
    await page.keyboard.press("Escape");

    // Check callback was fired
    const events = await page.evaluate(() => (window as any).__testEvents);
    expect(events.some((e: any) => e.name === "slider:close")).toBe(true);
  });
});

test.describe("PostMessage Communication", () => {
  test("fires onReady when iframe sends ready message", async ({ page }) => {
    await page.goto("/manual-api.html");

    // Create widget
    await page.click("#create-widget-btn");

    // Wait for iframe to load and send ready
    await page.waitForTimeout(200);

    // Check callback was fired
    const events = await page.evaluate(() => (window as any).__testEvents);
    expect(events.some((e: any) => e.name === "widget:ready")).toBe(true);
  });

  test("fires onSubmit when iframe sends submit message", async ({ page }) => {
    await page.goto("/manual-api.html");

    // Create widget
    await page.click("#create-widget-btn");

    // Wait for iframe to load
    await page.waitForTimeout(200);

    // Get the iframe and trigger submit from within it
    const iframeHandle = page.frameLocator(
      "#widget-container iframe[data-perspective]"
    );
    await iframeHandle.locator("#send-submit").click();

    // Wait for message to propagate
    await page.waitForTimeout(100);

    // Check callback was fired
    const events = await page.evaluate(() => (window as any).__testEvents);
    expect(events.some((e: any) => e.name === "widget:submit")).toBe(true);
  });

  test("fires onError when iframe sends error message", async ({ page }) => {
    await page.goto("/manual-api.html");

    // Create widget
    await page.click("#create-widget-btn");

    // Wait for iframe to load
    await page.waitForTimeout(200);

    // Trigger error from iframe
    const iframeHandle = page.frameLocator(
      "#widget-container iframe[data-perspective]"
    );
    await iframeHandle.locator("#send-error").click();

    // Wait for message to propagate
    await page.waitForTimeout(100);

    // Check callback was fired
    const events = await page.evaluate(() => (window as any).__testEvents);
    const errorEvent = events.find((e: any) => e.name === "widget:error");
    expect(errorEvent).toBeTruthy();
  });
});

test.describe("Security", () => {
  test("rejects messages from wrong origin", async ({ page }) => {
    await page.goto("/manual-api.html");

    // Create widget
    await page.click("#create-widget-btn");
    await page.waitForTimeout(200);

    // Clear events
    await page.evaluate(() => {
      (window as any).__testEvents = [];
    });

    // Send fake message from page context (wrong origin - not from iframe)
    await page.evaluate(() => {
      window.postMessage(
        {
          type: "perspective:submit",
          researchId: "pbbvdh26",
        },
        "*"
      );
    });

    await page.waitForTimeout(100);

    // onSubmit should NOT have been called (message from wrong source)
    const events = await page.evaluate(() => (window as any).__testEvents);
    expect(events.some((e: any) => e.name === "widget:submit")).toBe(false);
  });

  test("iframe has correct sandbox attributes", async ({ page }) => {
    await page.goto("/manual-api.html");

    // Create widget
    await page.click("#create-widget-btn");

    const iframe = page.locator("#widget-container iframe[data-perspective]");
    await expect(iframe).toBeVisible();

    const sandbox = await iframe.getAttribute("sandbox");
    expect(sandbox).toContain("allow-scripts");
    expect(sandbox).toContain("allow-same-origin");
    expect(sandbox).toContain("allow-forms");
    expect(sandbox).toContain("allow-popups");
  });

  test("iframe has data-perspective marker", async ({ page }) => {
    await page.goto("/manual-api.html");

    // Create widget
    await page.click("#create-widget-btn");

    const iframe = page.locator("#widget-container iframe");
    await expect(iframe).toHaveAttribute("data-perspective", "true");
  });
});

test.describe("Theme Detection", () => {
  test("passes light theme to iframe by default", async ({ page }) => {
    await page.goto("/manual-api.html");

    // Create widget
    await page.click("#create-widget-btn");

    const iframe = page.locator("#widget-container iframe[data-perspective]");
    const src = await iframe.getAttribute("src");

    // Should have theme param (light or dark based on system)
    expect(src).toMatch(/theme=(light|dark)/);
  });

  test("respects system dark mode preference", async ({ page }) => {
    // Emulate dark mode
    await page.emulateMedia({ colorScheme: "dark" });

    await page.goto("/manual-api.html");

    // Create widget
    await page.click("#create-widget-btn");

    const iframe = page.locator("#widget-container iframe[data-perspective]");
    const src = await iframe.getAttribute("src");

    expect(src).toContain("theme=dark");
  });

  test("respects system light mode preference", async ({ page }) => {
    // Emulate light mode
    await page.emulateMedia({ colorScheme: "light" });

    await page.goto("/manual-api.html");

    // Create widget
    await page.click("#create-widget-btn");

    const iframe = page.locator("#widget-container iframe[data-perspective]");
    const src = await iframe.getAttribute("src");

    expect(src).toContain("theme=light");
  });
});

test.describe("Auto-Trigger Popup", () => {
  test("timeout trigger opens popup after specified delay", async ({
    page,
  }) => {
    await page.goto("/auto-trigger.html");

    // Popup should NOT be open immediately
    await expect(page.locator(".perspective-overlay")).not.toBeVisible();

    // Wait for the 500ms timeout trigger to fire (with buffer)
    await page.waitForTimeout(700);

    // Popup should now be open
    const overlay = page.locator(".perspective-overlay");
    await expect(overlay).toBeVisible();

    const iframe = page.locator(".perspective-modal iframe[data-perspective]");
    await expect(iframe).toBeVisible();

    const src = await iframe.getAttribute("src");
    expect(src).toContain("pbbvdh26");
    expect(src).toContain("embed_type=popup");
  });

  test("show-once session: popup does not reopen after destroyAll + autoInit", async ({
    page,
  }) => {
    await page.goto("/auto-trigger.html");

    // Wait for the 500ms timeout trigger to fire
    await page.waitForTimeout(700);
    await expect(page.locator(".perspective-overlay")).toBeVisible();

    // Close popup
    await page.keyboard.press("Escape");
    await expect(page.locator(".perspective-overlay")).not.toBeVisible();

    // sessionStorage should have the show-once marker
    const key = await page.evaluate(
      () => sessionStorage.getItem("perspective-trigger-shown:pbbvdh26") ?? null
    );
    expect(key).toBe("1");

    // destroyAll + autoInit should NOT reopen (shouldShow returns false)
    await page.click("#destroy-all-btn");
    await page.click("#reinit-btn");

    await page.waitForTimeout(700);

    // Popup should NOT reappear
    await expect(page.locator(".perspective-overlay")).not.toBeVisible();
  });

  test("destroyAll resets initialized flag so autoInit can re-trigger", async ({
    page,
  }) => {
    await page.goto("/auto-trigger.html");

    // Clear storage so show-once doesn't block
    await page.click("#clear-session-btn");

    // destroyAll immediately (cancels the 500ms timer before it fires)
    await page.click("#destroy-all-btn");

    // Verify the initialized flag was cleared
    const hasFlag = await page.evaluate(
      () =>
        document
          .querySelector("[data-perspective-popup]")
          ?.hasAttribute("data-perspective-initialized") ?? true
    );
    expect(hasFlag).toBe(false);

    // Re-init sets up a fresh 500ms timer
    await page.click("#reinit-btn");

    await page.waitForTimeout(700);

    // Popup should open from the fresh timer
    await expect(page.locator(".perspective-overlay")).toBeVisible();
  });

  test("show-once visitor: uses localStorage so popup does not reopen", async ({
    page,
  }) => {
    await page.goto("/auto-trigger-visitor.html");

    // Wait for the 500ms visitor-trigger to fire
    await page.waitForTimeout(700);

    // Popup should have opened
    await expect(page.locator(".perspective-overlay")).toBeVisible();

    // localStorage should now have the visitor marker
    const stored = await page.evaluate(
      () =>
        localStorage.getItem("perspective-trigger-shown:pbbvdh26-visitor") ??
        null
    );
    expect(stored).toBe("1");

    // destroyAll + autoInit should NOT re-trigger (localStorage marker persists)
    await page.evaluate(() => {
      window.Perspective!.destroyAll();
      window.Perspective!.autoInit();
    });

    await page.waitForTimeout(700);

    // Popup should NOT have reopened — overlay is gone (was cleaned by destroyAll)
    await expect(page.locator(".perspective-overlay")).not.toBeVisible();

    // localStorage marker still set
    const stillStored = await page.evaluate(
      () =>
        localStorage.getItem("perspective-trigger-shown:pbbvdh26-visitor") ??
        null
    );
    expect(stillStored).toBe("1");
  });

  test("exit-intent trigger opens popup on mouse leave", async ({ page }) => {
    await page.goto("/auto-trigger.html");

    // Popup should NOT be open initially
    await expect(page.locator(".perspective-overlay")).not.toBeVisible();

    // Simulate mouse leaving the viewport at the top (clientY = 0)
    await page.mouse.move(400, 10);
    await page.evaluate(() => {
      document.dispatchEvent(
        new MouseEvent("mouseleave", {
          bubbles: true,
          cancelable: true,
          clientX: 400,
          clientY: 0,
        })
      );
    });

    // Give event handler time to fire
    await page.waitForTimeout(100);

    // Popup should now be open
    await expect(page.locator(".perspective-overlay")).toBeVisible();
  });
});

test.describe("Preload & Reuse Lifecycle", () => {
  test("autoInit preloads hidden iframe for button popup trigger", async ({
    page,
  }) => {
    await page.goto("/preload-reuse.html");

    // Wait for requestIdleCallback to fire and iframe to load
    await page.waitForTimeout(500);

    // A hidden preloaded iframe should exist in the DOM
    const preloadIframe = page.locator(
      "iframe[data-perspective-preload='test-popup']"
    );
    await expect(preloadIframe).toBeAttached();

    // It should be visually hidden (opacity: 0, not display: none)
    const opacity = await preloadIframe.evaluate(
      (el) => (el as HTMLElement).style.opacity
    );
    expect(opacity).toBe("0");
  });

  test("preloaded popup opens without loading indicator and fires onReady", async ({
    page,
  }) => {
    await page.goto("/preload-reuse.html");

    // Wait for preload to complete (requestIdleCallback + iframe load + ready)
    await page.waitForTimeout(500);

    // Verify preloaded iframe exists
    await expect(
      page.locator("iframe[data-perspective-preload='test-popup']")
    ).toBeAttached();

    // Open popup via programmatic init (with onReady callback)
    await page.click("#init-popup-btn");

    // Popup should be visible
    await expect(page.locator(".perspective-overlay")).toBeVisible();

    // Preload attribute should be removed (iframe was claimed)
    await expect(
      page.locator("iframe[data-perspective-preload]")
    ).not.toBeAttached();

    // No loading indicator (preloaded iframe was already ready)
    await expect(page.locator(".perspective-loading")).not.toBeAttached();

    // onReady should have fired (replayed from preload ready state)
    await page.waitForTimeout(100);
    const events = await page.evaluate(() => (window as any).__testEvents);
    expect(events.some((e: any) => e.name === "popup:ready")).toBe(true);
  });

  test("close hides popup, reopen reuses same iframe (no loading)", async ({
    page,
  }) => {
    await page.goto("/preload-reuse.html");
    await page.waitForTimeout(500);

    // Open popup
    await page.click("#init-popup-btn");
    await expect(page.locator(".perspective-overlay")).toBeVisible();

    // Mark the iframe so we can verify it's the same element after reopen
    await page.evaluate(() => {
      const iframe = document.querySelector(
        ".perspective-modal iframe[data-perspective]"
      ) as HTMLIFrameElement;
      iframe.setAttribute("data-test-marker", "original");
    });

    // Close popup via ESC (hides, doesn't destroy)
    await page.keyboard.press("Escape");
    await expect(page.locator(".perspective-overlay")).not.toBeVisible();

    // Overlay should still be in the DOM (hidden, not removed)
    const overlayCount = await page.locator(".perspective-overlay").count();
    expect(overlayCount).toBe(1);

    // Reopen by clicking the programmatic button again
    await page.click("#init-popup-btn");
    await expect(page.locator(".perspective-overlay")).toBeVisible();

    // Still exactly one overlay (reused, not duplicated)
    const overlayCountAfter = await page
      .locator(".perspective-overlay")
      .count();
    expect(overlayCountAfter).toBe(1);

    // Same iframe element (marker attribute still present)
    const marker = await page
      .locator(".perspective-modal iframe[data-perspective]")
      .getAttribute("data-test-marker");
    expect(marker).toBe("original");

    // No loading indicator (iframe was alive the whole time)
    await expect(page.locator(".perspective-loading")).not.toBeAttached();
  });

  test("autoInit preloads hidden iframe for button slider trigger when no popup exists", async ({
    page,
  }) => {
    await page.goto("/preload-slider.html");

    await page.waitForTimeout(500);

    const preloadIframe = page.locator(
      "iframe[data-perspective-preload='test-slider-only']"
    );
    await expect(preloadIframe).toBeAttached();

    const opacity = await preloadIframe.evaluate(
      (el) => (el as HTMLElement).style.opacity
    );
    expect(opacity).toBe("0");
  });

  test("preloaded slider opens without loading indicator and fires onReady", async ({
    page,
  }) => {
    await page.goto("/preload-slider.html");

    await page.waitForTimeout(500);

    await expect(
      page.locator("iframe[data-perspective-preload='test-slider-only']")
    ).toBeAttached();

    await page.click("#init-slider-btn");

    await expect(page.locator(".perspective-slider")).toBeVisible();
    await expect(
      page.locator("iframe[data-perspective-preload]")
    ).not.toBeAttached();
    await expect(page.locator(".perspective-loading")).not.toBeAttached();

    await page.waitForTimeout(100);
    const events = await page.evaluate(() => (window as any).__testEvents);
    expect(events.some((e: any) => e.name === "slider:ready")).toBe(true);
  });

  test("close hides slider, reopen reuses same iframe", async ({ page }) => {
    await page.goto("/preload-reuse.html");

    // Open slider
    await page.click("#init-slider-btn");
    await expect(page.locator(".perspective-slider")).toBeVisible();

    // Mark iframe
    await page.evaluate(() => {
      const iframe = document.querySelector(
        ".perspective-slider iframe[data-perspective]"
      ) as HTMLIFrameElement;
      iframe.setAttribute("data-test-marker", "original");
    });

    // Close via ESC
    await page.keyboard.press("Escape");
    await expect(page.locator(".perspective-slider")).not.toBeVisible();

    // Slider still in DOM
    expect(await page.locator(".perspective-slider").count()).toBe(1);

    // Reopen
    await page.click("#init-slider-btn");
    await expect(page.locator(".perspective-slider")).toBeVisible();

    // Same iframe
    const marker = await page
      .locator(".perspective-slider iframe[data-perspective]")
      .getAttribute("data-test-marker");
    expect(marker).toBe("original");

    // No loading indicator
    await expect(page.locator(".perspective-loading")).not.toBeAttached();
  });

  test("destroyAll fully removes hidden popup and slider", async ({ page }) => {
    await page.goto("/preload-reuse.html");

    // Open popup, then hide it
    await page.click("#init-popup-btn");
    await expect(page.locator(".perspective-overlay")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".perspective-overlay")).not.toBeVisible();

    // Open slider, then hide it
    await page.click("#init-slider-btn");
    await expect(page.locator(".perspective-slider")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".perspective-slider")).not.toBeVisible();

    // Both hidden but still in DOM
    expect(await page.locator(".perspective-overlay").count()).toBe(1);
    expect(await page.locator(".perspective-slider").count()).toBe(1);

    // destroyAll should fully remove them from the DOM
    await page.click("#destroy-all-btn");

    await expect(page.locator(".perspective-overlay")).not.toBeAttached();
    await expect(page.locator(".perspective-slider")).not.toBeAttached();
  });

  test("onClose fires on hide, not on reopen", async ({ page }) => {
    await page.goto("/preload-reuse.html");
    await page.waitForTimeout(500);

    // Open popup
    await page.click("#init-popup-btn");
    await expect(page.locator(".perspective-overlay")).toBeVisible();

    // Clear events
    await page.evaluate(() => {
      (window as any).__testEvents = [];
    });

    // Close (hide) — should fire onClose
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);

    let events = await page.evaluate(() => (window as any).__testEvents);
    const closeCount = events.filter(
      (e: any) => e.name === "popup:close"
    ).length;
    expect(closeCount).toBe(1);

    // Clear events again
    await page.evaluate(() => {
      (window as any).__testEvents = [];
    });

    // Reopen — should NOT fire onClose
    await page.click("#init-popup-btn");
    await expect(page.locator(".perspective-overlay")).toBeVisible();
    await page.waitForTimeout(100);

    events = await page.evaluate(() => (window as any).__testEvents);
    expect(events.some((e: any) => e.name === "popup:close")).toBe(false);
  });
});

test.describe("Auto-Trigger Preload", () => {
  test("auto-trigger popup is preloaded immediately before trigger fires", async ({
    page,
  }) => {
    await page.goto("/auto-trigger.html");

    // Preload should happen immediately for auto-triggers (no requestIdleCallback)
    // Check within 200ms — well before the 500ms timeout trigger fires
    await page.waitForTimeout(200);

    // Preloaded iframe should exist
    const preloadIframe = page.locator("iframe[data-perspective-preload]");
    await expect(preloadIframe).toBeAttached();

    // Popup should NOT be open yet (trigger hasn't fired)
    await expect(page.locator(".perspective-overlay")).not.toBeVisible();
  });

  test("auto-trigger popup opens without loading indicator after preload", async ({
    page,
  }) => {
    await page.goto("/auto-trigger.html");

    // Wait for the 500ms timeout trigger to fire (with buffer)
    await page.waitForTimeout(800);

    // Popup should be open
    await expect(page.locator(".perspective-overlay")).toBeVisible();

    // Preloaded iframe should have been claimed
    await expect(
      page.locator("iframe[data-perspective-preload]")
    ).not.toBeAttached();

    // No loading indicator (was preloaded and ready)
    await expect(page.locator(".perspective-loading")).not.toBeAttached();
  });
});

test.describe("Float Bubble", () => {
  test("clicking bubble opens float window", async ({ page }) => {
    await page.goto("/manual-api.html");

    // Create float bubble
    await page.click("#create-float-btn");

    // Bubble should be visible
    const bubble = page.locator("body > .perspective-float-bubble");
    await expect(bubble).toBeVisible();
    await expect(
      page.locator("iframe[data-perspective-preload='pbbvdh26']")
    ).toBeAttached();

    // Initially no float window
    await expect(page.locator(".perspective-float-window")).not.toBeVisible();

    // Click bubble to open
    await bubble.click();

    // Float window should appear
    await expect(page.locator(".perspective-float-window")).toBeVisible();
    await expect(
      page.locator("iframe[data-perspective-preload]")
    ).not.toBeAttached();
    await expect(page.locator(".perspective-loading")).not.toBeAttached();

    // Click bubble again to close
    await bubble.click();

    // Float window should be closed
    await expect(page.locator(".perspective-float-window")).not.toBeVisible();
  });
});
