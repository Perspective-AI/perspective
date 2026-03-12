/**
 * Popup/modal embed - opens in a centered modal overlay
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

export function openPopup(
  config: EmbedConfig & { _startHidden?: boolean }
): ToggleableHandle {
  const { researchId } = config;

  if (!hasDom()) {
    return createNoOpToggleableHandle(researchId, "popup");
  }

  injectStyles();

  const overlay = document.createElement("div");
  overlay.className = cn(
    "perspective-overlay perspective-embed-root",
    getThemeClass(config.theme)
  );

  const modal = document.createElement("div");
  modal.className = "perspective-modal";

  const closeBtn = document.createElement("button");
  closeBtn.className = "perspective-close";
  closeBtn.innerHTML = CLOSE_ICON;
  closeBtn.setAttribute("aria-label", "Close");

  modal.appendChild(closeBtn);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  const persistOpenState = (open: boolean) => {
    setPersistedOpenState({
      researchId,
      type: "popup",
      host: config.host,
      open,
    });
  };

  return createToggleableEmbed(
    config,
    "popup",
    {
      container: overlay,
      contentParent: modal,
      show: () => {
        overlay.style.display = "";
      },
      hide: () => {
        overlay.style.display = "none";
      },
      remove: () => {
        overlay.remove();
      },
      bindCloseHandlers: (hide) => {
        const handleCloseButton = () => hide();
        const handleOverlayClick = (event: MouseEvent) => {
          if (event.target === overlay) {
            hide();
          }
        };

        closeBtn.addEventListener("click", handleCloseButton);
        overlay.addEventListener("click", handleOverlayClick);

        return () => {
          closeBtn.removeEventListener("click", handleCloseButton);
          overlay.removeEventListener("click", handleOverlayClick);
        };
      },
      loadingStyle: (loading) => {
        loading.style.borderRadius = "16px";
      },
    },
    getHost(config.host),
    { persistOpenState }
  );
}
