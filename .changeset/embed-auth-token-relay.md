---
"@perspective-ai/sdk": patch
"@perspective-ai/sdk-react": patch
---

feat: add embed auth token relay for cross-origin authentication

Adds postMessage-based authentication flow for embedded interviews in cross-origin iframes where third-party cookies are blocked. The SDK now handles `perspective:auth-request` from the iframe (opens auth window), relays tokens via `perspective:auth-complete`, caches tokens in parent localStorage, and clears them on `perspective:auth-signout`. New `onAuth` callback in `EmbedConfig` for custom token handling.
