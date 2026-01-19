import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  cn,
  getThemeClass,
  resolveIsDark,
  resolveTheme,
  normalizeHex,
  hexToRgba,
} from "./utils";
import * as config from "./config";

describe("cn", () => {
  it("joins class names with spaces", () => {
    expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
  });

  it("filters out falsy values", () => {
    expect(cn("foo", false, "bar", null, undefined, "baz")).toBe("foo bar baz");
  });

  it("handles empty strings", () => {
    expect(cn("foo", "", "bar")).toBe("foo bar");
  });

  it("flattens space-separated classes", () => {
    expect(cn("foo bar", "baz qux")).toBe("foo bar baz qux");
  });

  it("returns empty string for no valid classes", () => {
    expect(cn(false, null, undefined)).toBe("");
  });
});

describe("getThemeClass", () => {
  it("returns theme class for light", () => {
    expect(getThemeClass("light")).toBe("perspective-light-theme");
  });

  it("returns theme class for dark", () => {
    expect(getThemeClass("dark")).toBe("perspective-dark-theme");
  });

  it("returns undefined for system theme", () => {
    expect(getThemeClass("system")).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(getThemeClass(undefined)).toBeUndefined();
  });
});

describe("resolveIsDark", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true for explicit dark theme", () => {
    expect(resolveIsDark("dark")).toBe(true);
  });

  it("returns false for explicit light theme", () => {
    expect(resolveIsDark("light")).toBe(false);
  });

  it("returns false when no DOM available", () => {
    vi.spyOn(config, "hasDom").mockReturnValue(false);
    expect(resolveIsDark("system")).toBe(false);
    expect(resolveIsDark(undefined)).toBe(false);
  });

  it("uses system preference when theme is system and DOM available", () => {
    vi.spyOn(config, "hasDom").mockReturnValue(true);

    // Mock dark mode preference
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    expect(resolveIsDark("system")).toBe(true);
    expect(resolveIsDark(undefined)).toBe(true);
  });
});

describe("resolveTheme", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 'dark' for dark theme", () => {
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("returns 'light' for light theme", () => {
    expect(resolveTheme("light")).toBe("light");
  });

  it("returns based on system when theme is system", () => {
    vi.spyOn(config, "hasDom").mockReturnValue(false);
    expect(resolveTheme("system")).toBe("light");
  });
});

describe("normalizeHex", () => {
  it("passes through valid 6-char hex with #", () => {
    expect(normalizeHex("#ff0000")).toBe("#ff0000");
    expect(normalizeHex("#AABBCC")).toBe("#AABBCC");
  });

  it("adds # prefix if missing", () => {
    expect(normalizeHex("ff0000")).toBe("#ff0000");
    expect(normalizeHex("abc")).toBe("#abc");
  });

  it("handles 3-char hex", () => {
    expect(normalizeHex("#abc")).toBe("#abc");
    expect(normalizeHex("ABC")).toBe("#ABC");
  });

  it("handles 8-char hex with alpha", () => {
    expect(normalizeHex("#ff000080")).toBe("#ff000080");
  });

  it("returns undefined for empty string", () => {
    expect(normalizeHex("")).toBeUndefined();
    expect(normalizeHex("   ")).toBeUndefined();
  });

  it("extracts valid hex from invalid strings", () => {
    // #gg0000 -> extracts "0000" -> returns 3-char "#000"
    expect(normalizeHex("#gg0000")).toBe("#000");
    // #ff00gg -> extracts "ff00" -> only 4 chars, returns 3-char "#ff0"
    expect(normalizeHex("#ff00gg")).toBe("#ff0");
  });

  it("returns undefined for completely invalid input", () => {
    expect(normalizeHex("notacolor")).toBeUndefined();
    expect(normalizeHex("#gg")).toBeUndefined();
  });
});

describe("hexToRgba", () => {
  it("converts hex to rgba", () => {
    expect(hexToRgba("#ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
    expect(hexToRgba("#00ff00", 1)).toBe("rgba(0, 255, 0, 1)");
    expect(hexToRgba("#0000ff", 0)).toBe("rgba(0, 0, 255, 0)");
  });

  it("handles hex without #", () => {
    expect(hexToRgba("ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
  });

  it("returns default color for invalid hex", () => {
    expect(hexToRgba("invalid", 0.5)).toBe("rgba(118, 41, 200, 0.5)");
    expect(hexToRgba("#abc", 0.5)).toBe("rgba(118, 41, 200, 0.5)"); // 3-char hex not supported
  });
});
