---
"@perspective-ai/sdk": patch
---

Fix float teaser delay from dashboard embed settings being ignored. Script-tag embeds armed the welcome sequence at mount with the default 3s delay before the async `/embed/config` fetch resolved, and never rescheduled when the API config arrived with a custom `embedSettings.teaser.delay`. The teaser is now deferred until the config resolves (it can no longer fire early while the fetch is in flight) and then fires at the resolved delay measured from mount, crediting the time already waited. Delay changes on a still-pending teaser reschedule it against the same anchor; a delivered or cancelled teaser is never re-armed by a late config refresh.
