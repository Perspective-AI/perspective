---
"@perspective-ai/sdk": minor
"@perspective-ai/sdk-react": minor
---

Add slider `push` mode and trigger toggle

- **`sliderMode: "overlay" | "push"`** option (default `"overlay"`, backward compatible). In `push` mode the slider shifts page content aside so it occupies real layout space instead of overlaying it — no backdrop, the page stays interactive, and clicking the page no longer closes the slider. Falls back to `"overlay"` on narrow viewports. Available via the JS API, the `data-perspective-slider-mode="push"` attribute, and the `useSlider` React hook.
- **Trigger toggle**: clicking the same `data-perspective-slider` trigger again now closes an open slider instead of re-opening it (respects `disableClose`). The React `useSlider` hook continues to expose `toggle()`.
- **Fix**: adjust the slider close-button position.
