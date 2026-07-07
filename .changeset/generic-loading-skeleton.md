---
"@perspective-ai/sdk": minor
---

Replace the loading skeleton with the interview's real chrome.

Instead of a skeleton that mirrors the interview UI's internal layout (welcome
card, message, input pill) — which drifts whenever that UI changes — the
loading state now renders what the interview actually looks like from the
outside in:

- the research's **scene image** (fetched from
  `{host}/interview/{researchId}/scene-image`) behind
- a **frosted translucent card** (55% panel + backdrop blur, matching the
  app's card treatment), with
- a **circular loader** centered in the card (40px) — a conic-gradient arc
  with a fading tail over a faint track, tinted with the brand primary
  resolved with the SDK's usual precedence: local `brand.primary` override →
  API embed config (`primaryColor` / `darkPrimaryColor`) → Perspective
  default (`#7c3aed` / `#a78bfa`). As essential loading motion it is not
  disabled by `prefers-reduced-motion`.

The scene image is applied only after it has actually loaded, layered over
the app's default surface color (`#f5f2f0` light, `#15171e` dark, or a custom
`brand.bg`) — so a research without a scene (404), a slow network, or a
blocked request cleanly degrades to a solid color.

Because the loading state renders in the host page DOM (an overlay sibling of
the cross-origin iframe), responsiveness is driven by CSS **container
queries** on the slot the consumer provides — not viewport media queries. The
card's sizing mirrors the interview app's own container queries (full-bleed
below 672px width; a centered `max-width: 672px` box above it, with vertical
padding stepping 4px → 48px → 80px at the app's 448px/768px container-height
breakpoints), so the card doesn't jump at handoff. Breakpoints are in px, not
the app's rem: the overlay lives in the host page, so rem would resolve against
the host's (uncontrolled) root font-size, whereas the card must match the
iframe's fixed pixels.

`LoadingOptions` gains optional `researchId` and `host` (used for the scene
URL) and `apiConfig` (used for the loader tint); all embed types pass them
automatically.

A new `prefetchSceneImage(researchId, host?)` export warms the scene image on
intent signals — the SDK wires it to float-bubble hover/focus and to
`data-perspective-popup`/`-slider` trigger elements — so deferred embeds open
with the scene already cached.
