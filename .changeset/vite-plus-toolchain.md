---
"@perspective-ai/sdk": patch
"@perspective-ai/sdk-react": patch
---

Build the packages with Vite+ (tsdown/Rolldown) instead of tsup. Exports, file names, and the CDN bundle (`dist/cdn/perspective.global.js`) are unchanged. `@perspective-ai/sdk-react` now keeps its `"use client"` directive in the published build, `@perspective-ai/sdk`'s main entry imports its constants from `./constants.js` instead of inlining a copy, and both packages ship declaration maps.
