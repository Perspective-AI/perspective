import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseTriggerAttr,
  parseShowOnceAttr,
  setupTrigger,
  shouldShow,
  markShown,
} from "./triggers";

describe("triggers", () => {
  describe("parseTriggerAttr", () => {
    it("parses timeout with delay", () => {
      expect(parseTriggerAttr("timeout:5000")).toEqual({
        type: "timeout",
        delay: 5000,
      });
    });

    it("parses timeout with zero delay", () => {
      expect(parseTriggerAttr("timeout:0")).toEqual({
        type: "timeout",
        delay: 0,
      });
    });

    it("parses bare timeout as 5000ms default", () => {
      expect(parseTriggerAttr("timeout")).toEqual({
        type: "timeout",
        delay: 5000,
      });
    });

    it("parses exit-intent", () => {
      expect(parseTriggerAttr("exit-intent")).toEqual({
        type: "exit-intent",
      });
    });

    it("trims whitespace", () => {
      expect(parseTriggerAttr("  timeout:3000  ")).toEqual({
        type: "timeout",
        delay: 3000,
      });
    });

    it("throws on invalid timeout delay", () => {
      expect(() => parseTriggerAttr("timeout:abc")).toThrow(
        "Invalid timeout delay"
      );
    });

    it("throws on negative timeout delay", () => {
      expect(() => parseTriggerAttr("timeout:-1")).toThrow(
        "Invalid timeout delay"
      );
    });

    it("throws on unknown trigger type", () => {
      expect(() => parseTriggerAttr("scroll:50")).toThrow(
        "Unknown trigger type"
      );
    });
  });

  describe("setupTrigger", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("calls callback after timeout delay", () => {
      const callback = vi.fn();
      setupTrigger({ type: "timeout", delay: 3000 }, callback);

      expect(callback).not.toHaveBeenCalled();
      vi.advanceTimersByTime(2999);
      expect(callback).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("returns cleanup that clears timeout", () => {
      const callback = vi.fn();
      const cleanup = setupTrigger({ type: "timeout", delay: 3000 }, callback);

      cleanup();
      vi.advanceTimersByTime(5000);
      expect(callback).not.toHaveBeenCalled();
    });

    it("sets up exit-intent on mouseleave", () => {
      const callback = vi.fn();
      const addSpy = vi.spyOn(document, "addEventListener");

      setupTrigger({ type: "exit-intent" }, callback);

      expect(addSpy).toHaveBeenCalledWith("mouseleave", expect.any(Function));
      addSpy.mockRestore();
    });

    it("fires exit-intent callback when clientY <= 0", () => {
      const callback = vi.fn();
      setupTrigger({ type: "exit-intent" }, callback);

      // Simulate mouse leaving the document upward
      const event = new MouseEvent("mouseleave", { clientY: -1 });
      document.dispatchEvent(event);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("does not fire exit-intent when clientY > 0", () => {
      const callback = vi.fn();
      setupTrigger({ type: "exit-intent" }, callback);

      const event = new MouseEvent("mouseleave", { clientY: 100 });
      document.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();
    });

    it("removes exit-intent listener after firing", () => {
      const callback = vi.fn();
      setupTrigger({ type: "exit-intent" }, callback);

      const event1 = new MouseEvent("mouseleave", { clientY: -1 });
      document.dispatchEvent(event1);
      expect(callback).toHaveBeenCalledTimes(1);

      // Second event should not fire
      const event2 = new MouseEvent("mouseleave", { clientY: -1 });
      document.dispatchEvent(event2);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("returns cleanup that removes exit-intent listener", () => {
      const callback = vi.fn();
      const removeSpy = vi.spyOn(document, "removeEventListener");

      const cleanup = setupTrigger({ type: "exit-intent" }, callback);
      cleanup();

      expect(removeSpy).toHaveBeenCalledWith(
        "mouseleave",
        expect.any(Function)
      );

      // Event should not fire after cleanup
      const event = new MouseEvent("mouseleave", { clientY: -1 });
      document.dispatchEvent(event);
      expect(callback).not.toHaveBeenCalled();

      removeSpy.mockRestore();
    });
  });

  describe("parseShowOnceAttr", () => {
    it('returns "session" for null', () => {
      expect(parseShowOnceAttr(null)).toBe("session");
    });

    it('returns "session" for empty string', () => {
      expect(parseShowOnceAttr("")).toBe("session");
    });

    it('returns "session" for "session"', () => {
      expect(parseShowOnceAttr("session")).toBe("session");
    });

    it('returns "visitor" for "visitor"', () => {
      expect(parseShowOnceAttr("visitor")).toBe("visitor");
    });

    it('returns false for "false"', () => {
      expect(parseShowOnceAttr("false")).toBe(false);
    });

    it('defaults unknown values to "session"', () => {
      expect(parseShowOnceAttr("always")).toBe("session");
      expect(parseShowOnceAttr("never")).toBe("session");
    });

    it("trims whitespace", () => {
      expect(parseShowOnceAttr("  visitor  ")).toBe("visitor");
    });
  });

  describe("shouldShow / markShown", () => {
    beforeEach(() => {
      sessionStorage.clear();
      localStorage.clear();
    });

    it("returns true when no prior shown (session)", () => {
      expect(shouldShow("test-id", "session")).toBe(true);
    });

    it("returns true when no prior shown (visitor)", () => {
      expect(shouldShow("test-id", "visitor")).toBe(true);
    });

    it("returns true when showOnce is false", () => {
      expect(shouldShow("test-id", false)).toBe(true);
    });

    it("returns false after markShown (session)", () => {
      markShown("test-id", "session");
      expect(shouldShow("test-id", "session")).toBe(false);
    });

    it("returns false after markShown (visitor)", () => {
      markShown("test-id", "visitor");
      expect(shouldShow("test-id", "visitor")).toBe(false);
    });

    it("always returns true when showOnce is false, even after markShown", () => {
      markShown("test-id", false);
      expect(shouldShow("test-id", false)).toBe(true);
    });

    it("uses sessionStorage for session mode", () => {
      markShown("test-id", "session");
      expect(sessionStorage.getItem("perspective-trigger-shown:test-id")).toBe(
        "1"
      );
      expect(
        localStorage.getItem("perspective-trigger-shown:test-id")
      ).toBeNull();
    });

    it("uses localStorage for visitor mode", () => {
      markShown("test-id", "visitor");
      expect(localStorage.getItem("perspective-trigger-shown:test-id")).toBe(
        "1"
      );
      expect(
        sessionStorage.getItem("perspective-trigger-shown:test-id")
      ).toBeNull();
    });

    it("deduplicates per researchId", () => {
      markShown("id-1", "session");
      expect(shouldShow("id-1", "session")).toBe(false);
      expect(shouldShow("id-2", "session")).toBe(true);
    });

    it("shouldShow returns true when storage throws", () => {
      const spy = vi
        .spyOn(Storage.prototype, "getItem")
        .mockImplementation(() => {
          throw new Error("Storage disabled");
        });
      expect(shouldShow("test-id", "session")).toBe(true);
      expect(shouldShow("test-id", "visitor")).toBe(true);
      spy.mockRestore();
    });

    it("markShown does not throw when storage throws", () => {
      const spy = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          throw new Error("Storage disabled");
        });
      expect(() => markShown("test-id", "session")).not.toThrow();
      expect(() => markShown("test-id", "visitor")).not.toThrow();
      spy.mockRestore();
    });
  });
});
