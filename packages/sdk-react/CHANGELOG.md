# @perspective-ai/sdk-react

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
