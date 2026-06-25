---
"@perspective-ai/sdk": minor
"@perspective-ai/sdk-react": minor
---

Widget: polished default appearance with a non-breaking, fully overridable
frame.

A bare inline widget (`<div data-perspective-widget>` / `<Widget />` with no
container sizing) now renders as a centered, framed card — border, rounded
corners, soft shadow, a comfortable height, and a sensible max-width — so it
looks finished with zero CSS. Previously it was an unstyled, full-bleed iframe
that looked awkward on wide pages.

Backward compatible: when the host has sized the container (a height, `flex`,
`height: 100%`, etc.), the widget keeps filling it edge to edge with no framing,
exactly as before.

New `frame` config object (also a `<Widget frame={…} />` prop) controls the
inline widget's layout and appearance:

- `layout: "card" | "fill"` — force a mode regardless of detection (`"fill"`
  restores the full-width behaviour; omit to auto-detect).
- `maxWidth`, `minHeight`, `radius`, `border`, `shadow`, `background` — each
  maps to a `--perspective-widget-*` CSS custom property the card reads, so the
  same knob is reachable from the `frame` object, a stylesheet, or inline
  `style`. Because the SDK only reads these vars, an override wins at any
  specificity and isn't clobbered by global resets.

Script-tag users get the same control declaratively via a packed
`data-perspective-frame` attribute, mirroring `data-perspective-brand`:
`data-perspective-frame="layout=fill,radius=4px,shadow=none,bg=#fff"`.
