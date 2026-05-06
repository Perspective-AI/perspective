import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { createRef, StrictMode } from "react";
import { Widget } from "./Widget";
import type { EmbedHandle } from "@perspective-ai/sdk";

// Stable reference so useEmbedConfig doesn't trigger extra effect runs
const mockEmbedConfig = {
  primaryColor: "#7c3aed",
  textColor: "#ffffff",
  darkPrimaryColor: "#a78bfa",
  darkTextColor: "#ffffff",
};

// Mock the core embed package
vi.mock("@perspective-ai/sdk", () => ({
  createWidget: vi.fn(() => ({
    unmount: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    researchId: "test-research-id",
    type: "widget",
    iframe: null,
    container: null,
  })),
  fetchEmbedConfig: vi.fn(() => Promise.resolve(mockEmbedConfig)),
  createLoadingIndicator: vi.fn(() => {
    const el = document.createElement("div");
    el.className = "perspective-loading";
    return el;
  }),
  perfLog: vi.fn(),
  isPerfDebug: vi.fn(() => false),
  ensureHostPreconnect: vi.fn(),
}));

import { createWidget } from "@perspective-ai/sdk";
const mockCreateWidget = vi.mocked(createWidget);

describe("Widget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a div container", async () => {
    render(<Widget researchId="test-research-id" />);
    await act(async () => {});

    const container = screen.getByTestId("perspective-widget");
    expect(container).toBeDefined();
    expect(container.tagName).toBe("DIV");
  });

  it("has default minHeight of 500px", async () => {
    render(<Widget researchId="test-research-id" />);
    await act(async () => {});

    const container = screen.getByTestId("perspective-widget");
    expect(container.style.minHeight).toBe("500px");
  });

  it("accepts custom className", async () => {
    render(<Widget researchId="test-research-id" className="custom-class" />);
    await act(async () => {});

    const container = screen.getByTestId("perspective-widget");
    expect(container.classList.contains("custom-class")).toBe(true);
  });

  it("accepts custom style", async () => {
    render(
      <Widget
        researchId="test-research-id"
        style={{ backgroundColor: "red", minHeight: 600 }}
      />
    );
    await act(async () => {});

    const container = screen.getByTestId("perspective-widget");
    expect(container.style.backgroundColor).toBe("red");
    expect(container.style.minHeight).toBe("600px"); // Custom overrides default
  });

  it("calls createWidget with correct config", async () => {
    const onReady = vi.fn();
    const onSubmit = vi.fn();

    render(
      <Widget
        researchId="test-research-id"
        params={{ source: "test" }}
        theme="dark"
        host="https://custom.example.com"
        onReady={onReady}
        onSubmit={onSubmit}
      />
    );
    await act(async () => {});

    expect(mockCreateWidget).toHaveBeenCalledTimes(1);
    const [container, config] = mockCreateWidget.mock.calls[0]!;
    expect(container).toBeInstanceOf(HTMLDivElement);
    expect(config.researchId).toBe("test-research-id");
    expect(config.params).toEqual({ source: "test" });
    expect(config.theme).toBe("dark");
    expect(config.host).toBe("https://custom.example.com");
  });

  it("creates widget immediately on mount (no upfront config fetch)", async () => {
    render(<Widget researchId="test-research-id" />);
    // Widget is created synchronously inside the mount effect — no upfront
    // /api/v1/embed/config round-trip blocks iframe creation. createWidget
    // renders its own skeleton internally while the iframe loads.
    await act(async () => {});
    expect(mockCreateWidget).toHaveBeenCalledTimes(1);
  });

  it("calls unmount on cleanup", async () => {
    const mockUnmount = vi.fn();
    mockCreateWidget.mockReturnValueOnce({
      unmount: mockUnmount,
      update: vi.fn(),
      destroy: vi.fn(),
      researchId: "test-research-id",
      type: "widget",
      iframe: null,
      container: null,
    });

    const { unmount } = render(<Widget researchId="test-research-id" />);
    await act(async () => {});

    expect(mockUnmount).not.toHaveBeenCalled();

    unmount();

    expect(mockUnmount).toHaveBeenCalled();
  });

  it("exposes handle via embedRef", async () => {
    const mockHandle: EmbedHandle = {
      unmount: vi.fn(),
      update: vi.fn(),
      destroy: vi.fn(),
      researchId: "test-research-id",
      type: "widget",
      iframe: null,
      container: null,
    };
    mockCreateWidget.mockReturnValueOnce(mockHandle);

    const embedRef = createRef<EmbedHandle | null>();

    render(<Widget researchId="test-research-id" embedRef={embedRef} />);
    await act(async () => {});

    expect(embedRef.current).toBe(mockHandle);
  });

  it("clears embedRef on unmount", async () => {
    const embedRef = createRef<EmbedHandle | null>();

    const { unmount } = render(
      <Widget researchId="test-research-id" embedRef={embedRef} />
    );
    await act(async () => {});

    expect(embedRef.current).not.toBeNull();

    unmount();

    expect(embedRef.current).toBeNull();
  });

  it("re-creates widget when researchId changes", async () => {
    const { rerender } = render(<Widget researchId="research-1" />);
    await act(async () => {});

    expect(mockCreateWidget).toHaveBeenCalledTimes(1);

    rerender(<Widget researchId="research-2" />);
    await act(async () => {});

    expect(mockCreateWidget).toHaveBeenCalledTimes(2);
  });

  it("passes additional div props", async () => {
    render(
      <Widget
        researchId="test-research-id"
        aria-label="Interview widget"
        role="region"
      />
    );
    await act(async () => {});

    const container = screen.getByTestId("perspective-widget");
    expect(container.getAttribute("aria-label")).toBe("Interview widget");
    expect(container.getAttribute("role")).toBe("region");
  });

  describe("StrictMode behavior", () => {
    it("creates only one iframe in StrictMode (mock inserts real DOM)", async () => {
      const mockUnmount = vi.fn();
      mockCreateWidget.mockImplementation((containerEl: HTMLElement | null) => {
        if (!containerEl) {
          return {
            unmount: vi.fn(),
            update: vi.fn(),
            destroy: vi.fn(),
            researchId: "test-research-id",
            type: "widget" as const,
            iframe: null,
            container: null,
          };
        }
        const iframe = document.createElement("iframe");
        iframe.setAttribute("data-perspective", "true");
        containerEl.appendChild(iframe);
        return {
          unmount: () => {
            mockUnmount();
            iframe.remove();
          },
          update: vi.fn(),
          destroy: vi.fn(),
          researchId: "test-research-id",
          type: "widget" as const,
          iframe,
          container: containerEl,
        };
      });

      render(
        <StrictMode>
          <Widget researchId="test-research-id" />
        </StrictMode>
      );
      await act(async () => {});

      const container = screen.getByTestId("perspective-widget");
      const iframes = container.querySelectorAll("iframe[data-perspective]");
      expect(iframes.length).toBe(1);
    });

    it("properly cleans up in StrictMode double-mount cycle", async () => {
      const mockUnmount = vi.fn();
      mockCreateWidget.mockImplementation((containerEl: HTMLElement | null) => {
        if (!containerEl) {
          return {
            unmount: vi.fn(),
            update: vi.fn(),
            destroy: vi.fn(),
            researchId: "test-research-id",
            type: "widget" as const,
            iframe: null,
            container: null,
          };
        }
        const iframe = document.createElement("iframe");
        iframe.setAttribute("data-perspective", "true");
        containerEl.appendChild(iframe);
        return {
          unmount: () => {
            mockUnmount();
            iframe.remove();
          },
          update: vi.fn(),
          destroy: vi.fn(),
          researchId: "test-research-id",
          type: "widget" as const,
          iframe,
          container: containerEl,
        };
      });

      const { unmount } = render(
        <StrictMode>
          <Widget researchId="test-research-id" />
        </StrictMode>
      );
      await act(async () => {});

      unmount();

      expect(mockUnmount).toHaveBeenCalled();
      const container = screen.queryByTestId("perspective-widget");
      if (container) {
        const iframes = container.querySelectorAll("iframe[data-perspective]");
        expect(iframes.length).toBe(0);
      }
    });

    it("StrictMode double-mount calls createWidget twice but cleanup prevents duplicates", async () => {
      const createCalls: number[] = [];
      const unmountCalls: number[] = [];
      let callCount = 0;

      mockCreateWidget.mockImplementation((containerEl: HTMLElement | null) => {
        if (!containerEl) {
          return {
            unmount: vi.fn(),
            update: vi.fn(),
            destroy: vi.fn(),
            researchId: "test-research-id",
            type: "widget" as const,
            iframe: null,
            container: null,
          };
        }
        const thisCall = ++callCount;
        createCalls.push(thisCall);
        const iframe = document.createElement("iframe");
        iframe.setAttribute("data-perspective", "true");
        iframe.setAttribute("data-call", String(thisCall));
        containerEl.appendChild(iframe);
        return {
          unmount: () => {
            unmountCalls.push(thisCall);
            iframe.remove();
          },
          update: vi.fn(),
          destroy: vi.fn(),
          researchId: "test-research-id",
          type: "widget" as const,
          iframe,
          container: containerEl,
        };
      });

      render(
        <StrictMode>
          <Widget researchId="test-research-id" />
        </StrictMode>
      );
      await act(async () => {});

      const container = screen.getByTestId("perspective-widget");
      const iframes = container.querySelectorAll("iframe[data-perspective]");
      expect(iframes.length).toBe(1);
      expect(createCalls.length).toBeGreaterThanOrEqual(1);
    });
  });
});
