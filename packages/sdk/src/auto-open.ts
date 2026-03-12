import type { EmbedConfig, ShowOnce, TriggerConfig } from "./types";
import { openPopup } from "./popup";
import { shouldShow, markShown, setupTrigger } from "./triggers";

export interface AutoOpenPopupOptions extends Omit<
  EmbedConfig,
  "type" | "autoOpen"
> {
  trigger: TriggerConfig;
  showOnce?: ShowOnce;
  onTriggered?: () => void;
  onOpen?: () => void;
}

export function setupAutoOpenPopup(
  options: AutoOpenPopupOptions
): (() => void) | null {
  const {
    trigger,
    showOnce = "session",
    onTriggered,
    onOpen,
    ...config
  } = options;

  if (!shouldShow(config.researchId, showOnce)) {
    return null;
  }

  return setupTrigger(trigger, () => {
    markShown(config.researchId, showOnce);
    onTriggered?.();
    if (onOpen) {
      onOpen();
    } else {
      openPopup(config);
    }
  });
}
