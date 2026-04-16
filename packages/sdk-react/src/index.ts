/**
 * Perspective Embed SDK - React
 *
 * Hooks (for overlays - popup, slider, float bubble):
 *   import { usePopup, useSlider, useFloatBubble } from '@perspective-ai/sdk-react';
 *
 *   const { open } = usePopup({ researchId: "xxx" });
 *   <button onClick={open}>Take Survey</button>
 *
 * Components (for embeds - widget, fullpage):
 *   import { Widget, Fullpage, FloatBubble } from '@perspective-ai/sdk-react';
 *
 *   <Widget researchId="xxx" />
 *   <Fullpage researchId="xxx" />
 *   <FloatBubble researchId="xxx" />
 */

export {
  usePopup,
  type UsePopupOptions,
  type UsePopupReturn,
} from "./hooks/usePopup";
export {
  useSlider,
  type UseSliderOptions,
  type UseSliderReturn,
} from "./hooks/useSlider";
export {
  useFloatBubble,
  type UseFloatBubbleOptions,
  type UseFloatBubbleReturn,
} from "./hooks/useFloatBubble";
export {
  useAutoOpen,
  type UseAutoOpenOptions,
  type UseAutoOpenReturn,
} from "./hooks/useAutoOpen";
export { useEmbedConfig } from "./hooks/useEmbedConfig";
export { useThemeSync } from "./hooks/useThemeSync";
export { useStableCallback } from "./hooks/useStableCallback";

export { Widget, type WidgetProps } from "./Widget";
export { Fullpage, type FullpageProps } from "./Fullpage";
export { FloatBubble, type FloatBubbleProps } from "./FloatBubble";

export type {
  EmbedConfig,
  EmbedHandle,
  FloatHandle,
  BrandColors,
  ThemeValue,
  EmbedError,
  TriggerConfig,
  ShowOnce,
  AutoOpenConfig,
} from "@perspective-ai/sdk";
