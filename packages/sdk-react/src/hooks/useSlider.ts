import { openSlider, type EmbedHandle } from "@perspective-ai/sdk";
import {
  useToggleableEmbed,
  type UseToggleableEmbedOptions,
  type UseToggleableEmbedReturn,
} from "./useToggleableEmbed";

/** Options for useSlider hook */
export interface UseSliderOptions extends UseToggleableEmbedOptions {}

/** Return type for useSlider hook */
export interface UseSliderReturn extends UseToggleableEmbedReturn {
  /** The underlying SDK handle (created on mount; may be null during initial render) */
  handle: EmbedHandle | null;
}

/**
 * Headless hook for programmatic slider control.
 * Use this when you need custom trigger elements or programmatic control.
 *
 * @example
 * ```tsx
 * const { open, isOpen } = useSlider({ researchId: "abc" });
 * <MyCustomButton onClick={open}>Give Feedback</MyCustomButton>
 * ```
 */
export function useSlider(options: UseSliderOptions): UseSliderReturn {
  return useToggleableEmbed(options, openSlider, "slider");
}
