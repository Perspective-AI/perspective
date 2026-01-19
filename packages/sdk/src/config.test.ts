import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

describe("config", () => {
  let configure: typeof import("./config").configure;
  let getConfig: typeof import("./config").getConfig;
  let hasDom: typeof import("./config").hasDom;
  let getHost: typeof import("./config").getHost;

  beforeEach(async () => {
    // Reset module state between tests to avoid state leakage
    vi.resetModules();
    const configModule = await import("./config");
    configure = configModule.configure;
    getConfig = configModule.getConfig;
    hasDom = configModule.hasDom;
    getHost = configModule.getHost;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("configure", () => {
    it("sets global config", () => {
      configure({ host: "https://example.com" });
      expect(getConfig()).toEqual({ host: "https://example.com" });
    });

    it("merges with existing config", () => {
      configure({ host: "https://example.com" });
      configure({ host: "https://other.com" });
      expect(getConfig()).toEqual({ host: "https://other.com" });
    });
  });

  describe("getConfig", () => {
    it("returns a copy of config", () => {
      configure({ host: "https://example.com" });
      const config1 = getConfig();
      const config2 = getConfig();
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different object references
    });
  });

  describe("hasDom", () => {
    it("returns true when window and document exist", () => {
      expect(hasDom()).toBe(true);
    });
  });

  describe("getHost", () => {
    it("returns instance host if provided", () => {
      expect(getHost("https://instance.example.com")).toBe(
        "https://instance.example.com"
      );
    });

    it("normalizes URL to origin", () => {
      expect(getHost("https://example.com/some/path?query=1")).toBe(
        "https://example.com"
      );
    });

    it("returns global config host if no instance host", () => {
      configure({ host: "https://global.example.com" });
      expect(getHost()).toBe("https://global.example.com");
    });

    it("instance host takes precedence over global", () => {
      configure({ host: "https://global.example.com" });
      expect(getHost("https://instance.example.com")).toBe(
        "https://instance.example.com"
      );
    });

    it("returns default host when no config", () => {
      expect(getHost()).toBe("https://getperspective.ai");
    });
  });
});
