import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  createIframe,
  setupMessageListener,
  sendMessage,
  registerIframe,
  notifyThemeChange,
} from "./iframe";
import { MESSAGE_TYPES, PARAM_KEYS, PARAM_VALUES } from "./constants";

describe("createIframe", () => {
  it("creates an iframe element", () => {
    const iframe = createIframe(
      "test-research-id",
      "widget",
      "https://getperspective.ai"
    );

    expect(iframe).toBeInstanceOf(HTMLIFrameElement);
    expect(iframe.getAttribute("data-perspective")).toBe("true");
    expect(iframe.getAttribute("allow")).toBe("microphone; camera");
    expect(iframe.getAttribute("allowfullscreen")).toBe("true");
  });

  it("sets correct iframe src with params", () => {
    const iframe = createIframe(
      "test-research-id",
      "widget",
      "https://getperspective.ai",
      { custom: "value" }
    );

    const src = new URL(iframe.src);
    expect(src.pathname).toBe("/interview/test-research-id");
    expect(src.searchParams.get(PARAM_KEYS.embed)).toBe(PARAM_VALUES.true);
    expect(src.searchParams.get(PARAM_KEYS.embedType)).toBe("widget");
    expect(src.searchParams.get("custom")).toBe("value");
  });

  it("converts float type to chat for embedType param", () => {
    const iframe = createIframe(
      "test-research-id",
      "float",
      "https://getperspective.ai"
    );

    const src = new URL(iframe.src);
    expect(src.searchParams.get(PARAM_KEYS.embedType)).toBe("chat");
  });

  it("includes theme param", () => {
    const iframe = createIframe(
      "test-research-id",
      "widget",
      "https://getperspective.ai",
      undefined,
      undefined,
      "dark"
    );

    const src = new URL(iframe.src);
    expect(src.searchParams.get(PARAM_KEYS.theme)).toBe("dark");
  });

  it("forwards parent page search params to iframe", () => {
    // Simulate parent page URL with search params
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, search: "?ref=pricing-enterprise&foo=bar" },
      writable: true,
      configurable: true,
    });

    const iframe = createIframe(
      "test-research-id",
      "widget",
      "https://getperspective.ai"
    );

    const src = new URL(iframe.src);
    expect(src.searchParams.get("ref")).toBe("pricing-enterprise");
    expect(src.searchParams.get("foo")).toBe("bar");

    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it("does not forward reserved params from parent URL", () => {
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: {
        ...originalLocation,
        search: "?embed=false&theme=dark&ref=test",
      },
      writable: true,
      configurable: true,
    });

    const iframe = createIframe(
      "test-research-id",
      "widget",
      "https://getperspective.ai"
    );

    const src = new URL(iframe.src);
    // Reserved params should be set by SDK, not from parent URL
    expect(src.searchParams.get(PARAM_KEYS.embed)).toBe("true");
    // Non-reserved params should be forwarded
    expect(src.searchParams.get("ref")).toBe("test");

    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it("custom params override parent URL params", () => {
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, search: "?ref=from-url&source=parent" },
      writable: true,
      configurable: true,
    });

    const iframe = createIframe(
      "test-research-id",
      "widget",
      "https://getperspective.ai",
      { ref: "from-custom", extra: "value" }
    );

    const src = new URL(iframe.src);
    // Custom params should override parent URL params
    expect(src.searchParams.get("ref")).toBe("from-custom");
    // Parent-only params should still be forwarded
    expect(src.searchParams.get("source")).toBe("parent");
    // Custom-only params should be present
    expect(src.searchParams.get("extra")).toBe("value");

    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it("forwards UTM params from parent URL", () => {
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: {
        ...originalLocation,
        search: "?utm_source=google&utm_campaign=summer&ref=pricing",
      },
      writable: true,
      configurable: true,
    });

    const iframe = createIframe(
      "test-research-id",
      "widget",
      "https://getperspective.ai"
    );

    const src = new URL(iframe.src);
    expect(src.searchParams.get("utm_source")).toBe("google");
    expect(src.searchParams.get("utm_campaign")).toBe("summer");
    expect(src.searchParams.get("ref")).toBe("pricing");

    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it("includes brand colors", () => {
    const iframe = createIframe(
      "test-research-id",
      "widget",
      "https://getperspective.ai",
      undefined,
      {
        light: { primary: "#ff0000", secondary: "#00ff00" },
        dark: { primary: "#0000ff" },
      }
    );

    const src = new URL(iframe.src);
    expect(src.searchParams.get("brand.primary")).toBe("#ff0000");
    expect(src.searchParams.get("brand.secondary")).toBe("#00ff00");
    expect(src.searchParams.get("brand.dark.primary")).toBe("#0000ff");
  });

  it("sets sandbox attribute", () => {
    const iframe = createIframe(
      "test-research-id",
      "widget",
      "https://getperspective.ai"
    );

    const sandbox = iframe.getAttribute("sandbox");
    expect(sandbox).toContain("allow-scripts");
    expect(sandbox).toContain("allow-same-origin");
    expect(sandbox).toContain("allow-forms");
    expect(sandbox).toContain("allow-popups");
  });
});

