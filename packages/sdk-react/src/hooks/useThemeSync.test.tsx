import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vite-plus/test";
import { renderHook, act } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { useThemeSync } from "./useThemeSync";

function SystemThemeProbe() {
  return <span>{useThemeSync("system")}</span>;
}

describe("useThemeSync", () => {
  let mediaQueryListeners: Array<(e: MediaQueryListEvent) => void> = [];
  let mockMatches = false;

  beforeEach(() => {
    mediaQueryListeners = [];
    mockMatches = false;

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)" ? mockMatches : false,
        media: query,
        addEventListener: vi.fn((_, handler) => {
          mediaQueryListeners.push(handler);
        }),
        removeEventListener: vi.fn((_, handler) => {
          mediaQueryListeners = mediaQueryListeners.filter(
            (h) => h !== handler
          );
        }),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns light for explicit light theme", () => {
    const { result } = renderHook(() => useThemeSync("light"));
    expect(result.current).toBe("light");
  });

  it("returns dark for explicit dark theme", () => {
    const { result } = renderHook(() => useThemeSync("dark"));
    expect(result.current).toBe("dark");
  });

  it("returns light initially for SSR safety when theme is system", () => {
    const { result } = renderHook(() => useThemeSync("system"));
    expect(result.current).toBe("light"); // mockMatches is false
  });

  it("renders light on the server even when the system prefers dark", () => {
    mockMatches = true;
    expect(renderToStaticMarkup(<SystemThemeProbe />)).toBe(
      "<span>light</span>"
    );
  });

  it("returns dark when system prefers dark and theme is system", () => {
    mockMatches = true;
    const { result } = renderHook(() => useThemeSync("system"));
    // After useEffect runs, should be dark
    expect(result.current).toBe("dark");
  });

  it("defaults to system when no theme provided", () => {
    mockMatches = true;
    const { result } = renderHook(() => useThemeSync());
    expect(result.current).toBe("dark");
  });

  it("updates when theme prop changes", () => {
    type ThemeValue = "light" | "dark" | "system";
    const { result, rerender } = renderHook(
      ({ theme }: { theme: ThemeValue }) => useThemeSync(theme),
      { initialProps: { theme: "light" as ThemeValue } }
    );

    expect(result.current).toBe("light");

    rerender({ theme: "dark" as ThemeValue });
    expect(result.current).toBe("dark");

    rerender({ theme: "light" as ThemeValue });
    expect(result.current).toBe("light");
  });

  it("responds to system theme changes when theme is system", () => {
    mockMatches = false;
    const { result } = renderHook(() => useThemeSync("system"));

    expect(result.current).toBe("light");

    // Simulate system theme change (a real MediaQueryList updates `matches`
    // before dispatching "change")
    act(() => {
      mockMatches = true;
      mediaQueryListeners.forEach((handler) => {
        handler({ matches: true } as MediaQueryListEvent);
      });
    });

    expect(result.current).toBe("dark");

    // Change back
    act(() => {
      mockMatches = false;
      mediaQueryListeners.forEach((handler) => {
        handler({ matches: false } as MediaQueryListEvent);
      });
    });

    expect(result.current).toBe("light");
  });

  it("cleans up listener on unmount", () => {
    const { unmount } = renderHook(() => useThemeSync("system"));

    expect(mediaQueryListeners.length).toBe(1);

    unmount();

    expect(mediaQueryListeners.length).toBe(0);
  });

  it("cleans up listener when theme changes from system to explicit", () => {
    const { rerender } = renderHook(({ theme }) => useThemeSync(theme), {
      initialProps: { theme: "system" as "light" | "dark" | "system" },
    });

    expect(mediaQueryListeners.length).toBe(1);

    rerender({ theme: "dark" });

    expect(mediaQueryListeners.length).toBe(0);
  });
});
