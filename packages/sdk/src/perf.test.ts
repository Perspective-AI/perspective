import { describe, it, expect, afterEach } from "vitest";
import { isPerfDebug } from "./perf";

describe("isPerfDebug", () => {
  afterEach(() => {
    localStorage.removeItem("perspective-perf-debug");
  });

  it("reflects a localStorage toggle after an initial disabled check", () => {
    localStorage.removeItem("perspective-perf-debug");

    expect(isPerfDebug()).toBe(false);

    localStorage.setItem("perspective-perf-debug", "1");

    expect(isPerfDebug()).toBe(true);
  });
});
