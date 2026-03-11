---
"@perspective-ai/sdk": patch
"@perspective-ai/sdk-react": patch
---

Persist popup, slider, and float open state within the current browser
session. The SDK now restores shell state after reloads and React remounts
while keeping explicit closes separate from teardown.
