# @perspective-ai/sdk-react

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
