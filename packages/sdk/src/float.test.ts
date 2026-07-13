import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createFloatBubble, createChatBubble } from "./float";
import { prefetchSceneImage } from "./loading";
import * as config from "./config";
import { getPersistedOpenState, setPersistedOpenState } from "./state";

/** Minimal AudioContext stub — jsdom has none, so the SDK's chime silently
 *  no-ops in tests unless we stub the constructor. */
function createFakeAudioContext() {
  const node = {
    connect: (target: unknown) => target,
    start: () => {},
    stop: () => {},
    type: "sine",
    frequency: { setValueAtTime: () => {} },
    gain: {
      setValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
    },
  };
  return {
    currentTime: 0,
    state: "running",
    destination: {},
    createOscillator: () => ({ ...node }),
    createGain: () => ({ ...node }),
    resume: () => Promise.resolve(),
    close: () => Promise.resolve(),
  };
}

describe("createFloatBubble", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
    sessionStorage.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("prefetches the scene image on bubble hover", () => {
    createFloatBubble({
      researchId: "float-prefetch-test",
      host: "https://s.getperspective.ai",
    });
    const bubble = document.querySelector(
      ".perspective-float-bubble"
    ) as HTMLElement;
    bubble.dispatchEvent(new Event("pointerenter"));
    // hover already kicked the fetch, so a manual prefetch is a dedup no-op
    expect(
      prefetchSceneImage("float-prefetch-test", "https://s.getperspective.ai")
    ).toBeNull();
  });

  it("creates float bubble", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    expect(handle.researchId).toBe("test-research-id");
    expect(handle.type).toBe("float");
    expect(handle.isOpen).toBe(false);
    expect(document.querySelector(".perspective-float-bubble")).toBeTruthy();

    handle.unmount();
  });

  it("uses messages icon when channel is text-only", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
      channel: "TEXT",
    });

    const bubble = document.querySelector(
      ".perspective-float-bubble"
    ) as HTMLButtonElement;

    expect(bubble.innerHTML).toContain("lucide-messages-square");

    handle.unmount();
  });

  it("uses microphone icon when channel includes voice", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
      channel: ["VOICE", "TEXT"],
    });

    const bubble = document.querySelector(
      ".perspective-float-bubble"
    ) as HTMLButtonElement;

    expect(bubble.innerHTML).not.toContain("lucide-messages-square");

    handle.unmount();
  });

  it("shows welcome teaser and notification dot after delay", () => {
    vi.useFakeTimers();

    const handle = createFloatBubble({
      researchId: "test-research-id",
      welcomeMessage: "Have questions? I can help.",
    });

    expect(document.querySelector(".perspective-float-teaser")).toBeFalsy();
    expect(
      document.querySelector(".perspective-float-notification-dot")
    ).toBeFalsy();

    vi.advanceTimersByTime(3000);

    expect(document.querySelector(".perspective-float-teaser")).toBeTruthy();
    expect(
      document.querySelector(".perspective-float-notification-dot")
    ).toBeTruthy();

    handle.unmount();
  });

  it("returns no-op handle when no DOM", () => {
    vi.spyOn(config, "hasDom").mockReturnValue(false);

    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    expect(handle.iframe).toBeNull();
    expect(handle.container).toBeNull();
    expect(handle.isOpen).toBe(false);
    expect(handle.unmount).toBeInstanceOf(Function);
    expect(() => handle.unmount()).not.toThrow();
    expect(() => handle.open()).not.toThrow();
    expect(() => handle.close()).not.toThrow();
    expect(() => handle.toggle()).not.toThrow();
  });

  it("open() opens float window", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    expect(handle.isOpen).toBe(false);
    expect(document.querySelector(".perspective-float-window")).toBeFalsy();

    handle.open();

    expect(handle.isOpen).toBe(true);
    expect(document.querySelector(".perspective-float-window")).toBeTruthy();
    expect(
      getPersistedOpenState({
        researchId: "test-research-id",
        type: "float",
      })
    ).toBe(true);

    handle.unmount();
  });

  it("close() closes float window", () => {
    const onClose = vi.fn();
    const handle = createFloatBubble({
      researchId: "test-research-id",
      onClose,
    });

    handle.open();
    expect(handle.isOpen).toBe(true);
    expect(document.querySelector(".perspective-float-window")).toBeTruthy();

    handle.close();

    expect(handle.isOpen).toBe(false);
    expect(document.querySelector(".perspective-float-window")).toBeFalsy();
    expect(onClose).toHaveBeenCalled();
    expect(
      getPersistedOpenState({
        researchId: "test-research-id",
        type: "float",
      })
    ).toBe(false);
  });

  it("toggle() toggles float window", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    expect(handle.isOpen).toBe(false);

    handle.toggle();
    expect(handle.isOpen).toBe(true);
    expect(document.querySelector(".perspective-float-window")).toBeTruthy();

    handle.toggle();
    expect(handle.isOpen).toBe(false);
    expect(document.querySelector(".perspective-float-window")).toBeFalsy();

    handle.unmount();
  });

  it("clicking bubble toggles float window", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    const bubble = document.querySelector(
      ".perspective-float-bubble"
    ) as HTMLButtonElement;
    expect(bubble).toBeTruthy();

    bubble.click();
    expect(handle.isOpen).toBe(true);
    expect(document.querySelector(".perspective-float-window")).toBeTruthy();

    bubble.click();
    expect(handle.isOpen).toBe(false);
    expect(document.querySelector(".perspective-float-window")).toBeFalsy();

    handle.unmount();
  });

  it("close button in float window closes it", () => {
    const onClose = vi.fn();
    const handle = createFloatBubble({
      researchId: "test-research-id",
      onClose,
    });

    handle.open();

    const closeBtn = document.querySelector(
      ".perspective-float-window .perspective-close"
    ) as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();

    closeBtn.click();

    expect(handle.isOpen).toBe(false);
    expect(document.querySelector(".perspective-float-window")).toBeFalsy();
    expect(onClose).toHaveBeenCalled();
  });

  describe("close button handoff", () => {
    const host = "https://getperspective.ai";
    const researchId = "test-research-id";

    const send = (iframe: HTMLIFrameElement, type: string) =>
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type, researchId },
          origin: host,
          source: iframe.contentWindow,
        })
      );

    it("removes the SDK close button as soon as the skeleton hides (visual-ready)", () => {
      const handle = createFloatBubble({ researchId, host });
      handle.open();

      // Temporary X present while the skeleton is up...
      expect(
        document.querySelector(".perspective-float-window .perspective-close")
      ).toBeTruthy();

      send(handle.iframe!, "perspective:visual-ready");

      // ...removed once the app is visible to draw its own (in its header).
      expect(
        document.querySelector(".perspective-float-window .perspective-close")
      ).toBeFalsy();

      handle.unmount();
    });

    it("sends renderCloseButton: true in init message", () => {
      const handle = createFloatBubble({ researchId, host });
      handle.open();

      const postMessageSpy = vi.fn();
      handle.iframe!.contentWindow!.postMessage = postMessageSpy;

      send(handle.iframe!, "perspective:ready");

      const initCall = postMessageSpy.mock.calls.find(
        (args: unknown[]) =>
          (args[0] as { type: string }).type === "perspective:init"
      );
      expect(initCall).toBeTruthy();
      const init = initCall![0] as {
        renderCloseButton: boolean;
        hasCloseButton?: boolean;
      };
      expect(init.renderCloseButton).toBe(true);
      // Legacy flag retired — float no longer sends it either.
      expect(init.hasCloseButton).toBeUndefined();

      handle.unmount();
    });
  });

  it("unmount removes bubble and window", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    handle.open();
    expect(document.querySelector(".perspective-float-bubble")).toBeTruthy();
    expect(document.querySelector(".perspective-float-window")).toBeTruthy();

    handle.unmount();

    expect(document.querySelector(".perspective-float-bubble")).toBeFalsy();
    expect(document.querySelector(".perspective-float-window")).toBeFalsy();
    expect(
      getPersistedOpenState({
        researchId: "test-research-id",
        type: "float",
      })
    ).toBe(true);
  });

  it("destroy clears persisted open state", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    handle.open();

    handle.destroy();

    expect(document.querySelector(".perspective-float-bubble")).toBeFalsy();
    expect(
      getPersistedOpenState({
        researchId: "test-research-id",
        type: "float",
      })
    ).toBe(false);
  });

  it("restores open state from sessionStorage", () => {
    setPersistedOpenState({
      researchId: "test-research-id",
      type: "float",
      open: true,
    });

    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    expect(handle.isOpen).toBe(true);
    expect(document.querySelector(".perspective-float-window")).toBeTruthy();

    handle.unmount();
  });

  it("does not restart welcome sequence after closing a restored float", () => {
    vi.useFakeTimers();

    setPersistedOpenState({
      researchId: "test-research-id",
      type: "float",
      open: true,
    });

    const handle = createFloatBubble({
      researchId: "test-research-id",
      welcomeMessage: "Have questions? I can help.",
    });

    expect(handle.isOpen).toBe(true);

    handle.close();
    handle.update({});
    vi.advanceTimersByTime(3000);

    expect(document.querySelector(".perspective-float-teaser")).toBeFalsy();

    handle.unmount();
  });

  it("open when already open is no-op", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
    });

    handle.open();
    const window1 = document.querySelector(".perspective-float-window");

    handle.open();
    const window2 = document.querySelector(".perspective-float-window");

    expect(window1).toBe(window2);

    handle.unmount();
  });

  it("close when already closed is no-op", () => {
    const onClose = vi.fn();
    const handle = createFloatBubble({
      researchId: "test-research-id",
      onClose,
    });

    handle.close();
    handle.close();
    handle.close();

    expect(onClose).not.toHaveBeenCalled();

    handle.unmount();
  });

  it("uses custom host", () => {
    const handle = createFloatBubble({
      researchId: "test-research-id",
      host: "https://custom.example.com",
    });

    handle.open();

    const iframe = handle.iframe as HTMLIFrameElement;
    expect(iframe.src).toContain("https://custom.example.com");

    handle.unmount();
  });

  it("update modifies config", () => {
    const onSubmit1 = vi.fn();
    const onSubmit2 = vi.fn();

    const handle = createFloatBubble({
      researchId: "test-research-id",
      onSubmit: onSubmit1,
    });

    expect(() => handle.update({ onSubmit: onSubmit2 })).not.toThrow();

    handle.unmount();
  });

  describe("update() behavior", () => {
    const host = "https://getperspective.ai";
    const researchId = "test-research-id";

    const sendMessage = (
      iframe: HTMLIFrameElement,
      type: string,
      extra?: Record<string, unknown>
    ) => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type, researchId, ...extra },
          origin: host,
          source: iframe.contentWindow,
        })
      );
    };

    it("update changes which callback is invoked", () => {
      const onSubmit1 = vi.fn();
      const onSubmit2 = vi.fn();

      const handle = createFloatBubble({
        researchId,
        host,
        onSubmit: onSubmit1,
      });

      handle.open();
      handle.update({ onSubmit: onSubmit2 });

      sendMessage(handle.iframe!, "perspective:submit");

      expect(onSubmit2).toHaveBeenCalledTimes(1);
      expect(onSubmit1).not.toHaveBeenCalled();

      handle.unmount();
    });

    it("sequential updates only use latest callback", () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const fn3 = vi.fn();

      const handle = createFloatBubble({
        researchId,
        host,
        onSubmit: fn1,
      });

      handle.open();
      handle.update({ onSubmit: fn2 });
      handle.update({ onSubmit: fn3 });

      sendMessage(handle.iframe!, "perspective:submit");

      expect(fn3).toHaveBeenCalledTimes(1);
      expect(fn2).not.toHaveBeenCalled();
      expect(fn1).not.toHaveBeenCalled();

      handle.unmount();
    });

    it("close prevents further callback invocations from that window", () => {
      const onSubmit = vi.fn();
      const onClose = vi.fn();

      const handle = createFloatBubble({
        researchId,
        host,
        onSubmit,
        onClose,
      });

      handle.open();
      const iframe = handle.iframe!;

      handle.close();
      expect(onClose).toHaveBeenCalledTimes(1);

      sendMessage(iframe, "perspective:submit");

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("update with _apiConfig applies bubble theme colors", () => {
      const handle = createFloatBubble({
        researchId,
        host,
      });

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;

      // Initially no custom background (no brand or _apiConfig)
      expect(bubble.style.getPropertyValue("--perspective-float-bg")).toBe("");

      // Simulate async config arriving via update
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (handle.update as any)({
        _apiConfig: {
          primaryColor: "#ff0000",
          textColor: "#ffffff",
          darkPrimaryColor: "#cc0000",
          darkTextColor: "#ffffff",
        },
      });

      expect(bubble.style.getPropertyValue("--perspective-float-bg")).toBe(
        "#ff0000"
      );
      expect(bubble.style.backgroundColor).toBe("#ff0000");

      handle.unmount();
    });

    it("update with _apiConfig does not override launcher.style.backgroundColor", () => {
      const handle = createFloatBubble({
        researchId,
        host,
        launcher: { style: { backgroundColor: "#00ff00" } },
      });

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      expect(bubble.style.backgroundColor).toBe("#00ff00");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (handle.update as any)({
        _apiConfig: {
          primaryColor: "#ff0000",
          textColor: "#ffffff",
          darkPrimaryColor: "#cc0000",
          darkTextColor: "#ffffff",
        },
      });

      // launcher.style.backgroundColor takes precedence
      expect(bubble.style.backgroundColor).toBe("#00ff00");

      handle.unmount();
    });
  });

  describe("teaser config", () => {
    it("teaser.enabled=false suppresses teaser and notification dot", () => {
      vi.useFakeTimers();

      const handle = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
        teaser: { enabled: false },
      });

      vi.advanceTimersByTime(10000);

      expect(document.querySelector(".perspective-float-teaser")).toBeFalsy();
      expect(
        document.querySelector(".perspective-float-notification-dot")
      ).toBeFalsy();

      handle.unmount();
    });

    it("teaser.delay controls when the teaser appears", () => {
      vi.useFakeTimers();

      const handle = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
        teaser: { delay: 500 },
      });

      vi.advanceTimersByTime(400);
      expect(document.querySelector(".perspective-float-teaser")).toBeFalsy();

      vi.advanceTimersByTime(100);
      expect(document.querySelector(".perspective-float-teaser")).toBeTruthy();

      handle.unmount();
    });

    it("teaser.delay=0 shows the teaser immediately", () => {
      vi.useFakeTimers();

      const handle = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
        teaser: { delay: 0 },
      });

      vi.advanceTimersByTime(0);
      expect(document.querySelector(".perspective-float-teaser")).toBeTruthy();

      handle.unmount();
    });

    it("plays the chime 1s before the teaser (2s with the default 3s delay)", () => {
      vi.useFakeTimers();
      const audioCtxCtor = vi.fn(() => createFakeAudioContext());
      vi.stubGlobal("AudioContext", audioCtxCtor);

      const handle = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
      });

      vi.advanceTimersByTime(1999);
      expect(audioCtxCtor).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(audioCtxCtor).toHaveBeenCalledTimes(1);

      handle.unmount();
      vi.unstubAllGlobals();
    });

    it("chime tracks a long teaser delay instead of firing early", () => {
      vi.useFakeTimers();
      const audioCtxCtor = vi.fn(() => createFakeAudioContext());
      vi.stubGlobal("AudioContext", audioCtxCtor);

      const handle = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
        teaser: { delay: 10000 },
      });

      vi.advanceTimersByTime(8999);
      expect(audioCtxCtor).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(audioCtxCtor).toHaveBeenCalledTimes(1);
      expect(document.querySelector(".perspective-float-teaser")).toBeFalsy();

      vi.advanceTimersByTime(1000);
      expect(document.querySelector(".perspective-float-teaser")).toBeTruthy();

      handle.unmount();
      vi.unstubAllGlobals();
    });

    it("teaser.sound=false skips the chime", () => {
      vi.useFakeTimers();
      const audioCtxCtor = vi.fn(() => createFakeAudioContext());
      vi.stubGlobal("AudioContext", audioCtxCtor);

      const handle = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
        teaser: { sound: false },
      });

      vi.advanceTimersByTime(10000);

      expect(audioCtxCtor).not.toHaveBeenCalled();
      // Teaser itself still shows
      expect(document.querySelector(".perspective-float-teaser")).toBeTruthy();

      handle.unmount();
      vi.unstubAllGlobals();
    });

    it("chime fires immediately when delay is shorter than the 1s lead", () => {
      vi.useFakeTimers();
      const audioCtxCtor = vi.fn(() => createFakeAudioContext());
      vi.stubGlobal("AudioContext", audioCtxCtor);

      const handle = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
        teaser: { delay: 500 },
      });

      vi.advanceTimersByTime(0);
      expect(audioCtxCtor).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(500);
      expect(document.querySelector(".perspective-float-teaser")).toBeTruthy();

      // Nothing else fires later
      vi.advanceTimersByTime(10000);
      expect(audioCtxCtor).toHaveBeenCalledTimes(1);

      handle.unmount();
      vi.unstubAllGlobals();
    });

    it("update() enabling the teaser starts the welcome sequence", () => {
      vi.useFakeTimers();

      const handle = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
        teaser: { enabled: false },
      });

      vi.advanceTimersByTime(10000);
      expect(document.querySelector(".perspective-float-teaser")).toBeFalsy();

      handle.update({ teaser: { enabled: true, delay: 1000 } });

      vi.advanceTimersByTime(1000);
      expect(document.querySelector(".perspective-float-teaser")).toBeTruthy();

      handle.unmount();
    });

    it("update() disabling the teaser cancels a pending teaser", () => {
      vi.useFakeTimers();

      const handle = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
      });

      vi.advanceTimersByTime(1000);
      handle.update({ teaser: { enabled: false } });

      vi.advanceTimersByTime(10000);
      expect(document.querySelector(".perspective-float-teaser")).toBeFalsy();

      handle.unmount();
    });

    it("update() disabling the teaser removes a visible teaser", () => {
      vi.useFakeTimers();

      const handle = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
      });

      vi.advanceTimersByTime(3000);
      expect(document.querySelector(".perspective-float-teaser")).toBeTruthy();

      handle.update({ teaser: { enabled: false } });
      expect(document.querySelector(".perspective-float-teaser")).toBeFalsy();
      expect(
        document.querySelector(".perspective-float-notification-dot")
      ).toBeFalsy();

      handle.unmount();
    });

    it("keeps an API teaser disable when a later _apiConfig omits teaser settings", () => {
      vi.useFakeTimers();

      const handle = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
      });

      const colors = {
        primaryColor: "#7c3aed",
        textColor: "#ffffff",
        darkPrimaryColor: "#a78bfa",
        darkTextColor: "#ffffff",
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (handle.update as any)({
        _apiConfig: {
          ...colors,
          embedSettings: { teaser: { enabled: false } },
        },
      });
      // A refresh without embedSettings.teaser must not re-enable the teaser
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (handle.update as any)({ _apiConfig: { ...colors } });

      vi.advanceTimersByTime(10000);
      expect(document.querySelector(".perspective-float-teaser")).toBeFalsy();

      handle.unmount();
    });

    it("avatar config auto-fetch cancels the teaser when the API disables it", async () => {
      vi.useFakeTimers();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            primaryColor: "#7c3aed",
            textColor: "#ffffff",
            darkPrimaryColor: "#a78bfa",
            darkTextColor: "#ffffff",
            avatarUrl: "https://example.com/avatar.png",
            embedSettings: { teaser: { enabled: false } },
          }),
        })
      );

      const handle = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
        launcher: { icon: "avatar" },
      });

      // Flush the fetch promise chain (fetch → json → merge)
      for (let i = 0; i < 5; i++) {
        await Promise.resolve();
      }

      vi.advanceTimersByTime(10000);
      expect(document.querySelector(".perspective-float-teaser")).toBeFalsy();

      handle.unmount();
      vi.unstubAllGlobals();
    });

    it("API embedSettings.teaser overrides customer config", () => {
      vi.useFakeTimers();

      const handle = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
        teaser: { enabled: true },
      });

      // Async API config arrives with the teaser disabled from the dashboard
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (handle.update as any)({
        _apiConfig: {
          primaryColor: "#7c3aed",
          textColor: "#ffffff",
          darkPrimaryColor: "#a78bfa",
          darkTextColor: "#ffffff",
          embedSettings: { teaser: { enabled: false } },
        },
      });

      vi.advanceTimersByTime(10000);
      expect(document.querySelector(".perspective-float-teaser")).toBeFalsy();

      handle.unmount();
    });

    it("API embedSettings.teaser.delay reschedules a pending teaser armed at mount", () => {
      vi.useFakeTimers();

      const handle = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
      });

      // Async API config arrives after 1s with a longer delay from the
      // dashboard — the sequence armed at mount with the 3s default must
      // be rescheduled instead of firing at 3s.
      vi.advanceTimersByTime(1000);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (handle.update as any)({
        _apiConfig: {
          primaryColor: "#7c3aed",
          textColor: "#ffffff",
          darkPrimaryColor: "#a78bfa",
          darkTextColor: "#ffffff",
          embedSettings: { teaser: { delay: 30000 } },
        },
      });

      // Would have fired at 3s under the default delay
      vi.advanceTimersByTime(10000);
      expect(document.querySelector(".perspective-float-teaser")).toBeFalsy();

      // Fires 30s after mount: 1s already elapsed + 29s remaining
      vi.advanceTimersByTime(19000);
      expect(document.querySelector(".perspective-float-teaser")).toBeTruthy();

      handle.unmount();
    });

    it("_apiConfigPending defers the teaser until the API config arrives, crediting the wait", () => {
      vi.useFakeTimers();

      const handle = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
        _apiConfigPending: true,
      });

      // Nothing fires while the config fetch is in flight — not even the
      // 3s default.
      vi.advanceTimersByTime(10000);
      expect(document.querySelector(".perspective-float-teaser")).toBeFalsy();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (handle.update as any)({
        _apiConfig: {
          primaryColor: "#7c3aed",
          textColor: "#ffffff",
          darkPrimaryColor: "#a78bfa",
          darkTextColor: "#ffffff",
          embedSettings: { teaser: { delay: 30000 } },
        },
      });

      // Fires 30s after mount: 10s already elapsed + 20s remaining
      vi.advanceTimersByTime(19000);
      expect(document.querySelector(".perspective-float-teaser")).toBeFalsy();

      vi.advanceTimersByTime(1000);
      expect(document.querySelector(".perspective-float-teaser")).toBeTruthy();

      handle.unmount();
    });

    it("a config resolving past the default delay shows the deferred teaser immediately", () => {
      vi.useFakeTimers();

      const handle = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
        _apiConfigPending: true,
      });

      // Config resolves at 5s with no teaser settings — the default 3s delay
      // has fully elapsed, so the teaser shows right away.
      vi.advanceTimersByTime(5000);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (handle.update as any)({
        _apiConfig: {
          primaryColor: "#7c3aed",
          textColor: "#ffffff",
          darkPrimaryColor: "#a78bfa",
          darkTextColor: "#ffffff",
        },
      });

      vi.advanceTimersByTime(0);
      expect(document.querySelector(".perspective-float-teaser")).toBeTruthy();

      handle.unmount();
    });

    it("a second delay change credits elapsed time from the first arm, not the last reschedule", () => {
      vi.useFakeTimers();

      const handle = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
      });

      // First reschedule at 1s (default 3s -> 30s)
      vi.advanceTimersByTime(1000);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (handle.update as any)({
        _apiConfig: {
          primaryColor: "#7c3aed",
          textColor: "#ffffff",
          darkPrimaryColor: "#a78bfa",
          darkTextColor: "#ffffff",
          embedSettings: { teaser: { delay: 30000 } },
        },
      });

      // Second reschedule at 2s (30s -> 10s): must fire 10s after mount,
      // i.e. 8s from now — not 10s from this reschedule.
      vi.advanceTimersByTime(1000);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (handle.update as any)({
        _apiConfig: {
          primaryColor: "#7c3aed",
          textColor: "#ffffff",
          darkPrimaryColor: "#a78bfa",
          darkTextColor: "#ffffff",
          embedSettings: { teaser: { delay: 10000 } },
        },
      });

      vi.advanceTimersByTime(7000);
      expect(document.querySelector(".perspective-float-teaser")).toBeFalsy();

      vi.advanceTimersByTime(1000);
      expect(document.querySelector(".perspective-float-teaser")).toBeTruthy();

      handle.unmount();
    });

    it("re-enabling the teaser measures the delay from the re-enable, not the original arm", () => {
      vi.useFakeTimers();

      const handle = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
      });

      // Disable at 1s, re-enable at 2s with a 5s delay
      vi.advanceTimersByTime(1000);
      handle.update({ teaser: { enabled: false } });
      vi.advanceTimersByTime(1000);
      handle.update({ teaser: { enabled: true, delay: 5000 } });

      // 5s measured from the re-enable: nothing at +4s, teaser at +5s
      vi.advanceTimersByTime(4000);
      expect(document.querySelector(".perspective-float-teaser")).toBeFalsy();

      vi.advanceTimersByTime(1000);
      expect(document.querySelector(".perspective-float-teaser")).toBeTruthy();

      handle.unmount();
    });

    it("an _apiConfig refresh with an unchanged delay does not reset a visible teaser", () => {
      vi.useFakeTimers();

      const handle = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
        teaser: { delay: 1000 },
      });

      vi.advanceTimersByTime(2000);
      expect(document.querySelector(".perspective-float-teaser")).toBeTruthy();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (handle.update as any)({
        _apiConfig: {
          primaryColor: "#7c3aed",
          textColor: "#ffffff",
          darkPrimaryColor: "#a78bfa",
          darkTextColor: "#ffffff",
          embedSettings: { teaser: { delay: 1000 } },
        },
      });

      expect(document.querySelector(".perspective-float-teaser")).toBeTruthy();
      expect(
        document.querySelectorAll(".perspective-float-teaser")
      ).toHaveLength(1);

      handle.unmount();
    });

    it("a delay change after the teaser has shown does not re-arm it", () => {
      vi.useFakeTimers();

      const handle = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
        teaser: { delay: 1000 },
      });

      vi.advanceTimersByTime(2000);
      expect(document.querySelector(".perspective-float-teaser")).toBeTruthy();

      // Open (dismisses the teaser), then close — a late config refresh with
      // a different delay must not bring the teaser back.
      handle.open();
      handle.close();
      expect(document.querySelector(".perspective-float-teaser")).toBeFalsy();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (handle.update as any)({
        _apiConfig: {
          primaryColor: "#7c3aed",
          textColor: "#ffffff",
          darkPrimaryColor: "#a78bfa",
          darkTextColor: "#ffffff",
          embedSettings: { teaser: { delay: 5000 } },
        },
      });

      vi.advanceTimersByTime(10000);
      expect(document.querySelector(".perspective-float-teaser")).toBeFalsy();

      handle.unmount();
    });
  });

  describe("teaser dismiss", () => {
    it("dismiss button removes the teaser and dot without opening the chat", () => {
      vi.useFakeTimers();

      const handle = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
      });

      vi.advanceTimersByTime(3000);
      expect(document.querySelector(".perspective-float-teaser")).toBeTruthy();

      const dismissBtn = document.querySelector(
        ".perspective-float-teaser-dismiss"
      ) as HTMLButtonElement;
      expect(dismissBtn).toBeTruthy();
      expect(dismissBtn.getAttribute("aria-label")).toBe("Dismiss message");

      dismissBtn.click();

      expect(document.querySelector(".perspective-float-teaser")).toBeFalsy();
      expect(
        document.querySelector(".perspective-float-notification-dot")
      ).toBeFalsy();
      // Dismissing is not engaging — the chat must stay closed.
      expect(handle.isOpen).toBe(false);
      expect(document.querySelector(".perspective-float-window")).toBeFalsy();

      handle.unmount();
    });

    it("teaser.dismissible=false hides the dismiss button", () => {
      vi.useFakeTimers();

      const handle = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
        teaser: { dismissible: false },
      });

      vi.advanceTimersByTime(3000);
      expect(document.querySelector(".perspective-float-teaser")).toBeTruthy();
      expect(
        document.querySelector(".perspective-float-teaser-dismiss")
      ).toBeFalsy();

      handle.unmount();
    });

    it("a dismissal is not re-armed by a later config update", () => {
      vi.useFakeTimers();

      const handle = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
        teaser: { delay: 1000 },
      });

      vi.advanceTimersByTime(1000);
      (
        document.querySelector(
          ".perspective-float-teaser-dismiss"
        ) as HTMLButtonElement
      ).click();

      // A config refresh with a different delay would normally reschedule
      // the sequence — after a dismissal it must stay quiet.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (handle.update as any)({
        _apiConfig: {
          primaryColor: "#7c3aed",
          textColor: "#ffffff",
          darkPrimaryColor: "#a78bfa",
          darkTextColor: "#ffffff",
          embedSettings: { teaser: { delay: 5000 } },
        },
      });

      vi.advanceTimersByTime(10000);
      expect(document.querySelector(".perspective-float-teaser")).toBeFalsy();

      handle.unmount();
    });

    it("a dismissal persists across mounts in the same session (no teaser, no chime)", () => {
      vi.useFakeTimers();
      const audioCtxCtor = vi.fn(() => createFakeAudioContext());
      vi.stubGlobal("AudioContext", audioCtxCtor);

      const first = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
      });

      vi.advanceTimersByTime(3000);
      (
        document.querySelector(
          ".perspective-float-teaser-dismiss"
        ) as HTMLButtonElement
      ).click();
      first.unmount();
      audioCtxCtor.mockClear();

      // Simulates a page navigation: a fresh mount in the same session.
      const second = createFloatBubble({
        researchId: "test-research-id",
        welcomeMessage: "Hello!",
      });

      vi.advanceTimersByTime(10000);
      expect(document.querySelector(".perspective-float-teaser")).toBeFalsy();
      expect(
        document.querySelector(".perspective-float-notification-dot")
      ).toBeFalsy();
      expect(audioCtxCtor).not.toHaveBeenCalled();

      second.unmount();
      vi.unstubAllGlobals();
    });

    it("a dismissal is scoped to the researchId", () => {
      vi.useFakeTimers();

      const first = createFloatBubble({
        researchId: "research-a",
        welcomeMessage: "Hello!",
      });

      vi.advanceTimersByTime(3000);
      (
        document.querySelector(
          ".perspective-float-teaser-dismiss"
        ) as HTMLButtonElement
      ).click();
      first.unmount();

      const second = createFloatBubble({
        researchId: "research-b",
        welcomeMessage: "Hello!",
      });

      vi.advanceTimersByTime(3000);
      expect(document.querySelector(".perspective-float-teaser")).toBeTruthy();

      second.unmount();
    });
  });

  describe("launcher config", () => {
    afterEach(() => {
      document.body.innerHTML = "";
    });

    it("icon defaults to channel-based SVG when launcher is omitted", () => {
      const handle = createFloatBubble({
        researchId: "test-research-id",
        channel: "TEXT",
      });

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      expect(bubble.innerHTML).toContain("lucide-messages-square");

      handle.unmount();
    });

    it("icon 'default' uses channel-based SVG", () => {
      const handle = createFloatBubble({
        researchId: "test-research-id",
        channel: "VOICE",
        launcher: { icon: "default" },
      });

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      expect(bubble.innerHTML).not.toContain("lucide-messages-square");
      expect(bubble.querySelector("svg")).toBeTruthy();

      handle.unmount();
    });

    it("icon 'avatar' renders <img> when avatarUrl is available", () => {
      const handle = createFloatBubble({
        researchId: "test-research-id",
        launcher: { icon: "avatar" },
        _apiConfig: {
          primaryColor: "#7c3aed",
          textColor: "#ffffff",
          darkPrimaryColor: "#a78bfa",
          darkTextColor: "#ffffff",
          avatarUrl: "https://example.com/avatar.png",
        },
      } as any);

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      const img = bubble.querySelector("img");
      expect(img).toBeTruthy();
      expect(img!.src).toBe("https://example.com/avatar.png");
      expect(img!.style.width).toBe("100%");
      expect(img!.style.height).toBe("100%");
      expect(img!.style.objectFit).toBe("cover");
      expect(img!.style.borderRadius).toBe("inherit");

      handle.unmount();
    });

    it("icon 'avatar' falls back to default SVG when no avatarUrl", () => {
      const handle = createFloatBubble({
        researchId: "test-research-id",
        launcher: { icon: "avatar" },
        _apiConfig: {
          primaryColor: "#7c3aed",
          textColor: "#ffffff",
          darkPrimaryColor: "#a78bfa",
          darkTextColor: "#ffffff",
          avatarUrl: null,
        },
      } as any);

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      expect(bubble.querySelector("img")).toBeFalsy();
      expect(bubble.querySelector("svg")).toBeTruthy();

      handle.unmount();
    });

    it("icon { url } renders <img> with that URL", () => {
      const handle = createFloatBubble({
        researchId: "test-research-id",
        launcher: { icon: { url: "https://example.com/custom-icon.png" } },
      });

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      const img = bubble.querySelector("img");
      expect(img).toBeTruthy();
      expect(img!.src).toBe("https://example.com/custom-icon.png");

      handle.unmount();
    });

    it("icon { url } falls back to default SVG on image error", () => {
      const handle = createFloatBubble({
        researchId: "test-research-id",
        channel: "TEXT",
        launcher: { icon: { url: "https://example.com/broken.png" } },
      });

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      const img = bubble.querySelector("img");
      expect(img).toBeTruthy();

      // Simulate image load error
      img!.dispatchEvent(new Event("error"));

      expect(bubble.querySelector("img")).toBeFalsy();
      expect(bubble.innerHTML).toContain("lucide-messages-square");

      handle.unmount();
    });

    it("icon { svg } sets innerHTML to the SVG string", () => {
      const customSvg =
        '<svg class="custom-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>';
      const handle = createFloatBubble({
        researchId: "test-research-id",
        launcher: { icon: { svg: customSvg } },
      });

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      expect(bubble.innerHTML).toContain("custom-icon");
      expect(bubble.querySelector("svg.custom-icon")).toBeTruthy();

      handle.unmount();
    });

    it("style overrides are applied to bubble element", () => {
      const handle = createFloatBubble({
        researchId: "test-research-id",
        launcher: {
          style: {
            width: "64px",
            height: "64px",
            borderRadius: "12px",
            bottom: "40px",
            right: "40px",
          },
        },
      });

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      expect(bubble.style.width).toBe("64px");
      expect(bubble.style.height).toBe("64px");
      expect(bubble.style.borderRadius).toBe("12px");
      expect(bubble.style.bottom).toBe("40px");
      expect(bubble.style.right).toBe("40px");

      handle.unmount();
    });

    it("style backgroundColor overrides brand primary", () => {
      const handle = createFloatBubble({
        researchId: "test-research-id",
        brand: { light: { primary: "#ff0000" } },
        launcher: {
          style: { backgroundColor: "#00ff00" },
        },
      });

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      expect(bubble.style.backgroundColor).toBe("#00ff00");

      handle.unmount();
    });

    it("sets a readable icon color for a light brand.primary", () => {
      const handle = createFloatBubble({
        researchId: "test-research-id",
        brand: { light: { primary: "#ffe066" } }, // light yellow
      });

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      // Icon is currentColor; on a light bg it must be dark, not the default white
      expect(bubble.style.color).toBe("#000000");

      handle.unmount();
    });

    it("keeps white icon color for a dark brand.primary", () => {
      const handle = createFloatBubble({
        researchId: "test-research-id",
        brand: { light: { primary: "#7c3aed" } }, // brand purple
      });

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      expect(bubble.style.color).toBe("#ffffff");

      handle.unmount();
    });

    it("className is added to bubble classList", () => {
      const handle = createFloatBubble({
        researchId: "test-research-id",
        launcher: { className: "my-custom-class another-class" },
      });

      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      expect(bubble.classList.contains("my-custom-class")).toBe(true);
      expect(bubble.classList.contains("another-class")).toBe(true);
      // Existing classes preserved
      expect(bubble.classList.contains("perspective-float-bubble")).toBe(true);

      handle.unmount();
    });

    it("icon reverts to custom icon on close (not default SVG)", () => {
      const handle = createFloatBubble({
        researchId: "test-research-id",
        launcher: { icon: { url: "https://example.com/icon.png" } },
      });

      handle.open();
      const bubble = document.querySelector(
        ".perspective-float-bubble"
      ) as HTMLButtonElement;
      // While open, shows close icon
      expect(bubble.innerHTML).toContain("lucide-x");

      handle.close();
      // After close, reverts to custom icon (not default SVG)
      expect(bubble.querySelector("img")).toBeTruthy();
      expect(bubble.querySelector("img")!.src).toBe(
        "https://example.com/icon.png"
      );

      handle.unmount();
    });
  });
});

describe("createChatBubble", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("is alias for createFloatBubble", () => {
    expect(createChatBubble).toBe(createFloatBubble);
  });

  it("creates float bubble", () => {
    const handle = createChatBubble({
      researchId: "test-research-id",
    });

    expect(handle.type).toBe("float");
    expect(document.querySelector(".perspective-float-bubble")).toBeTruthy();

    handle.unmount();
  });
});
