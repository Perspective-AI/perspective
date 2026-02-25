/**
 * Teaser message bubble with typewriter effect
 * SSR-safe - no DOM access at import time
 */

import type { ThemeValue } from "./constants";
import { cn, getThemeClass } from "./utils";

export interface TeaserOptions {
  text: string;
  speed?: number;
  theme?: ThemeValue;
  onDismiss: () => void;
  onClick: () => void;
}

export function createTeaser(options: TeaserOptions): {
  element: HTMLElement;
  destroy: () => void;
} {
  const { text, speed = 40, theme, onDismiss, onClick } = options;

  const wrapper = document.createElement("div");
  wrapper.className = cn(
    "perspective-float-teaser perspective-embed-root",
    getThemeClass(theme)
  );

  const bubble = document.createElement("div");
  bubble.className = "perspective-float-teaser-bubble";
  bubble.addEventListener("click", onClick);

  const textSpan = document.createElement("span");
  textSpan.className = "perspective-float-teaser-text";
  bubble.appendChild(textSpan);

  const cursor = document.createElement("span");
  cursor.className = "perspective-float-teaser-cursor";
  cursor.textContent = "|";
  bubble.appendChild(cursor);

  const closeBtn = document.createElement("button");
  closeBtn.className = "perspective-float-teaser-close";
  closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;
  closeBtn.setAttribute("aria-label", "Dismiss teaser");
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    onDismiss();
  });

  wrapper.appendChild(bubble);
  wrapper.appendChild(closeBtn);

  // Typewriter effect
  let charIndex = 0;
  const interval = setInterval(() => {
    if (charIndex < text.length) {
      textSpan.textContent = text.slice(0, charIndex + 1);
      charIndex++;
    } else {
      clearInterval(interval);
      cursor.style.display = "none";
    }
  }, speed);

  return {
    element: wrapper,
    destroy: () => {
      clearInterval(interval);
      wrapper.remove();
    },
  };
}