describe("setupMessageListener", () => {
  let iframe: HTMLIFrameElement;
  let removeListener: () => void;
  const host = "https://getperspective.ai";
  const researchId = "test-research-id";

  beforeEach(() => {
    iframe = document.createElement("iframe");
    document.body.appendChild(iframe);
  });

  afterEach(() => {
    removeListener?.();
    iframe.remove();
    vi.restoreAllMocks();
  });

  it("returns cleanup function", () => {
    removeListener = setupMessageListener(researchId, {}, iframe, host);
    expect(typeof removeListener).toBe("function");
  });

  it("ignores messages from wrong origin", () => {
    const onReady = vi.fn();
    removeListener = setupMessageListener(
      researchId,
      { onReady },
      iframe,
      host
    );

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: MESSAGE_TYPES.ready, researchId },
        origin: "https://evil.com",
        source: iframe.contentWindow,
      })
    );

    expect(onReady).not.toHaveBeenCalled();
  });

  it("ignores messages with wrong researchId", () => {
    const onReady = vi.fn();
    removeListener = setupMessageListener(
      researchId,
      { onReady },
      iframe,
      host
    );

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: MESSAGE_TYPES.ready, researchId: "wrong-id" },
        origin: host,
        source: iframe.contentWindow,
      })
    );

    expect(onReady).not.toHaveBeenCalled();
  });

  it("ignores non-perspective messages", () => {
    const onReady = vi.fn();
    removeListener = setupMessageListener(
      researchId,
      { onReady },
      iframe,
      host
    );

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "other:ready", researchId },
        origin: host,
        source: iframe.contentWindow,
      })
    );

    expect(onReady).not.toHaveBeenCalled();
  });

  it("calls onSubmit for submit messages", () => {
    const onSubmit = vi.fn();
    removeListener = setupMessageListener(
      researchId,
      { onSubmit },
      iframe,
      host
    );

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: MESSAGE_TYPES.submit, researchId },
        origin: host,
        source: iframe.contentWindow,
      })
    );

    expect(onSubmit).toHaveBeenCalledWith({ researchId });
  });

  it("calls onClose for close messages", () => {
    const onClose = vi.fn();
    removeListener = setupMessageListener(
      researchId,
      { onClose },
      iframe,
      host
    );

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: MESSAGE_TYPES.close, researchId },
        origin: host,
        source: iframe.contentWindow,
      })
    );

    expect(onClose).toHaveBeenCalled();
  });

  it("calls onError for error messages", () => {
    const onError = vi.fn();
    removeListener = setupMessageListener(
      researchId,
      { onError },
      iframe,
      host
    );

    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: MESSAGE_TYPES.error,
          researchId,
          error: "Test error",
          code: "SDK_OUTDATED",
        },
        origin: host,
        source: iframe.contentWindow,
      })
    );

    expect(onError).toHaveBeenCalled();
    const error = onError.mock.calls[0]?.[0];
    expect(error?.message).toBe("Test error");
    expect(error?.code).toBe("SDK_OUTDATED");
  });

  it("resizes iframe on resize messages", () => {
    removeListener = setupMessageListener(researchId, {}, iframe, host);

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: MESSAGE_TYPES.resize, researchId, height: 500 },
        origin: host,
        source: iframe.contentWindow,
      })
    );

    expect(iframe.style.height).toBe("500px");
  });

  it("skips resize when skipResize option is true", () => {
    iframe.style.height = "300px";
    removeListener = setupMessageListener(researchId, {}, iframe, host, {
      skipResize: true,
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: MESSAGE_TYPES.resize, researchId, height: 500 },
        origin: host,
        source: iframe.contentWindow,
      })
    );

    expect(iframe.style.height).toBe("300px");
  });

  it("blocks unsafe redirect URLs", () => {
    const onNavigate = vi.fn();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    removeListener = setupMessageListener(
      researchId,
      { onNavigate },
      iframe,
      host
    );

    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: MESSAGE_TYPES.redirect,
          researchId,
          url: "javascript:alert(1)",
        },
        origin: host,
        source: iframe.contentWindow,
      })
    );

    expect(onNavigate).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("allows https redirect URLs", () => {
    const onNavigate = vi.fn();
    removeListener = setupMessageListener(
      researchId,
      { onNavigate },
      iframe,
      host
    );

    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: MESSAGE_TYPES.redirect,
          researchId,
          url: "https://example.com/thank-you",
        },
        origin: host,
        source: iframe.contentWindow,
      })
    );

    expect(onNavigate).toHaveBeenCalledWith("https://example.com/thank-you");
  });

  it("allows localhost redirect URLs", () => {
    const onNavigate = vi.fn();
    removeListener = setupMessageListener(
      researchId,
      { onNavigate },
      iframe,
      host
    );

    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: MESSAGE_TYPES.redirect,
          researchId,
          url: "http://localhost:3000/thank-you",
        },
        origin: host,
        source: iframe.contentWindow,
      })
    );

    expect(onNavigate).toHaveBeenCalledWith("http://localhost:3000/thank-you");
  });
});

