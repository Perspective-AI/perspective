---
"@perspective-ai/sdk": minor
---

Make the embed script safe to load from Google Tag Manager. Calls queued on a `Perspective` stub before the script arrives are replayed, and `Perspective(...)` stays callable afterwards alongside the existing methods. Evaluating the script again replays any new queue and re-runs auto-init instead of no-oping. An embed whose container — or the marker a float or fullpage was mounted from — has left the document is destroyed and remounted, including after an SPA history change. Lifecycle events are pushed to an existing dataLayer (`perspective_widget_open`, `perspective_widget_ready`, `perspective_conversation_started`, `perspective_conversation_completed`, `perspective_widget_close`). Opt out with `configure({ dataLayer: false })` or `data-perspective-datalayer="false"`. `window.dataLayer` is not created unless `configure({ dataLayer: true })`.
