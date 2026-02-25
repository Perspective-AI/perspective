import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setupMessageListener } from "./iframe";
import { MESSAGE_TYPES, STORAGE_KEYS } from "./constants";

describe("embed auth message handling", () => {
  let iframe: HTMLIFrameElement;
  let removeListener: () => void;
  const host = "https://getperspective.ai";
  const researchId = "test-research-id";

  beforeEach(() => {
    iframe = document.createElement("iframe");
    document.body.appendChild(iframe);
    localStorage.clear();
  });

  afterEach(() => {
    removeListener?.();
    iframe.remove();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  function dispatchFromIframe(data: Record<string, unknown>) {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { researchId, ...data },
        origin: host,
        source: iframe.contentWindow,
      })
    );
  }

  describe("perspective:auth-request", () => {
    it("opens a new window with the auth URL", () => {
      const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
      removeListener = setupMessageListener(researchId, {}, iframe, host);

      dispatchFromIframe({
        type: MESSAGE_TYPES.authRequest,
        provider: "google",
        authUrl: "https://getperspective.ai/embed-auth/google?research_id=test",
      });

      expect(openSpy).toHaveBeenCalledOnce();
      const openUrl = openSpy.mock.calls[0]![0] as string;
      expect(openUrl).toContain(
        "https://getperspective.ai/embed-auth/google?research_id=test"
      );
      expect(openUrl).toContain("return_url=");
    });

    it("ignores auth request without authUrl", () => {
      const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
      removeListener = setupMessageListener(researchId, {}, iframe, host);

      dispatchFromIframe({
        type: MESSAGE_TYPES.authRequest,
        provider: "google",
      });

      expect(openSpy).not.toHaveBeenCalled();
    });

    it("ignores auth request with non-string authUrl", () => {
      const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
      removeListener = setupMessageListener(researchId, {}, iframe, host);

      dispatchFromIframe({
        type: MESSAGE_TYPES.authRequest,
        provider: "google",
        authUrl: 123,
      });

      expect(openSpy).not.toHaveBeenCalled();
    });

    it("listens for hashchange after opening auth window", () => {
      vi.spyOn(window, "open").mockReturnValue(null);
      const addEventSpy = vi.spyOn(window, "addEventListener");
      removeListener = setupMessageListener(researchId, {}, iframe, host);

      dispatchFromIframe({
        type: MESSAGE_TYPES.authRequest,
        provider: "google",
        authUrl: "https://getperspective.ai/embed-auth/google",
      });

      const hashChangeCalls = addEventSpy.mock.calls.filter(
        (call) => call[0] === "hashchange"
      );
      expect(hashChangeCalls.length).toBeGreaterThan(0);
    });

    it("listens for postMessage from popup after opening auth window", () => {
      vi.spyOn(window, "open").mockReturnValue(null);
      const addEventSpy = vi.spyOn(window, "addEventListener");
      removeListener = setupMessageListener(researchId, {}, iframe, host);

      dispatchFromIframe({
        type: MESSAGE_TYPES.authRequest,
        provider: "google",
        authUrl: "https://getperspective.ai/embed-auth/google",
      });

      // Should listen for "message" events (for popup postMessage)
      const messageCalls = addEventSpy.mock.calls.filter(
        (call) => call[0] === "message"
      );
      // At least 2: the main setupMessageListener handler + the popup handler
      expect(messageCalls.length).toBeGreaterThanOrEqual(2);
    });

    it("relays token from hashchange end-to-end", () => {
      vi.spyOn(window, "open").mockReturnValue(null);
      const onAuth = vi.fn();

      const postMessageSpy = vi.fn();
      Object.defineProperty(iframe, "contentWindow", {
        value: { postMessage: postMessageSpy },
        configurable: true,
      });

      removeListener = setupMessageListener(
        researchId,
        { onAuth },
        iframe,
        host
      );

      // Trigger auth request to register hashchange listener
      dispatchFromIframe({
        type: MESSAGE_TYPES.authRequest,
        provider: "google",
        authUrl: "https://getperspective.ai/embed-auth/google",
      });

      const token = createMockToken(researchId, Date.now() + 86400000);

      // Simulate redirect back with token in hash — save/restore location
      const origLocation = window.location;
      Object.defineProperty(window, "location", {
        value: {
          ...origLocation,
          href: origLocation.href,
          hash: `#embed-auth-token=${token}`,
          pathname: origLocation.pathname,
          search: origLocation.search,
        },
        writable: true,
        configurable: true,
      });

      try {
        window.dispatchEvent(new Event("hashchange"));

        // Token should be cached
        expect(
          localStorage.getItem(`${STORAGE_KEYS.embedAuthToken}:${researchId}`)
        ).toBe(token);

        // Token should be relayed to iframe
        const authMessages = postMessageSpy.mock.calls.filter(
          (call: unknown[]) =>
            (call[0] as Record<string, unknown>).type ===
            MESSAGE_TYPES.authComplete
        );
        expect(authMessages.length).toBe(1);
        expect(authMessages[0]![0]).toMatchObject({
          type: MESSAGE_TYPES.authComplete,
          token,
          researchId,
        });

        // onAuth callback should fire
        expect(onAuth).toHaveBeenCalledWith({ researchId, token });
      } finally {
        // Restore original location to avoid polluting other tests
        Object.defineProperty(window, "location", {
          value: origLocation,
          writable: true,
          configurable: true,
        });
      }
    });

    it("relays token from popup postMessage end-to-end", () => {
      const popupWindow = {} as Window;
      vi.spyOn(window, "open").mockReturnValue(popupWindow);
      const onAuth = vi.fn();

      const postMessageSpy = vi.fn();
      Object.defineProperty(iframe, "contentWindow", {
        value: { postMessage: postMessageSpy },
        configurable: true,
      });

      removeListener = setupMessageListener(
        researchId,
        { onAuth },
        iframe,
        host
      );

      // Trigger auth request to register popup message listener
      dispatchFromIframe({
        type: MESSAGE_TYPES.authRequest,
        provider: "google",
        authUrl: "https://getperspective.ai/embed-auth/google",
      });

      const token = createMockToken(researchId, Date.now() + 86400000);

      // Simulate postMessage from popup
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "embed-auth-complete", token },
          origin: host,
          source: popupWindow,
        })
      );

      // Token should be cached
      expect(
        localStorage.getItem(`${STORAGE_KEYS.embedAuthToken}:${researchId}`)
      ).toBe(token);

      // Token should be relayed to iframe
      const authMessages = postMessageSpy.mock.calls.filter(
        (call: unknown[]) =>
          (call[0] as Record<string, unknown>).type ===
          MESSAGE_TYPES.authComplete
      );
      expect(authMessages.length).toBe(1);

      // onAuth callback should fire
      expect(onAuth).toHaveBeenCalledWith({ researchId, token });
    });
  });

  describe("perspective:auth-complete (from iframe)", () => {
    it("caches token in localStorage", () => {
      removeListener = setupMessageListener(researchId, {}, iframe, host);

      const token = createMockToken(researchId, Date.now() + 86400000);
      dispatchFromIframe({
        type: MESSAGE_TYPES.authComplete,
        token,
      });

      const cached = localStorage.getItem(
        `${STORAGE_KEYS.embedAuthToken}:${researchId}`
      );
      expect(cached).toBe(token);
    });

    it("calls onAuth callback with token", () => {
      const onAuth = vi.fn();
      removeListener = setupMessageListener(
        researchId,
        { onAuth },
        iframe,
        host
      );

      const token = createMockToken(researchId, Date.now() + 86400000);
      dispatchFromIframe({
        type: MESSAGE_TYPES.authComplete,
        token,
      });

      expect(onAuth).toHaveBeenCalledWith({ researchId, token });
    });

    it("ignores auth-complete without token", () => {
      const onAuth = vi.fn();
      removeListener = setupMessageListener(
        researchId,
        { onAuth },
        iframe,
        host
      );

      dispatchFromIframe({
        type: MESSAGE_TYPES.authComplete,
      });

      expect(onAuth).not.toHaveBeenCalled();
    });
  });

  describe("perspective:auth-signout", () => {
    it("clears cached token from localStorage", () => {
      const storageKey = `${STORAGE_KEYS.embedAuthToken}:${researchId}`;
      localStorage.setItem(storageKey, "some-token");

      removeListener = setupMessageListener(researchId, {}, iframe, host);

      dispatchFromIframe({
        type: MESSAGE_TYPES.authSignout,
      });

      expect(localStorage.getItem(storageKey)).toBeNull();
    });
  });

  describe("token relay on perspective:ready", () => {
    it("relays cached token to iframe on ready", () => {
      // Pre-cache a valid token
      const token = createMockToken(researchId, Date.now() + 86400000);
      localStorage.setItem(
        `${STORAGE_KEYS.embedAuthToken}:${researchId}`,
        token
      );

      const postMessageSpy = vi.fn();
      Object.defineProperty(iframe, "contentWindow", {
        value: { postMessage: postMessageSpy },
        configurable: true,
      });

      removeListener = setupMessageListener(researchId, {}, iframe, host);

      dispatchFromIframe({ type: MESSAGE_TYPES.ready });

      // Should have sent multiple messages (anonId, init, authComplete)
      const authMessages = postMessageSpy.mock.calls.filter(
        (call: unknown[]) =>
          (call[0] as Record<string, unknown>).type ===
          MESSAGE_TYPES.authComplete
      );
      expect(authMessages.length).toBe(1);
      expect(authMessages[0]![0]).toMatchObject({
        type: MESSAGE_TYPES.authComplete,
        token,
        researchId,
      });
    });

    it("does NOT relay expired token on ready", () => {
      // Pre-cache an expired token
      const expiredToken = createMockToken(researchId, Date.now() - 1000);
      localStorage.setItem(
        `${STORAGE_KEYS.embedAuthToken}:${researchId}`,
        expiredToken
      );

      const postMessageSpy = vi.fn();
      Object.defineProperty(iframe, "contentWindow", {
        value: { postMessage: postMessageSpy },
        configurable: true,
      });

      removeListener = setupMessageListener(researchId, {}, iframe, host);

      dispatchFromIframe({ type: MESSAGE_TYPES.ready });

      // Should NOT have sent authComplete
      const authMessages = postMessageSpy.mock.calls.filter(
        (call: unknown[]) =>
          (call[0] as Record<string, unknown>).type ===
          MESSAGE_TYPES.authComplete
      );
      expect(authMessages.length).toBe(0);
    });

    it("cleans up expired token from localStorage on ready", () => {
      const storageKey = `${STORAGE_KEYS.embedAuthToken}:${researchId}`;
      const expiredToken = createMockToken(researchId, Date.now() - 1000);
      localStorage.setItem(storageKey, expiredToken);

      // Mock contentWindow to avoid happy-dom cross-origin postMessage error
      const postMessageSpy = vi.fn();
      Object.defineProperty(iframe, "contentWindow", {
        value: { postMessage: postMessageSpy },
        configurable: true,
      });

      removeListener = setupMessageListener(researchId, {}, iframe, host);

      dispatchFromIframe({ type: MESSAGE_TYPES.ready });

      // Expired token should have been cleaned up
      expect(localStorage.getItem(storageKey)).toBeNull();
    });

    it("does nothing when no cached token exists", () => {
      const postMessageSpy = vi.fn();
      Object.defineProperty(iframe, "contentWindow", {
        value: { postMessage: postMessageSpy },
        configurable: true,
      });

      removeListener = setupMessageListener(researchId, {}, iframe, host);

      dispatchFromIframe({ type: MESSAGE_TYPES.ready });

      const authMessages = postMessageSpy.mock.calls.filter(
        (call: unknown[]) =>
          (call[0] as Record<string, unknown>).type ===
          MESSAGE_TYPES.authComplete
      );
      expect(authMessages.length).toBe(0);
    });
  });

  describe("authUrl origin validation", () => {
    it("blocks auth request with mismatched origin", () => {
      const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      removeListener = setupMessageListener(researchId, {}, iframe, host);

      dispatchFromIframe({
        type: MESSAGE_TYPES.authRequest,
        provider: "google",
        authUrl: "https://evil.com/steal-creds",
      });

      expect(openSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Blocked auth URL"),
        expect.any(String)
      );
    });

    it("blocks auth request with malformed URL", () => {
      const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      removeListener = setupMessageListener(researchId, {}, iframe, host);

      dispatchFromIframe({
        type: MESSAGE_TYPES.authRequest,
        provider: "google",
        authUrl: "not-a-url",
      });

      expect(openSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Blocked malformed auth URL"),
        expect.any(String)
      );
    });
  });

  describe("auth listener cleanup on embed destroy", () => {
    it("cleans up auth listeners when removeListener is called during active auth", () => {
      vi.spyOn(window, "open").mockReturnValue(null);
      const removeEventSpy = vi.spyOn(window, "removeEventListener");
      const clearIntervalSpy = vi.spyOn(window, "clearInterval");

      removeListener = setupMessageListener(researchId, {}, iframe, host);

      dispatchFromIframe({
        type: MESSAGE_TYPES.authRequest,
        provider: "google",
        authUrl: "https://getperspective.ai/embed-auth/google",
      });

      // Destroy the embed while auth is in progress
      removeListener();

      // Should have removed hashchange and message listeners
      const removedTypes = removeEventSpy.mock.calls.map((call) => call[0]);
      expect(removedTypes).toContain("hashchange");
      expect(removedTypes).toContain("message");
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it("cleans up previous auth flow when new auth request arrives", () => {
      vi.spyOn(window, "open").mockReturnValue(null);
      const clearIntervalSpy = vi.spyOn(window, "clearInterval");

      removeListener = setupMessageListener(researchId, {}, iframe, host);

      // First auth request
      dispatchFromIframe({
        type: MESSAGE_TYPES.authRequest,
        provider: "google",
        authUrl: "https://getperspective.ai/embed-auth/google",
      });

      // Second auth request should clean up the first
      dispatchFromIframe({
        type: MESSAGE_TYPES.authRequest,
        provider: "google",
        authUrl: "https://getperspective.ai/embed-auth/google",
      });

      // clearInterval should have been called for the first flow's polling
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe("token caching isolation", () => {
    it("caches tokens scoped to researchId", () => {
      removeListener = setupMessageListener(researchId, {}, iframe, host);

      const token = createMockToken(researchId, Date.now() + 86400000);
      dispatchFromIframe({
        type: MESSAGE_TYPES.authComplete,
        token,
      });

      // Correct key should have the token
      expect(
        localStorage.getItem(`${STORAGE_KEYS.embedAuthToken}:${researchId}`)
      ).toBe(token);

      // Different researchId key should be empty
      expect(
        localStorage.getItem(`${STORAGE_KEYS.embedAuthToken}:other-research`)
      ).toBeNull();
    });

    it("signout only clears token for the specific researchId", () => {
      const otherKey = `${STORAGE_KEYS.embedAuthToken}:other-research`;
      localStorage.setItem(otherKey, "other-token");

      removeListener = setupMessageListener(researchId, {}, iframe, host);

      dispatchFromIframe({ type: MESSAGE_TYPES.authSignout });

      // Other research's token should remain
      expect(localStorage.getItem(otherKey)).toBe("other-token");
    });
  });
});

/**
 * Create a mock JWT token with the given researchId and expiresAt.
 * The payload is base64-encoded JSON in the standard JWT format.
 * This is NOT a valid signed JWT — just enough for the SDK's
 * `decodeTokenExpiry` to extract the expiry.
 */
function createMockToken(researchId: string, expiresAt: number): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      data: {
        email: "test@example.com",
        name: "Test User",
        userId: "user-123",
        connectedProviders: ["google"],
        researchId,
        expiresAt,
      },
    })
  );
  const signature = btoa("fake-signature");
  return `${header}.${payload}.${signature}`;
}