describe("sendMessage", () => {
  it("handles iframe without contentWindow gracefully", () => {
    const iframe = document.createElement("iframe");
    // Not appended to document, contentWindow might be null

    expect(() =>
      sendMessage(iframe, "https://getperspective.ai", {
        type: "test",
      })
    ).not.toThrow();
  });
});

describe("registerIframe", () => {
  it("returns cleanup function", () => {
    const iframe = document.createElement("iframe");
    const unregister = registerIframe(iframe, "https://getperspective.ai");
    expect(typeof unregister).toBe("function");
    unregister();
  });
});

describe("notifyThemeChange", () => {
  it("does not throw when called", () => {
    expect(() => notifyThemeChange()).not.toThrow();
  });
});

describe("redirect URL security (isAllowedRedirectUrl)", () => {
  let iframe: HTMLIFrameElement;
  let removeListener: () => void;
  const host = "https://getperspective.ai";
  const researchId = "test-research-id";

  beforeEach(() => {
    iframe = document.createElement("iframe");
    document.body.appendChild(iframe);
  });

  afterEach(() => {
    removeListener?.();
    iframe.remove();
    vi.restoreAllMocks();
  });

  const dispatchRedirect = (url: string) => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: MESSAGE_TYPES.redirect, researchId, url },
        origin: host,
        source: iframe.contentWindow,
      })
    );
  };

  describe("allowed URLs", () => {
    const allowedUrls = [
      ["https://example.com", "basic https"],
      ["https://example.com/path", "https with path"],
      ["https://example.com/path?query=1", "https with query"],
      ["https://example.com/path#hash", "https with hash"],
      ["https://example.com:443/path", "https with port 443"],
      ["https://example.com:8443/path", "https with custom port"],
      ["https://sub.domain.example.com", "https subdomain"],
      ["https://a.b.c.d.example.com/deep/path", "https deep subdomain"],
      ["http://localhost", "localhost without port"],
      ["http://localhost/", "localhost with trailing slash"],
      ["http://localhost:3000", "localhost with port"],
      ["http://localhost:3000/path", "localhost with port and path"],
      ["http://localhost:8080/api/callback", "localhost different port"],
      ["http://127.0.0.1", "127.0.0.1 IP"],
      ["http://127.0.0.1:3000", "127.0.0.1 with port"],
      ["http://127.0.0.1:3000/path?q=1", "127.0.0.1 with path and query"],
      ["https://localhost", "https localhost"],
      ["https://localhost:3000", "https localhost with port"],
      ["https://127.0.0.1:8443", "https 127.0.0.1 with port"],
    ];

    it.each(allowedUrls)("allows %s (%s)", (url, _description) => {
      const onNavigate = vi.fn();
      removeListener = setupMessageListener(
        researchId,
        { onNavigate },
        iframe,
        host
      );

      dispatchRedirect(url);

      expect(onNavigate).toHaveBeenCalledWith(url);
    });
  });

  describe("blocked URLs - dangerous protocols", () => {
    const blockedProtocols = [
      ["javascript:alert(1)", "javascript protocol"],
      ["javascript:void(0)", "javascript void"],
      ["javascript://comment%0aalert(1)", "javascript with comment"],
      ["data:text/html,<script>alert(1)</script>", "data protocol html"],
      [
        "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
        "data base64",
      ],
      ["vbscript:msgbox(1)", "vbscript protocol"],
      ["file:///etc/passwd", "file protocol"],
      ["file://localhost/etc/passwd", "file with localhost"],
      ["blob:https://evil.com/guid", "blob protocol"],
      ["about:blank", "about protocol"],
      ["ws://evil.com/socket", "websocket protocol"],
      ["wss://evil.com/socket", "secure websocket protocol"],
      ["ftp://evil.com/file", "ftp protocol"],
      ["tel:+1234567890", "tel protocol"],
      ["mailto:evil@example.com", "mailto protocol"],
    ];

    it.each(blockedProtocols)("blocks %s (%s)", (url, _description) => {
      const onNavigate = vi.fn();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      removeListener = setupMessageListener(
        researchId,
        { onNavigate },
        iframe,
        host
      );

      dispatchRedirect(url);

      expect(onNavigate).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Blocked unsafe redirect URL"),
        url
      );
    });
  });

  describe("blocked URLs - HTTP on non-localhost", () => {
    const blockedHttpUrls = [
      ["http://example.com", "plain http external"],
      ["http://evil.com/phishing", "http phishing"],
      ["http://192.168.1.1", "http private IP"],
      ["http://10.0.0.1", "http internal IP"],
      ["http://169.254.169.254", "http AWS metadata IP"],
      ["http://[::1]", "http IPv6 localhost"],
      ["http://0.0.0.0", "http 0.0.0.0"],
      ["http://localhos", "http typosquat localhost (missing t)"],
      ["http://localhost.evil.com", "http localhost subdomain attack"],
      ["http://127.0.0.2", "http similar IP"],
    ];

    it.each(blockedHttpUrls)("blocks %s (%s)", (url, _description) => {
      const onNavigate = vi.fn();
      vi.spyOn(console, "warn").mockImplementation(() => {});
      removeListener = setupMessageListener(
        researchId,
        { onNavigate },
        iframe,
        host
      );

      dispatchRedirect(url);

      expect(onNavigate).not.toHaveBeenCalled();
    });
  });

  describe("blocked URLs - malformed and edge cases", () => {
    const blockedUrls = [
      ["", "empty string"],
      ["//evil.com", "protocol-relative URL to external host"],
    ];

    it.each(blockedUrls)("blocks %s (%s)", (url, _description) => {
      const onNavigate = vi.fn();
      vi.spyOn(console, "warn").mockImplementation(() => {});
      removeListener = setupMessageListener(
        researchId,
        { onNavigate },
        iframe,
        host
      );

      dispatchRedirect(url);

      expect(onNavigate).not.toHaveBeenCalled();
    });
  });

  describe("allowed relative URLs", () => {
    const allowedRelativeUrls = [
      ["/path/only", "path only (relative)"],
      ["?query=only", "query only"],
      ["#hash-only", "hash only"],
    ];

    it.each(allowedRelativeUrls)(
      "allows relative URL %s (%s) - resolved against origin",
      (url, _description) => {
        const onNavigate = vi.fn();
        removeListener = setupMessageListener(
          researchId,
          { onNavigate },
          iframe,
          host
        );

        dispatchRedirect(url);

        expect(onNavigate).toHaveBeenCalledWith(url);
      }
    );
  });

  describe("blocked URLs - encoding and bypass attempts", () => {
    const blockedBypassAttempts = [
      ["java\tscript:alert(1)", "javascript with tab"],
      ["java\nscript:alert(1)", "javascript with newline"],
      ["java\rscript:alert(1)", "javascript with carriage return"],
      [" javascript:alert(1)", "javascript with leading space"],
      ["JAVASCRIPT:alert(1)", "javascript uppercase"],
      ["JaVaScRiPt:alert(1)", "javascript mixed case"],
      ["https://evil.com%00.good.com", "null byte in hostname"],
      ["https://good.com%40evil.com", "encoded @ in hostname"],
    ];

    it.each(blockedBypassAttempts)("blocks %s (%s)", (url, _description) => {
      const onNavigate = vi.fn();
      vi.spyOn(console, "warn").mockImplementation(() => {});
      removeListener = setupMessageListener(
        researchId,
        { onNavigate },
        iframe,
        host
      );

      dispatchRedirect(url);

      expect(onNavigate).not.toHaveBeenCalled();
    });
  });

  describe("allowed HTTPS URLs with suspicious-looking patterns", () => {
    it("allows userinfo credential pattern - SECURITY: navigates to evil.com not good.com", () => {
      const onNavigate = vi.fn();
      removeListener = setupMessageListener(
        researchId,
        { onNavigate },
        iframe,
        host
      );

      dispatchRedirect("https://good.com@evil.com");

      expect(onNavigate).toHaveBeenCalledWith("https://good.com@evil.com");
    });
  });

  describe("null and undefined handling", () => {
    it("handles null url gracefully", () => {
      const onNavigate = vi.fn();
      vi.spyOn(console, "warn").mockImplementation(() => {});
      removeListener = setupMessageListener(
        researchId,
        { onNavigate },
        iframe,
        host
      );

      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: MESSAGE_TYPES.redirect, researchId, url: null },
          origin: host,
          source: iframe.contentWindow,
        })
      );

      expect(onNavigate).not.toHaveBeenCalled();
    });

    it("handles undefined url gracefully", () => {
      const onNavigate = vi.fn();
      vi.spyOn(console, "warn").mockImplementation(() => {});
      removeListener = setupMessageListener(
        researchId,
        { onNavigate },
        iframe,
        host
      );

      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: MESSAGE_TYPES.redirect, researchId, url: undefined },
          origin: host,
          source: iframe.contentWindow,
        })
      );

      expect(onNavigate).not.toHaveBeenCalled();
    });

    it("handles non-string url gracefully", () => {
      const onNavigate = vi.fn();
      vi.spyOn(console, "warn").mockImplementation(() => {});
      removeListener = setupMessageListener(
        researchId,
        { onNavigate },
        iframe,
        host
      );

      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: MESSAGE_TYPES.redirect,
            researchId,
            url: { evil: true },
          },
          origin: host,
          source: iframe.contentWindow,
        })
      );

      expect(onNavigate).not.toHaveBeenCalled();
    });
  });

  describe("fallback navigation behavior", () => {
    it("navigates via window.location.href when onNavigate not provided", () => {
      const originalHref = window.location.href;
      const mockLocation = { href: originalHref };

      Object.defineProperty(window, "location", {
        value: mockLocation,
        writable: true,
        configurable: true,
      });

      removeListener = setupMessageListener(researchId, {}, iframe, host);

      dispatchRedirect("https://example.com/redirect");

      expect(mockLocation.href).toBe("https://example.com/redirect");

      Object.defineProperty(window, "location", {
        value: { href: originalHref },
        writable: true,
        configurable: true,
      });
    });
  });
});

