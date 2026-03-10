/**
 * Slider/drawer embed - slides in from the right
 * SSR-safe - returns no-op handle on server
 */

import type { EmbedConfig, ToggleableHandle } from "./types";
import { hasDom, getHost } from "./config";
import { injectStyles, CLOSE_ICON } from "./styles";
import { setPersistedOpenState } from "./state";
import { cn, getThemeClass } from "./utils";
import {
  createNoOpToggleableHandle,
  createToggleableEmbed,
} from "./toggleable";

export function openSlider(
  config: EmbedConfig & { _startHidden?: boolean }
): ToggleableHandle {
  const { researchId } = config;

  if (!hasDom()) {
    return createNoOpToggleableHandle(researchId, "slider");
  }

  injectStyles();

  const backdrop = document.createElement("div");
  backdrop.className = cn(
    "perspective-slider-backdrop perspective-embed-root",
    getThemeClass(config.theme)
  );

  const slider = document.createElement("div");
  slider.className = cn(
    "perspective-slider perspective-embed-root",
    getThemeClass(config.theme)
  );

  const closeBtn = document.createElement("button");
  closeBtn.className = "perspective-close";
  closeBtn.innerHTML = CLOSE_ICON;
  closeBtn.setAttribute("aria-label", "Close");

  slider.appendChild(closeBtn);
  document.body.appendChild(backdrop);
  document.body.appendChild(slider);
  const persistOpenState = (open: boolean) => {
    setPersistedOpenState({
      researchId,
      type: "slider",
      host: config.host,
      open,
    });
  };

  return createToggleableEmbed(
    config,
    "slider",
    {
      container: slider,
      contentParent: slider,
      show: () => {
        slider.style.display = "";
        backdrop.style.display = "";
      },
      hide: () => {
        slider.style.display = "none";
        backdrop.style.display = "none";
      },
      remove: () => {
        slider.remove();
        backdrop.remove();
      },
      bindCloseHandlers: (hide) => {
        const handleCloseButton = () => hide();
        const handleBackdropClick = () => hide();

        closeBtn.addEventListener("click", handleCloseButton);
        backdrop.addEventListener("click", handleBackdropClick);

        return () => {
          closeBtn.removeEventListener("click", handleCloseButton);
          backdrop.removeEventListener("click", handleBackdropClick);
        };
      },
    },
    getHost(config.host),
    { persistOpenState }
  );
}
