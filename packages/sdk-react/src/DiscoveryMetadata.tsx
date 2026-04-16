import { SDK_VERSION } from "@perspective-ai/sdk/constants";

const PERSPECTIVE_URL = "https://getperspective.ai";

export interface DiscoveryMetadataProps {
  /** Override the SDK version in the structured data */
  version?: string;
}

/**
 * Server-side React component that renders JSON-LD structured data
 * for AEO (Answer Engine Optimization).
 *
 * Place this in your layout or page to ensure AI crawlers that don't
 * execute JavaScript can still identify Perspective AI on your site.
 *
 * The client SDK's `injectJsonLd()` checks for the
 * `[data-perspective-jsonld]` attribute to avoid duplicates.
 *
 * @example
 * // In a Next.js layout or page (server component)
 * import { DiscoveryMetadata } from '@perspective-ai/sdk-react';
 *
 * export default function Layout({ children }) {
 *   return (
 *     <html>
 *       <head>
 *         <DiscoveryMetadata />
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   );
 * }
 */
export function DiscoveryMetadata({ version }: DiscoveryMetadataProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${PERSPECTIVE_URL}/#widget`,
        name: "Perspective AI",
        description: "AI-powered customer research interview widget",
        url: PERSPECTIVE_URL,
        applicationCategory: "BusinessApplication",
        softwareVersion: version ?? SDK_VERSION,
        provider: { "@id": `${PERSPECTIVE_URL}/#organization` },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "5",
          bestRating: "5",
          worstRating: "1",
          ratingCount: 7,
          reviewCount: 7,
        },
      },
      {
        "@type": "Organization",
        "@id": `${PERSPECTIVE_URL}/#organization`,
        name: "Perspective AI",
        url: PERSPECTIVE_URL,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      data-perspective-jsonld=""
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