describe("postMessage security", () => {
  let iframe: HTMLIFrameElement;
  let removeListener: () => void;
  const host = "https://getperspective.ai";
  const researchId = "test-research-id";

  beforeEach(() => {
    iframe = document.createElement("iframe");
    document.body.appendChild(iframe);
  });

  afterEach(() => {
    removeListener?.();
    iframe.remove();
    vi.restoreAllMocks();
  });

  describe("source validation", () => {
    it("ignores messages from different iframe", () => {
      const onReady = vi.fn();
      const otherIframe = document.createElement("iframe");
      document.body.appendChild(otherIframe);

      removeListener = setupMessageListener(
        researchId,
        { onReady },
        iframe,
        host
      );

      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: MESSAGE_TYPES.ready, researchId },
          origin: host,
          source: otherIframe.contentWindow,
        })
      );

      expect(onReady).not.toHaveBeenCalled();
      otherIframe.remove();
    });

    it("ignores messages with null source", () => {
      const onReady = vi.fn();
      removeListener = setupMessageListener(
        researchId,
        { onReady },
        iframe,
        host
      );

      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: MESSAGE_TYPES.ready, researchId },
          origin: host,
          source: null,
        })
      );

      expect(onReady).not.toHaveBeenCalled();
    });

    it("ignores messages from window itself", () => {
      const onReady = vi.fn();
      removeListener = setupMessageListener(
        researchId,
        { onReady },
        iframe,
        host
      );

      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: MESSAGE_TYPES.ready, researchId },
          origin: host,
          source: window,
        })
      );

      expect(onReady).not.toHaveBeenCalled();
    });
  });

  describe("origin validation", () => {
    it("ignores messages from similar but different origins", () => {
      const onReady = vi.fn();
      removeListener = setupMessageListener(
        researchId,
        { onReady },
        iframe,
        host
      );

      const similarOrigins = [
        "https://getperspective.ai.evil.com",
        "https://evil.getperspective.ai",
        "https://getperspective.ai:8443",
        "http://getperspective.ai",
        "https://getperspective.ai/",
        "https://GETPERSPECTIVE.AI",
      ];

      for (const origin of similarOrigins) {
        window.dispatchEvent(
          new MessageEvent("message", {
            data: { type: MESSAGE_TYPES.ready, researchId },
            origin,
            source: iframe.contentWindow,
          })
        );
      }

      expect(onReady).not.toHaveBeenCalled();
    });
  });

  describe("message type validation", () => {
    it("ignores messages without type", () => {
      const onReady = vi.fn();
      removeListener = setupMessageListener(
        researchId,
        { onReady },
        iframe,
        host
      );

      window.dispatchEvent(
        new MessageEvent("message", {
          data: { researchId },
          origin: host,
          source: iframe.contentWindow,
        })
      );

      expect(onReady).not.toHaveBeenCalled();
    });

    it("ignores messages with non-string type gracefully", () => {
      const onReady = vi.fn();
      removeListener = setupMessageListener(
        researchId,
        { onReady },
        iframe,
        host
      );

      expect(() => {
        window.dispatchEvent(
          new MessageEvent("message", {
            data: { type: 123, researchId },
            origin: host,
            source: iframe.contentWindow,
          })
        );
      }).not.toThrow();

      expect(onReady).not.toHaveBeenCalled();
    });

    it("ignores messages with null data", () => {
      const onReady = vi.fn();
      removeListener = setupMessageListener(
        researchId,
        { onReady },
        iframe,
        host
      );

      window.dispatchEvent(
        new MessageEvent("message", {
          data: null,
          origin: host,
          source: iframe.contentWindow,
        })
      );

      expect(onReady).not.toHaveBeenCalled();
    });

    it("ignores messages with undefined data", () => {
      const onReady = vi.fn();
      removeListener = setupMessageListener(
        researchId,
        { onReady },
        iframe,
        host
      );

      window.dispatchEvent(
        new MessageEvent("message", {
          data: undefined,
          origin: host,
          source: iframe.contentWindow,
        })
      );

      expect(onReady).not.toHaveBeenCalled();
    });
  });

  describe("callback safety", () => {
    it("handles missing onSubmit callback gracefully", () => {
      removeListener = setupMessageListener(researchId, {}, iframe, host);

      expect(() => {
        window.dispatchEvent(
          new MessageEvent("message", {
            data: { type: MESSAGE_TYPES.submit, researchId },
            origin: host,
            source: iframe.contentWindow,
          })
        );
      }).not.toThrow();
    });

    it("handles missing onClose callback gracefully", () => {
      removeListener = setupMessageListener(researchId, {}, iframe, host);

      expect(() => {
        window.dispatchEvent(
          new MessageEvent("message", {
            data: { type: MESSAGE_TYPES.close, researchId },
            origin: host,
            source: iframe.contentWindow,
          })
        );
      }).not.toThrow();
    });

    it("handles missing onError callback gracefully", () => {
      removeListener = setupMessageListener(researchId, {}, iframe, host);

      expect(() => {
        window.dispatchEvent(
          new MessageEvent("message", {
            data: { type: MESSAGE_TYPES.error, researchId, error: "test" },
            origin: host,
            source: iframe.contentWindow,
          })
        );
      }).not.toThrow();
    });

    it("error callback receives properly structured error object", () => {
      const onError = vi.fn();
      removeListener = setupMessageListener(
        researchId,
        { onError },
        iframe,
        host
      );

      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: MESSAGE_TYPES.error,
            researchId,
            error: "Something went wrong",
            code: "INVALID_RESEARCH",
          },
          origin: host,
          source: iframe.contentWindow,
        })
      );

      expect(onError).toHaveBeenCalledTimes(1);
      const error = onError.mock.calls[0]![0] as Error & { code?: string };
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("Something went wrong");
      expect(error.code).toBe("INVALID_RESEARCH");
    });

    it("error defaults to UNKNOWN code when not provided", () => {
      const onError = vi.fn();
      removeListener = setupMessageListener(
        researchId,
        { onError },
        iframe,
        host
      );

      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: MESSAGE_TYPES.error,
            researchId,
            error: "Unknown error",
          },
          origin: host,
          source: iframe.contentWindow,
        })
      );

      expect(onError).toHaveBeenCalledTimes(1);
      const error = onError.mock.calls[0]![0] as Error & { code?: string };
      expect(error.code).toBe("UNKNOWN");
    });
  });

  describe("cleanup behavior", () => {
    it("stops receiving messages after cleanup", () => {
      const onReady = vi.fn();
      removeListener = setupMessageListener(
        researchId,
        { onReady },
        iframe,
        host
      );

      removeListener();

      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: MESSAGE_TYPES.ready, researchId },
          origin: host,
          source: iframe.contentWindow,
        })
      );

      expect(onReady).not.toHaveBeenCalled();
    });

    it("cleanup can be called multiple times safely", () => {
      removeListener = setupMessageListener(researchId, {}, iframe, host);

      expect(() => {
        removeListener();
        removeListener();
        removeListener();
      }).not.toThrow();
    });
  });
});
