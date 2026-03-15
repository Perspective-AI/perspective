---
"@perspective-ai/sdk": minor
"@perspective-ai/sdk-react": minor
---

Add `disableClose` option for popup and slider embeds

- New `disableClose` config option hides the close button, disables overlay/backdrop click, and blocks ESC key
- Programmatic `unmount()`/`destroy()` and iframe-initiated `perspective:close` still work
- SDK now sends `hasCloseButton` flag in the `perspective:init` message so the iframe can adjust layout accordingly
- Supported via `data-perspective-disable-close` HTML attribute for declarative usage
- React hooks `usePopup` and `useSlider` forward the new option
