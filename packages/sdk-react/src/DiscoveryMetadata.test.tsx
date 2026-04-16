import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { DiscoveryMetadata } from "./DiscoveryMetadata";
import { SDK_VERSION } from "@perspective-ai/sdk/constants";

describe("DiscoveryMetadata", () => {
  it("renders JSON-LD script tag with correct structured data", () => {
    const html = renderToStaticMarkup(createElement(DiscoveryMetadata));

    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain("data-perspective-jsonld");

    const match = html.match(/>(.+?)<\/script>/);
    expect(match?.[1]).toBeTruthy();
    const data = JSON.parse(match![1]!);

    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@graph"]).toHaveLength(2);
    expect(data["@graph"][0]["@type"]).toBe("SoftwareApplication");
    expect(data["@graph"][0].name).toBe("Perspective AI");
    expect(data["@graph"][0].softwareVersion).toBe(SDK_VERSION);
    expect(data["@graph"][0].aggregateRating.ratingValue).toBe("5");
    expect(data["@graph"][0].aggregateRating.worstRating).toBe("1");
    expect(data["@graph"][0].aggregateRating.ratingCount).toBe(7);
    expect(data["@graph"][1]["@type"]).toBe("Organization");
  });

  it("accepts optional version override", () => {
    const html = renderToStaticMarkup(
      createElement(DiscoveryMetadata, { version: "99.0.0" })
    );

    const match = html.match(/>(.+?)<\/script>/);
    const data = JSON.parse(match![1]!);
    expect(data["@graph"][0].softwareVersion).toBe("99.0.0");
  });
});
