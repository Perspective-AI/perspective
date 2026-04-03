# @perspective-ai/sdk-react

## 1.6.0

### Minor Changes

- e4bfca7: Apply embedSettings from config API with precedence over embed code

### Patch Changes

- Updated dependencies [e4bfca7]
  - @perspective-ai/sdk@1.6.0

## 1.5.1

### Patch Changes

- Updated dependencies [3d06d75]
  - @perspective-ai/sdk@1.5.1

## 1.5.0

### Minor Changes

- f9f9f02: Add launcher customization for float bubble — icon, style, className support

### Patch Changes

- Updated dependencies [f9f9f02]
  - @perspective-ai/sdk@1.5.0

## 1.4.0

### Minor Changes

- 76a7ab1: Add `disableClose` option for popup and slider embeds
  - New `disableClose` config option hides the close button, disables overlay/backdrop click, and blocks ESC key
  - Programmatic `unmount()`/`destroy()` and iframe-initiated `perspective:close` still work
  - SDK now sends `hasCloseButton` flag in the `perspective:init` message so the iframe can adjust layout accordingly
  - Supported via `data-perspective-disable-close` HTML attribute for declarative usage
  - React hooks `usePopup` and `useSlider` forward the new option

### Patch Changes

- Updated dependencies [76a7ab1]
  - @perspective-ai/sdk@1.4.0

## 1.3.1

### Patch Changes

- ca61c73: Persist popup, slider, and float open state within the current browser
  session. The SDK now restores shell state after reloads and React remounts
  while keeping explicit closes separate from teardown.
- Updated dependencies [ca61c73]
  - @perspective-ai/sdk@1.3.1

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

- Updated dependencies [6e1f4e4]
- Updated dependencies [ef714e7]
  - @perspective-ai/sdk@1.3.0

## 1.2.0

### Patch Changes

- 73afba3: docs: add auto-trigger popup documentation to READMEs
- Updated dependencies [73afba3]
- Updated dependencies [c057395]
  - @perspective-ai/sdk@1.2.0

## 1.1.3

### Patch Changes

- Updated dependencies [077220a]
- Updated dependencies [a834471]
  - @perspective-ai/sdk@1.1.3

## 1.1.2

### Patch Changes

- Updated dependencies [d646215]
  - @perspective-ai/sdk@1.1.2

## 1.1.1

### Patch Changes

- 77c5a2d: Fix `useStableCallback` always returning a truthy function even when the underlying callback is `undefined`. This caused `onNavigate` to silently swallow navigation instead of falling back to the SDK's default `window.location.href` redirect, since the SDK branches on the callback's truthiness. The hook now preserves `undefined` pass-through, fixing all embed types (Widget, Fullpage, FloatBubble, Slider, Popup).

## 1.1.0

### Patch Changes

- Updated dependencies [af48387]
  - @perspective-ai/sdk@1.1.0

## 1.0.1

### Patch Changes

- 9e6537d: remove unused constant values
- Updated dependencies [9e6537d]
  - @perspective-ai/sdk@1.0.1

## 1.0.0

### Major Changes

- 3577ac8: Refactor to hooks-first API

  BREAKING CHANGE: Replace button components with headless hooks
  - Remove `PopupButton` and `SliderButton` components
  - Add `usePopup`, `useSlider`, `useFloatBubble` hooks
  - Update `FloatBubble` to use `useFloatBubble` internally
  - Support controlled/uncontrolled patterns via `open`/`onOpenChange` props

  Migration:

  ```tsx
  // Before
  import { PopupButton } from "@perspective-ai/sdk-react";
  <PopupButton researchId="xxx">Open Survey</PopupButton>;

  // After
  import { usePopup } from "@perspective-ai/sdk-react";
  const { open } = usePopup({ researchId: "xxx" });
  <button onClick={open}>Open Survey</button>;
  ```

- 2cd5d5e: Initial alpha release with perspective SDK and React components
- 45839b0: Initial stable release with perspective SDK and React components with widget, popup, slider, float bubble, and fullpage embed types

### Patch Changes

- Updated dependencies [2cd5d5e]
- Updated dependencies [45839b0]
  - @perspective-ai/sdk@1.0.0

## 1.0.0-alpha.3

### Major Changes

- 3577ac8: Refactor to hooks-first API

  BREAKING CHANGE: Replace button components with headless hooks
  - Remove `PopupButton` and `SliderButton` components
  - Add `usePopup`, `useSlider`, `useFloatBubble` hooks
  - Update `FloatBubble` to use `useFloatBubble` internally
  - Support controlled/uncontrolled patterns via `open`/`onOpenChange` props

  Migration:

  ```tsx
  // Before
  import { PopupButton } from "@perspective-ai/sdk-react";
  <PopupButton researchId="xxx">Open Survey</PopupButton>;

  // After
  import { usePopup } from "@perspective-ai/sdk-react";
  const { open } = usePopup({ researchId: "xxx" });
  <button onClick={open}>Open Survey</button>;
  ```

### Patch Changes

- @perspective-ai/sdk@1.0.0-alpha.3

## 1.0.0-alpha.2

### Major Changes

- 2cd5d5e: Initial alpha release with perspective SDK and React components

### Patch Changes

- Updated dependencies [2cd5d5e]
  - @perspective-ai/sdk@1.0.0-alpha.2
