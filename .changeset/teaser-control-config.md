---
"@perspective-ai/sdk": minor
"@perspective-ai/sdk-react": minor
---

Add `teaser` config to control the float welcome teaser: `enabled` turns the whole welcome sequence (teaser bubble, chime, notification dot) on or off, `delay` sets when the teaser appears (ms, default 3000), and `sound` mutes the chime. Available programmatically (`createFloatBubble`, `FloatBubble`, `useFloatBubble`), via data attributes (`data-perspective-teaser`, `data-perspective-teaser-delay`, `data-perspective-teaser-sound`), and via API `embedSettings.teaser` (which takes precedence). Disabling the teaser through `update()` or late-arriving API config cancels a pending or visible teaser.
