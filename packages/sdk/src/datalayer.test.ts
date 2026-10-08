/**
 * dataLayer / GTM event bridge.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  autoInit,
  configure,
  createWidget,
  destroyAll,
  init,
  mount,
} from "./browser";
import { MESSAGE_TYPES } from "./constants";
import type { FloatHandle } from "./types";

type DataLayerEvent = {
  event: string;
  perspective_research_id: string;
  perspective_embed_type: string;
};

function events(): DataLayerEvent[] {
  return (window.dataLayer ?? []) as DataLayerEvent[];
}

function postFromIframe(
  iframe: HTMLIFrameElement,
  type: string,
  researchId: string
): void {
  window.dispatchEvent(
    new MessageEvent("message", {
      data: { type, researchId },
      origin: "https://getperspective.ai",
      source: iframe.contentWindow,
    })
  );
}

describe("dataLayer", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    sessionStorage.clear();
    delete window.dataLayer;
    delete (window as Window & { myLayer?: unknown[] }).myLayer;
    configure({
      dataLayer: undefined,
      dataLayerName: undefined,
      observe: false,
      host: undefined,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          primaryColor: "#7c3aed",
          textColor: "#ffffff",
          darkPrimaryColor: "#a78bfa",
          darkTextColor: "#ffffff",
          allowedChannels: null,
          welcomeMessage: "",
          avatarUrl: null,
        }),
      })
    );
  });

  afterEach(() => {
    destroyAll();
    configure({
      dataLayer: undefined,
      dataLayerName: undefined,
      observe: false,
      host: undefined,
    });
    delete window.dataLayer;
    delete (window as Window & { myLayer?: unknown[] }).myLayer;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("pushes open, ready, conversation start, completion, and close", () => {
    window.dataLayer = [];
    const container = document.createElement("div");
    document.body.appendChild(container);
    const handle = mount(container, { researchId: "research-1" });

    expect(events()).toEqual([
      {
        event: "perspective_widget_open",
        perspective_research_id: "research-1",
        perspective_embed_type: "widget",
      },
    ]);

    const iframe = container.querySelector("iframe");
    expect(iframe).toBeTruthy();
    postFromIframe(iframe!, MESSAGE_TYPES.ready, "research-1");
    postFromIframe(iframe!, MESSAGE_TYPES.conversationStart, "research-1");
    postFromIframe(iframe!, MESSAGE_TYPES.submit, "research-1");
    postFromIframe(iframe!, MESSAGE_TYPES.close, "research-1");

    expect(events().map((entry) => entry.event)).toEqual([
      "perspective_widget_open",
      "perspective_widget_ready",
      "perspective_conversation_started",
      "perspective_conversation_completed",
      "perspective_widget_close",
    ]);
    expect(events()[2]).toMatchObject({
      perspective_research_id: "research-1",
      perspective_embed_type: "widget",
    });

    handle.destroy();
    expect(
      events().filter((entry) => entry.event === "perspective_widget_close")
    ).toHaveLength(1);
  });

  it("emits close when a widget is destroyed", () => {
    window.dataLayer = [];
    const container = document.createElement("div");
    document.body.appendChild(container);
    const handle = mount(container, { researchId: "research-destroy" });
    handle.destroy();

    expect(events().map((entry) => entry.event)).toEqual([
      "perspective_widget_open",
      "perspective_widget_close",
    ]);
    expect(events()[1]).toMatchObject({
      perspective_research_id: "research-destroy",
      perspective_embed_type: "widget",
    });
  });

  it("emits close when a fullpage embed is destroyed", () => {
    window.dataLayer = [];
    const handle = init({
      researchId: "research-fullpage",
      type: "fullpage",
    });
    handle.destroy();

    expect(events()).toEqual([
      {
        event: "perspective_widget_open",
        perspective_research_id: "research-fullpage",
        perspective_embed_type: "fullpage",
      },
      {
        event: "perspective_widget_close",
        perspective_research_id: "research-fullpage",
        perspective_embed_type: "fullpage",
      },
    ]);
  });

  it("emits one close when a fullpage iframe closes and the handle is destroyed", () => {
    window.dataLayer = [];
    const handle = init({
      researchId: "research-fullpage-msg",
      type: "fullpage",
    });
    const iframe = document.querySelector(
      ".perspective-fullpage iframe"
    ) as HTMLIFrameElement;
    postFromIframe(iframe, MESSAGE_TYPES.close, "research-fullpage-msg");
    handle.destroy();

    expect(events().map((entry) => entry.event)).toEqual([
      "perspective_widget_open",
      "perspective_widget_close",
    ]);
  });

  it("counts close once per widget, even when two share a research id", () => {
    window.dataLayer = [];
    const slotA = document.createElement("div");
    const slotB = document.createElement("div");
    document.body.append(slotA, slotB);
    const a = createWidget(slotA, { researchId: "shared" });
    const b = createWidget(slotB, { researchId: "shared" });

    postFromIframe(a.iframe!, MESSAGE_TYPES.close, "shared");
    a.destroy();
    b.destroy();

    expect(events().map((entry) => entry.event)).toEqual([
      "perspective_widget_open",
      "perspective_widget_open",
      "perspective_widget_close",
      "perspective_widget_close",
    ]);
  });

  it("emits close then open when a widget remounts after its container leaves the DOM", () => {
    window.dataLayer = [];
    const first = document.createElement("div");
    first.setAttribute("data-perspective-widget", "spa-widget");
    document.body.appendChild(first);
    autoInit();

    first.remove();
    const second = document.createElement("div");
    second.setAttribute("data-perspective-widget", "spa-widget");
    document.body.appendChild(second);
    autoInit();

    expect(events().map((entry) => entry.event)).toEqual([
      "perspective_widget_open",
      "perspective_widget_close",
      "perspective_widget_open",
    ]);
    expect(
      events().every((entry) => entry.perspective_research_id === "spa-widget")
    ).toBe(true);
  });

  it("does not create window.dataLayer when it is missing", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    mount(container, { researchId: "research-missing" });
    expect(window.dataLayer).toBeUndefined();
  });

  it("creates the array only when dataLayer is explicitly enabled", () => {
    configure({ dataLayer: true });
    const container = document.createElement("div");
    document.body.appendChild(container);
    mount(container, { researchId: "research-enabled" });
    expect(events()).toEqual([
      {
        event: "perspective_widget_open",
        perspective_research_id: "research-enabled",
        perspective_embed_type: "widget",
      },
    ]);
  });

  it("pushes to configure({ dataLayerName }) when that array exists", () => {
    const custom = window as Window & { myLayer?: DataLayerEvent[] };
    custom.myLayer = [];
    configure({ dataLayerName: "myLayer" });
    const container = document.createElement("div");
    document.body.appendChild(container);
    mount(container, { researchId: "research-named" });

    expect(custom.myLayer).toEqual([
      {
        event: "perspective_widget_open",
        perspective_research_id: "research-named",
        perspective_embed_type: "widget",
      },
    ]);
    expect(window.dataLayer).toBeUndefined();
  });

  it("opts out via configure({ dataLayer: false })", () => {
    window.dataLayer = [];
    configure({ dataLayer: false });
    const container = document.createElement("div");
    document.body.appendChild(container);
    const handle = mount(container, { researchId: "research-off" });
    const iframe = container.querySelector("iframe")!;
    postFromIframe(iframe, MESSAGE_TYPES.ready, "research-off");
    postFromIframe(iframe, MESSAGE_TYPES.conversationStart, "research-off");
    postFromIframe(iframe, MESSAGE_TYPES.submit, "research-off");
    expect(events()).toEqual([]);
    handle.destroy();
  });

  it("opts one embed out via data-perspective-datalayer", () => {
    window.dataLayer = [];
    document.body.innerHTML = `
      <div data-perspective-widget="opt-out" data-perspective-datalayer="false"></div>
      <div data-perspective-widget="opt-in"></div>
    `;
    autoInit();

    expect(events()).toEqual([
      {
        event: "perspective_widget_open",
        perspective_research_id: "opt-in",
        perspective_embed_type: "widget",
      },
    ]);

    const optedOut = document.querySelector(
      "[data-perspective-widget='opt-out'] iframe"
    ) as HTMLIFrameElement;
    postFromIframe(optedOut, MESSAGE_TYPES.conversationStart, "opt-out");
    postFromIframe(optedOut, MESSAGE_TYPES.submit, "opt-out");
    expect(events()).toHaveLength(1);
  });

  it("emits float open and close when the window opens and closes", () => {
    window.dataLayer = [];
    const handle = init({
      researchId: "research-float",
      type: "float",
    }) as FloatHandle;
    expect(events()).toEqual([]);

    handle.open();
    expect(events().map((entry) => entry.event)).toEqual([
      "perspective_widget_open",
    ]);
    expect(events()[0]?.perspective_embed_type).toBe("float");

    handle.close();
    expect(events().map((entry) => entry.event)).toEqual([
      "perspective_widget_open",
      "perspective_widget_close",
    ]);

    handle.open();
    const iframe = document.querySelector(
      ".perspective-float-window iframe"
    ) as HTMLIFrameElement;
    postFromIframe(iframe, MESSAGE_TYPES.close, "research-float");
    const closes = events().filter(
      (entry) => entry.event === "perspective_widget_close"
    );
    expect(closes).toHaveLength(2);
  });
});
