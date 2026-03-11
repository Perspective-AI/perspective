import { describe, it, expect, afterEach } from "vitest";
import { STORAGE_KEYS } from "./constants";
import { getPersistedOpenState, setPersistedOpenState } from "./state";

describe("embed state persistence", () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it("returns null when no persisted state exists", () => {
    expect(
      getPersistedOpenState({ researchId: "test", type: "popup" })
    ).toBeNull();
  });

  it("stores and reads open state in sessionStorage", () => {
    setPersistedOpenState({
      researchId: "test",
      type: "slider",
      host: "https://custom.example.com/path",
      open: true,
    });

    expect(
      getPersistedOpenState({
        researchId: "test",
        type: "slider",
        host: "https://custom.example.com",
      })
    ).toBe(true);
  });

  it("returns null for malformed persisted state", () => {
    sessionStorage.setItem(
      `${STORAGE_KEYS.embedState}:https://getperspective.ai:popup:test`,
      "{not-json"
    );

    expect(
      getPersistedOpenState({ researchId: "test", type: "popup" })
    ).toBeNull();
  });
});
