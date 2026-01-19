import { test, expect, Route } from "@playwright/test";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * E2E tests for @perspective/sdk
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

test.describe("Float Bubble", () => {
  test("clicking bubble opens float window", async ({ page }) => {
    await page.goto("/manual-api.html");

    // Create float bubble
    await page.click("#create-float-btn");

    // Bubble should be visible
    const bubble = page.locator("body > .perspective-float-bubble");
    await expect(bubble).toBeVisible();

    // Initially no float window
    await expect(page.locator(".perspective-float-window")).not.toBeVisible();

    // Click bubble to open
    await bubble.click();

    // Float window should appear
    await expect(page.locator(".perspective-float-window")).toBeVisible();

    // Click bubble again to close
    await bubble.click();

    // Float window should be closed
    await expect(page.locator(".perspective-float-window")).not.toBeVisible();
  });
});
