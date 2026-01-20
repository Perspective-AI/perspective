"use client";

/**
 * Perspective Embed SDK - React Components
 *
 * Usage:
 *   import { Widget, PopupButton, SliderButton, FloatBubble } from '@perspective-ai/sdk-react';
 *
 *   // Inline widget
 *   <Widget researchId="xxx" onReady={() => {}} />
 *
 *   // Popup button
 *   <PopupButton researchId="xxx">Take the interview</PopupButton>
 *
 *   // Slider button
 *   <SliderButton researchId="xxx">Open Interview</SliderButton>
 *
 *   // Floating bubble
 *   <FloatBubble researchId="xxx" />
 *
 *   // Full page
 *   <Fullpage researchId="xxx" />
 */

// Components
export { Widget, type WidgetProps } from "./Widget";
export {
  PopupButton,
  type PopupButtonProps,
  type PopupButtonHandle,
} from "./PopupButton";
export {
  SliderButton,
  type SliderButtonProps,
  type SliderButtonHandle,
} from "./SliderButton";
export { FloatBubble, type FloatBubbleProps } from "./FloatBubble";
export { Fullpage, type FullpageProps } from "./Fullpage";

// Hooks
export { useThemeSync } from "./hooks/useThemeSync";
export { useStableCallback } from "./hooks/useStableCallback";

// Re-export types from core package for convenience
export type {
  EmbedConfig,
  EmbedHandle,
  FloatHandle,
  BrandColors,
  ThemeValue,
  EmbedError,
} from "@perspective-ai/sdk";
