# @perspective-ai/sdk

## 1.4.0

### Minor Changes

- 76a7ab1: Add `disableClose` option for popup and slider embeds
  - New `disableClose` config option hides the close button, disables overlay/backdrop click, and blocks ESC key
  - Programmatic `unmount()`/`destroy()` and iframe-initiated `perspective:close` still work
  - SDK now sends `hasCloseButton` flag in the `perspective:init` message so the iframe can adjust layout accordingly
  - Supported via `data-perspective-disable-close` HTML attribute for declarative usage
  - React hooks `usePopup` and `useSlider` forward the new option

## 1.3.1

### Patch Changes

- ca61c73: Persist popup, slider, and float open state within the current browser
  session. The SDK now restores shell state after reloads and React remounts
  while keeping explicit closes separate from teardown.

## 1.3.0

### Minor Changes

- ef714e7: feat: add embed auth for cross-origin iframe authentication
  - Popup auth flow: SDK handles `perspective:auth-request` from iframe, opens OAuth popup, relays token back via `perspective:auth-complete`
  - Two-layer token caching: parent localStorage (Layer 2) persists auth across tab close on Safari where iframe localStorage is ephemeral
  - Popup-blocked fallback: falls back to new tab when popup is blocked by browser
  - Feature negotiation: `FEATURES.EMBED_AUTH` bitmask in `perspective:init` handshake for graceful degradation with old SDK versions
  - Fix base64url JWT decode (replace `-`/`_` with `+`/`/` before `atob`)
  - New `onAuth` callback in `EmbedConfig` for custom token handling

### Patch Changes

- 6e1f4e4: fix: clear NextAuth session on signout via hidden popup

  When a user signs out inside the iframe, open a hidden popup to the first-party domain's `/embed-auth/signout` endpoint to clear the NextAuth session cookie. Without this, the persisted session causes silent re-authentication on next visit.

## 1.2.0

### Minor Changes

- c057395: Improve float button UX with channel-aware icons, welcome teaser, and pulse animation
  - Show messages-square icon for text-only channel, microphone for voice/both
  - Add welcome message teaser with typewriter animation above the float button
  - Add notification chime sound and red notification dot
  - Default welcome message: "Have a question? I'm here to help."
  - Add click-draw pulse animation (disabled when chat is open)
  - Standardize button size to 58x58px with 20px positioning on all viewports
  - Support light and dark mode for teaser bubble

### Patch Changes

- 73afba3: docs: add auto-trigger popup documentation to READMEs

## 1.1.3

### Patch Changes

- 077220a: Auto-sync SDK_VERSION constant from package.json at build time via tsup define, removing the need for manual version bumps.
- a834471: Fix destroyAll not resetting initialized flags (auto-trigger popups would fail to re-open after destroyAll+autoInit), fix relative URLs being incorrectly blocked in redirect security check.

## 1.1.2

### Patch Changes

- d646215: Add auto-open trigger system for popup embeds with timeout and exit-intent triggers, show-once dedup, and cleanup tracking.

## 1.1.0

### Minor Changes

- af48387: Forward all parent URL search params to iframe

## 1.0.1

### Patch Changes

- 9e6537d: remove unused constant values

## 1.0.0

### Major Changes

- 2cd5d5e: Initial alpha release with perspective SDK and React components
- 45839b0: Initial stable release with perspective SDK and React components with widget, popup, slider, float bubble, and fullpage embed types

## 1.0.0-alpha.3

## 1.0.0-alpha.2

### Major Changes

- 2cd5d5e: Initial alpha release with perspective SDK and React components
