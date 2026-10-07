import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { DiscoveryMetadata } from "./DiscoveryMetadata";

describe("DiscoveryMetadata", () => {
  it("renders nothing", () => {
    expect(renderToStaticMarkup(createElement(DiscoveryMetadata))).toBe("");
    expect(
      renderToStaticMarkup(
        createElement(DiscoveryMetadata, { version: "99.0.0" })
      )
    ).toBe("");
  });
});
