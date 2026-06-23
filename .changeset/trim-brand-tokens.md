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
