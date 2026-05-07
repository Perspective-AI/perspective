---
"@perspective-ai/sdk": minor
"@perspective-ai/sdk-react": minor
---

Stop blocking iframe creation on the embed config API for non-float embed types. Workspace-level appearance overrides (`hideProgress`, `hideGreeting`, `hideBranding`, `enableFullScreen`) are now resolved by the iframe page server-side, eliminating a parent-side API round trip on every cold load — previously this added 90ms warm and up to ~2.7s on a cold lambda.

- `Widget`, `createWidget`, `openPopup`, `openSlider`, `createFullpage` no longer call `fetchEmbedConfig` before creating the iframe. The iframe element is created synchronously and `createWidget`/etc. show their own skeleton while the iframe loads.
- `createFloatBubble` still fetches config (needed for bubble avatar, color, channel, and launcher customization) but no longer applies `embedSettings.appearance` to the iframe URL — that's also iframe-side now.
- `appearanceToParams` and the `appearanceOverrides` parameter on `createIframe` are removed (they were only used by the old appearance-via-URL path).
- API config consumers can continue to read `embedSettings.appearance` from `/api/v1/embed/config` — the field stays in the response for backwards compatibility with older SDK versions in the wild, but new SDKs ignore it.
