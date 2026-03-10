import { openPopup, type EmbedHandle } from "@perspective-ai/sdk";
import {
  useToggleableEmbed,
  type UseToggleableEmbedOptions,
  type UseToggleableEmbedReturn,
} from "./useToggleableEmbed";

/** Options for usePopup hook */
export interface UsePopupOptions extends UseToggleableEmbedOptions {}

/** Return type for usePopup hook */
export interface UsePopupReturn extends UseToggleableEmbedReturn {
  /** The underlying SDK handle (created on mount; may be null during initial render) */
  handle: EmbedHandle | null;
}

/**
 * Headless hook for programmatic popup control.
 * Use this when you need custom trigger elements or programmatic control.
 *
 * @example
 * ```tsx
 * // Basic usage with custom trigger
 * const { open, isOpen } = usePopup({ researchId: "abc" });
 * <MyCustomButton onClick={open}>Open Survey</MyCustomButton>
 *
 * // Controlled mode
 * const [isOpen, setIsOpen] = useState(false);
 * const popup = usePopup({
 *   researchId: "abc",
 *   open: isOpen,
 *   onOpenChange: setIsOpen
 * });
 * ```
 */
export function usePopup(options: UsePopupOptions): UsePopupReturn {
  return useToggleableEmbed(options, openPopup, "popup");
}
