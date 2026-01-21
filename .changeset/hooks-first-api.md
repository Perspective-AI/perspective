---
"@perspective-ai/sdk-react": major
---

Refactor to hooks-first API

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
