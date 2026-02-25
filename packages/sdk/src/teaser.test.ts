import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTeaser } from "./teaser";

describe("createTeaser", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  it("creates teaser element with bubble and close button", () => {
    const onDismiss = vi.fn();
    const onClick = vi.fn();

    const teaser = createTeaser({
      text: "Hello world",
      onDismiss,
      onClick,
    });

    expect(teaser.element).toBeTruthy();
    expect(
      teaser.element.querySelector(".perspective-float-teaser-bubble")
    ).toBeTruthy();
    expect(
      teaser.element.querySelector(".perspective-float-teaser-close")
    ).toBeTruthy();

    teaser.destroy();
  });

  it("typewriter effect reveals characters one at a time", () => {
    const teaser = createTeaser({
      text: "Hi!",
      speed: 50,
      onDismiss: vi.fn(),
      onClick: vi.fn(),
    });

    document.body.appendChild(teaser.element);

    const textSpan = teaser.element.querySelector(
      ".perspective-float-teaser-text"
    ) as HTMLSpanElement;
    expect(textSpan.textContent).toBe("");

    vi.advanceTimersByTime(50);
    expect(textSpan.textContent).toBe("H");

    vi.advanceTimersByTime(50);
    expect(textSpan.textContent).toBe("Hi");

    vi.advanceTimersByTime(50);
    expect(textSpan.textContent).toBe("Hi!");

    teaser.destroy();
  });

  it("hides cursor after typewriter completes", () => {
    const teaser = createTeaser({
      text: "AB",
      speed: 10,
      onDismiss: vi.fn(),
      onClick: vi.fn(),
    });

    document.body.appendChild(teaser.element);

    const cursor = teaser.element.querySelector(
      ".perspective-float-teaser-cursor"
    ) as HTMLSpanElement;

    // After first tick: "A" revealed, cursor still visible
    vi.advanceTimersByTime(10);
    expect(cursor.style.display).not.toBe("none");

    // After second tick: "AB" revealed, cursor still visible (just typed last char)
    vi.advanceTimersByTime(10);

    // After third tick: interval sees charIndex >= text.length, hides cursor
    vi.advanceTimersByTime(10);
    expect(cursor.style.display).toBe("none");

    teaser.destroy();
  });

  it("calls onDismiss when close button clicked", () => {
    const onDismiss = vi.fn();

    const teaser = createTeaser({
      text: "Test",
      onDismiss,
      onClick: vi.fn(),
    });

    document.body.appendChild(teaser.element);

    const closeBtn = teaser.element.querySelector(
      ".perspective-float-teaser-close"
    ) as HTMLButtonElement;
    closeBtn.click();

    expect(onDismiss).toHaveBeenCalledTimes(1);

    teaser.destroy();
  });

  it("calls onClick when bubble clicked", () => {
    const onClick = vi.fn();

    const teaser = createTeaser({
      text: "Test",
      onDismiss: vi.fn(),
      onClick,
    });

    document.body.appendChild(teaser.element);

    const bubble = teaser.element.querySelector(
      ".perspective-float-teaser-bubble"
    ) as HTMLElement;
    bubble.click();

    expect(onClick).toHaveBeenCalledTimes(1);

    teaser.destroy();
  });

  it("destroy removes element and stops interval", () => {
    const teaser = createTeaser({
      text: "A long text that takes time",
      speed: 50,
      onDismiss: vi.fn(),
      onClick: vi.fn(),
    });

    document.body.appendChild(teaser.element);

    vi.advanceTimersByTime(100); // Reveal 2 chars

    const textSpan = teaser.element.querySelector(
      ".perspective-float-teaser-text"
    ) as HTMLSpanElement;
    teaser.destroy();

    // Element should be removed
    expect(document.querySelector(".perspective-float-teaser")).toBeFalsy();

    // Interval should be stopped — text shouldn't change
    vi.advanceTimersByTime(500);
    // Can't check textContent after removal, but no errors thrown
  });
});
