---
"@perspective-ai/sdk": minor
"@perspective-ai/sdk-react": minor
---

Hide the loading skeleton on a new `perspective:visual-ready` signal emitted by the iframe before React hydrates, instead of waiting for the post-hydration `perspective:ready`. The skeleton now disappears hundreds of milliseconds earlier on cold loads — the embed feels noticeably snappier, closer to a chat widget like Intercom.

- New `MESSAGE_TYPES.visualReady` (`perspective:visual-ready`) constant exported alongside `ready`. The SDK listens for whichever arrives first and treats `ready` as a fallback for older iframe versions, so this is fully backwards compatible.
- New optional `onVisualReady` callback on `EmbedConfig` for consumers who want to react to the early visual-ready signal. `onReady` continues to fire once the iframe is fully interactive and is still the right hook for most consumers.
- Reduced the iframe fade-in / skeleton fade-out from 300ms to 150ms across `widget`, `popup`, `slider`, `fullpage`, and `float` — long fades made the embed feel slow even after content was ready.
