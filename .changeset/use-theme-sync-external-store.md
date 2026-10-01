---
"@perspective-ai/sdk-react": patch
---

`useThemeSync` now follows the system color scheme with `useSyncExternalStore`, so client-only renders return the user's theme on the first render instead of starting light and switching. Server and hydration renders still return `"light"`.
