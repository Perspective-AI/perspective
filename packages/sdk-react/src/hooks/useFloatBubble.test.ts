import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, cleanup, act, waitFor } from "@testing-library/react";
import { createElement } from "react";
import type { FloatHandle, ThemeValue } from "@perspective-ai/sdk";
import { useFloatBubble } from "./useFloatBubble";

type MockFloatHandle = FloatHandle & {
  open: ReturnType<typeof vi.fn<() => void>>;
  close: ReturnType<typeof vi.fn<() => void>>;
  unmount: ReturnType<typeof vi.fn<() => void>>;
  toggle: ReturnType<typeof vi.fn<() => void>>;
  destroy: ReturnType<typeof vi.fn<() => void>>;
  update: ReturnType<typeof vi.fn<FloatHandle["update"]>>;
};

function createMockHandle(): MockFloatHandle {
  let isOpen = false;
  const handle: MockFloatHandle = {
    open: vi.fn<() => void>(() => {
      isOpen = true;
    }),
    close: vi.fn<() => void>(() => {
      isOpen = false;
    }),
    unmount: vi.fn<() => void>(),
    toggle: vi.fn<() => void>(),
    destroy: vi.fn<() => void>(),
    update: vi.fn<FloatHandle["update"]>(),
    get isOpen() {
      return isOpen;
    },
    researchId: "test-research-id",
    type: "float",
    iframe: null,
    container: null,
  };

  return handle;
}

const createdHandles: MockFloatHandle[] = [];

vi.mock("@perspective-ai/sdk", () => ({
  createFloatBubble: vi.fn(),
  stableSerialize: vi.fn((value: unknown) => JSON.stringify(value)),
}));

vi.mock("./renderLauncherIcon", () => ({
  renderLauncherIconToSvg: vi.fn(
    async () => '<svg data-icon="test-launcher"></svg>'
  ),
}));

import { createFloatBubble } from "@perspective-ai/sdk";
import { renderLauncherIconToSvg } from "./renderLauncherIcon";
const mockCreateFloatBubble = vi.mocked(createFloatBubble);
const mockRenderLauncherIconToSvg = vi.mocked(renderLauncherIconToSvg);

describe("useFloatBubble", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createdHandles.length = 0;
    mockCreateFloatBubble.mockImplementation(() => {
      const handle = createMockHandle();
      createdHandles.push(handle);
      return handle;
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("creates bubble on mount and cleans up on unmount", () => {
    const { unmount } = renderHook(() =>
      useFloatBubble({ researchId: "test-research-id" })
    );

    expect(mockCreateFloatBubble).toHaveBeenCalledTimes(1);
    expect(mockCreateFloatBubble).toHaveBeenCalledWith(
      expect.objectContaining({ researchId: "test-research-id" })
    );

    unmount();

    expect(createdHandles[0]?.unmount).toHaveBeenCalledTimes(1);
  });

  it("returns expected interface", () => {
    const { result, unmount } = renderHook(() =>
      useFloatBubble({ researchId: "test-research-id" })
    );

    expect(result.current.open).toBeInstanceOf(Function);
    expect(result.current.close).toBeInstanceOf(Function);
    expect(result.current.toggle).toBeInstanceOf(Function);
    expect(result.current.unmount).toBeInstanceOf(Function);
    expect(result.current.handle).not.toBeNull();
    expect(typeof result.current.isOpen).toBe("boolean");

    unmount();
  });

  it("manual unmount clears handle and prevents double cleanup", () => {
    const { result, unmount } = renderHook(() =>
      useFloatBubble({ researchId: "test-research-id" })
    );

    expect(result.current.handle).not.toBeNull();

    act(() => {
      result.current.unmount();
    });

    expect(createdHandles[0]?.unmount).toHaveBeenCalledTimes(1);
    expect(result.current.handle).toBeNull();

    unmount();

    expect(createdHandles[0]?.unmount).toHaveBeenCalledTimes(1);
  });

  it("keeps controlled float bubble open when recreated while open", () => {
    const initialProps: { theme: ThemeValue; open: boolean } = {
      theme: "light",
      open: true,
    };

    const { rerender } = renderHook(
      ({ theme, open }: { theme: ThemeValue; open: boolean }) =>
        useFloatBubble({
          researchId: "test-research-id",
          theme,
          open,
        }),
      {
        initialProps,
      }
    );

    const firstHandle = createdHandles[0]!;
    expect(firstHandle.open).toHaveBeenCalledTimes(1);

    rerender({ theme: "dark", open: true });

    const secondHandle = createdHandles[1]!;
    expect(firstHandle.unmount).toHaveBeenCalledTimes(1);
    expect(secondHandle.open).toHaveBeenCalledTimes(1);
  });

  it("keeps uncontrolled float bubble open when recreated while open", () => {
    const initialProps: { theme: ThemeValue } = { theme: "light" };

    const { result, rerender } = renderHook(
      ({ theme }: { theme: ThemeValue }) =>
        useFloatBubble({
          researchId: "test-research-id",
          theme,
        }),
      {
        initialProps,
      }
    );

    const firstHandle = createdHandles[0]!;

    act(() => {
      result.current.open();
    });

    expect(firstHandle.open).toHaveBeenCalledTimes(1);

    rerender({ theme: "dark" });

    const secondHandle = createdHandles[1]!;
    expect(firstHandle.unmount).toHaveBeenCalledTimes(1);
    expect(secondHandle.open).toHaveBeenCalledTimes(1);
  });

  it("serializes React launcher icons to SVG markup", async () => {
    renderHook(() =>
      useFloatBubble({
        researchId: "test-research-id",
        launcher: {
          icon: createElement("svg", { "data-icon": "test-launcher" }),
        },
      })
    );

    await waitFor(() => {
      expect(mockRenderLauncherIconToSvg).toHaveBeenCalled();
      const latestCall =
        mockCreateFloatBubble.mock.calls[
          mockCreateFloatBubble.mock.calls.length - 1
        ];
      const launcher = latestCall?.[0].launcher;
      const svgMarkup =
        launcher &&
        typeof launcher.icon === "object" &&
        launcher.icon !== null &&
        "svg" in launcher.icon
          ? launcher.icon.svg
          : "";

      expect(svgMarkup).toContain('data-icon="test-launcher"');
    });
  });
});
