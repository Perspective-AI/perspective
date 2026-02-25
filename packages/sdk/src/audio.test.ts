import { describe, it, expect, beforeEach, vi } from "vitest";
import { playChime } from "./audio";

describe("playChime", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when AudioContext is not available", () => {
    const origAudioContext = window.AudioContext;
    // @ts-expect-error - Testing without AudioContext
    delete window.AudioContext;

    const result = playChime();
    expect(result).toBeNull();

    window.AudioContext = origAudioContext;
  });

  it("creates oscillators and returns AudioContext", () => {
    const mockOsc = {
      type: "sine",
      frequency: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn().mockReturnThis(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    const mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
    const mockCtx = {
      currentTime: 0,
      state: "running",
      resume: vi.fn(),
      destination: {},
      createOscillator: vi.fn(() => mockOsc),
      createGain: vi.fn(() => mockGain),
    };

    window.AudioContext = function () {
      return mockCtx;
    } as unknown as typeof AudioContext;

    const result = playChime();
    expect(result).toBe(mockCtx);
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);
    expect(mockCtx.createGain).toHaveBeenCalledTimes(2);
  });

  it("reuses provided AudioContext", () => {
    const mockOsc = {
      type: "sine",
      frequency: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn().mockReturnThis(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    const mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
    const existingCtx = {
      currentTime: 0,
      state: "running",
      resume: vi.fn(),
      destination: {},
      createOscillator: vi.fn(() => mockOsc),
      createGain: vi.fn(() => mockGain),
    };

    // @ts-expect-error - Partial mock
    const result = playChime(existingCtx);
    expect(result).toBe(existingCtx);
  });

  it("resumes suspended AudioContext", () => {
    const mockOsc = {
      type: "sine",
      frequency: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn().mockReturnThis(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    const mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
    const suspendedCtx = {
      currentTime: 0,
      state: "suspended",
      resume: vi.fn(),
      destination: {},
      createOscillator: vi.fn(() => mockOsc),
      createGain: vi.fn(() => mockGain),
    };

    // @ts-expect-error - Partial mock
    playChime(suspendedCtx);
    expect(suspendedCtx.resume).toHaveBeenCalled();
  });
});
