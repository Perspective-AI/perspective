---
"@perspective-ai/sdk": patch
---

fix: clear NextAuth session on signout via hidden popup

When a user signs out inside the iframe, open a hidden popup to the first-party domain's `/embed-auth/signout` endpoint to clear the NextAuth session cookie. Without this, the persisted session causes silent re-authentication on next visit.
