---
"@perspective-ai/sdk": minor
"@perspective-ai/sdk-react": minor
---

feat: add embed auth for cross-origin iframe authentication

- Popup auth flow: SDK handles `perspective:auth-request` from iframe, opens OAuth popup, relays token back via `perspective:auth-complete`
- Two-layer token caching: parent localStorage (Layer 2) persists auth across tab close on Safari where iframe localStorage is ephemeral
- Popup-blocked fallback: falls back to new tab when popup is blocked by browser
- Feature negotiation: `FEATURES.EMBED_AUTH` bitmask in `perspective:init` handshake for graceful degradation with old SDK versions
- Fix base64url JWT decode (replace `-`/`_` with `+`/`/` before `atob`)
- New `onAuth` callback in `EmbedConfig` for custom token handling
