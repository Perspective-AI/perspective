---
"@perspective-ai/sdk": minor
"@perspective-ai/sdk-react": minor
---

Trim brand color overrides to `primary` + `bg` only

The interview app no longer honors the `secondary` and `text` brand overrides and has rescoped `bg`, so the SDK no longer advertises or forwards them.

- **`BrandColors`** now centers on `primary` and `bg`. The SDK no longer forwards `secondary` or `text` to the iframe.
  - `primary` themes buttons, the progress bar, links, the mic, and focus rings.
  - `bg` paints the interview background behind the card, shown only when no background scene is set.
  - `secondary` and `text` remain on the type as `@deprecated` no-ops so existing TypeScript consumers don't break; they're ignored at runtime.

This is non-breaking: the app gracefully ignores unknown `brand.*` params and already-deployed embeds keep working. Passing `secondary`/`text` is simply a no-op going forward.

Also: SDK chrome that paints a brand color now derives a contrasting foreground from that color's WCAG luminance, so light brand colors no longer produce unreadable white-on-light content. This applies to the popup/slider **trigger button** text, the **float launcher** icon (both previously hard-coded to white), and the **loading skeleton** shimmer/border palette (now chosen from the actual `brand.bg` luminance rather than the theme, so a dark `brand.bg` under a light theme still shows visible shimmer). Each falls back to the previous behavior when the color isn't a parseable hex.
