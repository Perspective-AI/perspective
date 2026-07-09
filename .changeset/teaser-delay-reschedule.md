---
"@perspective-ai/sdk": patch
---

Fix float teaser delay from dashboard embed settings being ignored: the welcome sequence armed at mount with the default 3s delay and was never rescheduled when the API config arrived with a custom `embedSettings.teaser.delay`. A delay change while the teaser is still pending now reschedules the timers, crediting the time already waited.
