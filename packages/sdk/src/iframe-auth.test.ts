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
      const mockPopup = { closed: false } as Window;
      const openSpy = vi.spyOn(window, "open").mockReturnValue(mockPopup);
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

    it("falls back to new tab when popup is blocked", () => {
      const mockTab = { closed: false } as Window;
      const openSpy = vi
        .spyOn(window, "open")
        .mockReturnValueOnce(null) // popup blocked
        .mockReturnValueOnce(mockTab); // fallback tab
      removeListener = setupMessageListener(researchId, {}, iframe, host);

      dispatchFromIframe({
        type: MESSAGE_TYPES.authRequest,
        provider: "google",
        authUrl: "https://getperspective.ai/embed-auth/google?research_id=test",
      });

      expect(openSpy).toHaveBeenCalledTimes(2);
      // First call: popup with features
      expect(openSpy.mock.calls[0]![2]).toContain("width=");
      // Second call: fallback to new tab
      expect(openSpy.mock.calls[1]![1]).toBe("_blank");
    });

    it("notifies the host app when auth windows are blocked entirely", () => {
      const onError = vi.fn();
      const postMessageSpy = vi.fn();
      vi.spyOn(window, "open").mockReturnValue(null);
      Object.defineProperty(iframe, "contentWindow", {
        value: { postMessage: postMessageSpy },
        configurable: true,
      });

      removeListener = setupMessageListener(
        researchId,
        { onError },
        iframe,
        host
      );

      dispatchFromIframe({
        type: MESSAGE_TYPES.authRequest,
        provider: "google",
        authUrl: "https://getperspective.ai/embed-auth/google?research_id=test",
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "UNKNOWN",
          message:
            "Authentication popup was blocked. Please allow popups and try again.",
        })
      );
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MESSAGE_TYPES.authCancelled,
          researchId,
        }),
        host
      );
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

    it("listens for postMessage from popup after opening auth window", () => {
      vi.spyOn(window, "open").mockReturnValue({ closed: false } as Window);
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
          data: { type: "perspective:popup-auth-complete", token },
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

    it("opens hidden popup to clear NextAuth session", () => {
      const openSpy = vi.spyOn(window, "open").mockReturnValue(null);

      removeListener = setupMessageListener(researchId, {}, iframe, host);

      dispatchFromIframe({
        type: MESSAGE_TYPES.authSignout,
      });

      expect(openSpy).toHaveBeenCalledWith(
        "https://getperspective.ai/embed-auth/signout",
        "perspective-signout",
        "width=1,height=1,top=0,left=0"
      );

      openSpy.mockRestore();
    });

    it("closes signout popup after timeout", () => {
      vi.useFakeTimers();
      const closeSpy = vi.fn();
      const openSpy = vi
        .spyOn(window, "open")
        .mockReturnValue({ close: closeSpy } as unknown as Window);

      removeListener = setupMessageListener(researchId, {}, iframe, host);

      dispatchFromIframe({
        type: MESSAGE_TYPES.authSignout,
      });

      expect(closeSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(3000);

      expect(closeSpy).toHaveBeenCalledTimes(1);

      openSpy.mockRestore();
      vi.useRealTimers();
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

    it("relays cached token when expiresAt is encoded in seconds", () => {
      const token = createMockToken(
        researchId,
        Math.floor((Date.now() + 86400000) / 1000)
      );
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

      const authMessages = postMessageSpy.mock.calls.filter(
        (call: unknown[]) =>
          (call[0] as Record<string, unknown>).type ===
          MESSAGE_TYPES.authComplete
      );
      expect(authMessages).toHaveLength(1);
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

    it("fires onAuth when restoring cached token on ready", () => {
      const storageKey = `${STORAGE_KEYS.embedAuthToken}:${researchId}`;
      const token = createMockToken(researchId, Date.now() + 86400000);
      localStorage.setItem(storageKey, token);

      const postMessageSpy = vi.fn();
      Object.defineProperty(iframe, "contentWindow", {
        value: { postMessage: postMessageSpy },
        configurable: true,
      });

      const onAuth = vi.fn();
      removeListener = setupMessageListener(
        researchId,
        { onAuth },
        iframe,
        host
      );

      dispatchFromIframe({ type: MESSAGE_TYPES.ready });

      expect(onAuth).toHaveBeenCalledWith({ researchId, token });
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
      vi.spyOn(window, "open").mockReturnValue({ closed: false } as Window);
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

      // Should have removed message listener
      const removedTypes = removeEventSpy.mock.calls.map((call) => call[0]);
      expect(removedTypes).toContain("message");
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it("cleans up previous auth flow when new auth request arrives", () => {
      vi.spyOn(window, "open").mockReturnValue({ closed: false } as Window);
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
