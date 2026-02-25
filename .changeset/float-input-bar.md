---
"@perspective-ai/sdk": minor
"@perspective-ai/sdk-react": minor
---

feat: replace float bubble with input bar UX

Replace the circular floating action button with a pill-shaped input bar that supports a multi-phase engagement sequence: bar appears, sound chime plays, teaser message with typewriter effect, and optional auto-open dialog. The input bar is functional — users can type and submit text that becomes the first message in the chat.

New configuration options via `FloatSequenceConfig`:
- `icon`: bar icon type (chat/mic/keyboard)
- `teaserText`: teaser message shown above the bar
- `placeholder`: input placeholder text
- `soundDelay`: seconds before chime plays
- `teaserDelay`: seconds before teaser appears
- `autoOpenDelay`: seconds before auto-opening dialog
- `typingSpeed`: typewriter speed for teaser
