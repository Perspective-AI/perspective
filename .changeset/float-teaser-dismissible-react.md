---
"@perspective-ai/sdk-react": patch
"@perspective-ai/sdk": patch
---

Forward the `teaser.dismissible` option through `FloatBubble` / `useFloatBubble` to the core SDK. The hook that stabilizes the teaser prop only carried `enabled`, `delay`, and `sound`, so it silently dropped `dismissible` — setting `teaser={{ dismissible: false }}` had no effect when using the React package (the × dismiss button still rendered). It is now forwarded alongside the other teaser fields.

Also corrects the `EmbedConfig.teaser` JSDoc to list `dismissible` among the fields it controls. The vanilla config, CDN `data-perspective-teaser-dismissible` attribute, and core resolution already handled `dismissible` correctly; only the React wrapper was dropping it.
