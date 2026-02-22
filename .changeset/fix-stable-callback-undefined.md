---
"@perspective-ai/sdk-react": patch
---

Fix `useStableCallback` always returning a truthy function even when the underlying callback is `undefined`. This caused `onNavigate` to silently swallow navigation instead of falling back to the SDK's default `window.location.href` redirect, since the SDK branches on the callback's truthiness. The hook now preserves `undefined` pass-through, fixing all embed types (Widget, Fullpage, FloatBubble, Slider, Popup).
