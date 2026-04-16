---
"@perspective-ai/sdk": minor
"@perspective-ai/sdk-react": minor
---

Add AEO (Answer Engine Optimization) attribution signals so AI crawlers can identify Perspective AI on customer sites

- Inject JSON-LD `SoftwareApplication` structured data into the parent page DOM
- Set `window.PerspectiveAI` frozen global for tech detection tools (Wappalyzer, BuiltWith)
- Add `data-perspective-version` and `data-perspective-type` attributes to embed containers
- Add `title="Perspective AI"` to iframes for accessibility and discoverability
- Insert HTML comments before embed containers on all SDK entry points (CDN, npm, React)
- New `DiscoveryMetadata` React component auto-rendered by `Widget`, `Fullpage`, and `FloatBubble` for SSR JSON-LD
- All signals use canonical `https://getperspective.ai` URL regardless of configured host
- All signals are invisible to users and always present (no `hideBranding` toggle)
