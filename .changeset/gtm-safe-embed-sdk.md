---
"@perspective-ai/sdk": minor
"@perspective-ai/sdk-react": minor
---

Make the embed script safe to load from Google Tag Manager. Calls queued on a `Perspective` stub before the script arrives are replayed, and `Perspective(...)` stays callable afterwards alongside the existing methods. Evaluating the script again replays any new queue and re-runs auto-init instead of no-oping. An embed whose container — or the marker a float or fullpage was mounted from — has left the document is destroyed and remounted, including after an SPA history change.

Embeds now push lifecycle events to the page's dataLayer: `perspective_widget_open`, `perspective_widget_ready`, `perspective_conversation_started`, `perspective_conversation_completed` and `perspective_widget_close`. This applies to every build — the script tag, the npm package and `@perspective-ai/sdk-react` — whenever `window.dataLayer` already exists, as it does on most sites running Google Tag Manager. `window.dataLayer` is not created unless `configure({ dataLayer: true })`.

If your site already pushes its own Perspective events (from `onSubmit` / `onReady` callbacks, or a Custom HTML tag that listens for `perspective:*` messages), remove that code or call `configure({ dataLayer: false })` when you upgrade, or those conversions will be counted twice. To opt out a single embed, use `data-perspective-datalayer="false"` on a script-tag embed, or `dataLayer: false` in the config passed to `createWidget`, `openPopup` and the other vanilla constructors.
