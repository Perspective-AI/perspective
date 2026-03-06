---
"@perspective-ai/sdk": minor
---

perf: preload iframes and hide-on-close for instant popup/slider reopen

- Hide-on-close: popup/slider close now hides the overlay instead of destroying the iframe, so reopening is instant with conversation state preserved
- Iframe preloading: button-triggered and auto-triggered embeds (timeout/exit-intent) preload a hidden iframe during idle time so the embed is warm when opened
- Resource hints: inject preconnect/dns-prefetch for the embed host on SDK load
- Embed timing instrumentation for load waterfall debugging (dev only)
