/**
 * CSS styles injected by the embed script
 * SSR-safe - DOM access is guarded
 */

import { hasDom } from "./config";

let stylesInjected = false;

const LIGHT_THEME = `
  --perspective-overlay-bg: rgba(0, 0, 0, 0.5);
  --perspective-modal-bg: #ffffff;
  --perspective-modal-text: #151B23;
  --perspective-close-bg: rgba(0, 0, 0, 0.1);
  --perspective-close-text: #666666;
  --perspective-close-hover-bg: rgba(0, 0, 0, 0.2);
  --perspective-close-hover-text: #333333;
  --perspective-border: hsl(240 6% 90%);
`;

const DARK_THEME = `
  --perspective-overlay-bg: rgba(0, 0, 0, 0.7);
  --perspective-modal-bg: #02040a;
  --perspective-modal-text: #ffffff;
  --perspective-close-bg: rgba(255, 255, 255, 0.1);
  --perspective-close-text: #a0a0a0;
  --perspective-close-hover-bg: rgba(255, 255, 255, 0.2);
  --perspective-close-hover-text: #ffffff;
  --perspective-border: hsl(217 33% 17%);
`;

export function injectStyles(): void {
  if (!hasDom()) return;
  if (stylesInjected) return;
  stylesInjected = true;

  const style = document.createElement("style");
  style.id = "perspective-embed-styles";
  style.textContent = `
    /* Theme-aware color variables */
    .perspective-embed-root, .perspective-light-theme {
      ${LIGHT_THEME}
      --perspective-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --perspective-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      --perspective-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      --perspective-shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      --perspective-radius: 1.2rem;
      --perspective-radius-sm: calc(var(--perspective-radius) - 4px);
    }

    /* Dark theme */
    .perspective-dark-theme {
      ${DARK_THEME}
    }

    /* System dark mode support */
    @media (prefers-color-scheme: dark) {
      .perspective-embed-root:not(.perspective-light-theme) {
        ${DARK_THEME}
      }
    }

    /* Scrollbar styling */
    .perspective-modal,
    .perspective-slider,
    .perspective-float-window,
    .perspective-chat-window {
      scrollbar-width: thin;
      scrollbar-color: var(--perspective-border) transparent;
    }

    .perspective-modal::-webkit-scrollbar,
    .perspective-slider::-webkit-scrollbar,
    .perspective-float-window::-webkit-scrollbar,
    .perspective-chat-window::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }

    .perspective-modal::-webkit-scrollbar-track,
    .perspective-slider::-webkit-scrollbar-track,
    .perspective-float-window::-webkit-scrollbar-track,
    .perspective-chat-window::-webkit-scrollbar-track {
      background: transparent;
    }

    .perspective-modal::-webkit-scrollbar-thumb,
    .perspective-slider::-webkit-scrollbar-thumb,
    .perspective-float-window::-webkit-scrollbar-thumb,
    .perspective-chat-window::-webkit-scrollbar-thumb {
      background-color: var(--perspective-border);
      border-radius: 9999px;
      border: 2px solid transparent;
      background-clip: padding-box;
    }

    .perspective-modal::-webkit-scrollbar-thumb:hover,
    .perspective-slider::-webkit-scrollbar-thumb:hover,
    .perspective-float-window::-webkit-scrollbar-thumb:hover,
    .perspective-chat-window::-webkit-scrollbar-thumb:hover {
      background-color: color-mix(in srgb, var(--perspective-border) 80%, currentColor);
    }

    /* Overlay for popup/modal */
    .perspective-overlay {
      position: fixed;
      inset: 0;
      background: var(--perspective-overlay-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: perspective-fade-in 0.2s ease-out;
    }

    @keyframes perspective-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes perspective-spin {
      to { transform: rotate(360deg); }
    }

    /* Modal container */
    .perspective-modal {
      position: relative;
      width: 90%;
      max-width: 600px;
      height: 80vh;
      max-height: 700px;
      background: var(--perspective-modal-bg);
      color: var(--perspective-modal-text);
      border-radius: var(--perspective-radius);
      overflow: hidden;
      box-shadow: var(--perspective-shadow-xl);
      animation: perspective-slide-up 0.3s ease-out;
    }

    @keyframes perspective-slide-up {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .perspective-modal iframe {
      width: 100%;
      height: 100%;
      border: none;
    }

    /* Close button */
    .perspective-close {
      position: absolute;
      top: 1rem;
      right: 1.5rem;
      width: 2rem;
      height: 2rem;
      border: none;
      background: var(--perspective-close-bg);
      color: var(--perspective-close-text);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      z-index: 10;
      transition: background-color 0.2s ease, color 0.2s ease;
    }

    .perspective-close:hover {
      background: var(--perspective-close-hover-bg);
      color: var(--perspective-close-hover-text);
    }

    .perspective-close:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 2px;
    }

    .perspective-close svg {
      width: 1rem;
      height: 1rem;
      stroke-width: 2;
    }

    /* Slider drawer */
    .perspective-slider {
      position: fixed;
      top: 0;
      right: 0;
      width: 100%;
      max-width: 450px;
      height: 100%;
      background: var(--perspective-modal-bg);
      color: var(--perspective-modal-text);
      box-shadow: var(--perspective-shadow-xl);
      z-index: 9999;
      animation: perspective-slide-in 0.3s ease-out;
    }

    @keyframes perspective-slide-in {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .perspective-slider iframe {
      width: 100%;
      height: 100%;
      border: none;
    }

    .perspective-slider .perspective-close {
      top: 1rem;
      right: 2rem;
    }

    /* Slider backdrop */
    .perspective-slider-backdrop {
      position: fixed;
      inset: 0;
      background: var(--perspective-overlay-bg);
      z-index: 9998;
      animation: perspective-fade-in 0.2s ease-out;
    }

    /* Float input bar (replaces circle bubble) */
    .perspective-float-bar {
      position: fixed;
      bottom: 1.25rem;
      right: 1.25rem;
      z-index: 9996;
      display: flex;
      align-items: center;
      background: var(--perspective-modal-bg, #fff);
      border: 1px solid var(--perspective-float-border, rgba(124,58,237,0.2));
      border-radius: 1.75rem;
      box-shadow: var(--perspective-shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
      min-width: 300px;
      padding: 0.25rem;
      animation: perspective-bar-in 0.45s cubic-bezier(0.175,0.885,0.32,1.275);
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .perspective-float-bar--focused {
      border-color: var(--perspective-float-border-focus, rgba(124,58,237,0.3));
      box-shadow: var(--perspective-shadow-md, 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06));
    }

    @keyframes perspective-bar-in {
      from {
        opacity: 0;
        transform: translateY(16px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .perspective-float-bar input {
      flex: 1;
      background: transparent;
      border: none;
      font-size: 0.875rem;
      color: var(--perspective-modal-text, #1a1a1a);
      outline: none;
      padding: 0.625rem 0.75rem;
      min-width: 0;
      font-family: inherit;
    }

    .perspective-float-bar input::placeholder {
      color: var(--perspective-close-text, #666);
      opacity: 0.7;
    }

    .perspective-float-bar-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      background: var(--perspective-float-bg, #7c3aed);
      color: white;
      flex-shrink: 0;
      transition: background-color 0.15s, transform 0.15s;
    }

    .perspective-float-bar-icon:hover {
      transform: scale(1.05);
    }

    .perspective-float-bar-icon svg {
      width: 1rem;
      height: 1rem;
    }

    .perspective-float-bar-divider {
      width: 1px;
      height: 1.5rem;
      background: var(--perspective-border, #e5e7eb);
      flex-shrink: 0;
    }

    .perspective-float-bar-action {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      background: transparent;
      color: var(--perspective-float-bg, #7c3aed);
      flex-shrink: 0;
      transition: background-color 0.15s, color 0.15s;
    }

    .perspective-float-bar-action--has-text {
      background: var(--perspective-float-bg, #7c3aed);
      color: white;
    }

    .perspective-float-bar-action:hover {
      background: var(--perspective-float-bg, #7c3aed);
      color: white;
    }

    .perspective-float-bar-action svg {
      width: 1.125rem;
      height: 1.125rem;
    }

    /* Pulse ring animation for sound chime */
    .perspective-float-bar-pulse {
      position: absolute;
      inset: -4px;
      border-radius: 2rem;
      border: 2px solid var(--perspective-float-bg, #7c3aed);
      opacity: 0;
      animation: perspective-pulse-ring 1s ease-out;
    }

    @keyframes perspective-pulse-ring {
      0% { opacity: 0.6; transform: scale(1); }
      100% { opacity: 0; transform: scale(1.08); }
    }

    /* Teaser message */
    .perspective-float-teaser {
      position: fixed;
      bottom: 4.75rem;
      right: 1.25rem;
      z-index: 9996;
      display: flex;
      align-items: flex-start;
      gap: 0.375rem;
      animation: perspective-float-open 0.3s ease-out;
    }

    .perspective-float-teaser-bubble {
      background: var(--perspective-modal-bg, #fff);
      color: var(--perspective-modal-text, #1a1a1a);
      border: 1px solid var(--perspective-border, #e5e7eb);
      border-radius: 1rem;
      padding: 0.625rem 0.875rem;
      font-size: 0.8125rem;
      line-height: 1.4;
      max-width: 260px;
      box-shadow: var(--perspective-shadow-md, 0 4px 6px -1px rgba(0,0,0,0.1));
      cursor: pointer;
    }

    .perspective-float-teaser-cursor {
      display: inline;
      animation: perspective-blink 0.6s step-end infinite;
      color: var(--perspective-float-bg, #7c3aed);
      font-weight: 300;
      margin-left: 1px;
    }

    @keyframes perspective-blink {
      50% { opacity: 0; }
    }

    .perspective-float-teaser-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.25rem;
      height: 1.25rem;
      border-radius: 50%;
      border: none;
      background: var(--perspective-close-bg, rgba(0,0,0,0.1));
      color: var(--perspective-close-text, #666);
      cursor: pointer;
      flex-shrink: 0;
      margin-top: 0.25rem;
      transition: background-color 0.15s;
    }

    .perspective-float-teaser-close:hover {
      background: var(--perspective-close-hover-bg, rgba(0,0,0,0.2));
    }

    /* Float window (and legacy chat-window alias) */
    .perspective-float-window,
    .perspective-chat-window {
      position: fixed;
      bottom: 1.25rem;
      right: 1.25rem;
      width: 380px;
      height: calc(100vh - 3.5rem);
      max-height: 600px;
      background: var(--perspective-modal-bg);
      color: var(--perspective-modal-text);
      border-radius: var(--perspective-radius);
      overflow: hidden;
      box-shadow: var(--perspective-shadow-xl);
      z-index: 9997;
      animation: perspective-float-open 0.3s ease-out;
    }

    @keyframes perspective-float-open {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.9);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .perspective-float-window iframe,
    .perspective-chat-window iframe {
      width: 100%;
      height: 100%;
      border: none;
    }

    .perspective-float-window .perspective-close,
    .perspective-chat-window .perspective-close {
      top: 1rem;
      right: 1.5rem;
    }

    /* Fullpage */
    .perspective-fullpage {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: var(--perspective-modal-bg);
    }

    .perspective-fullpage iframe {
      width: 100%;
      height: 100%;
      border: none;
    }

    /* Responsive */
    @media (max-width: 640px) {
      .perspective-modal {
        width: 100%;
        height: 100%;
        max-width: none;
        max-height: none;
        border-radius: 0;
      }

      .perspective-slider {
        max-width: 100%;
      }

      .perspective-float-bar {
        left: 1rem;
        right: 1rem;
        min-width: 0;
      }

      .perspective-float-window,
      .perspective-chat-window {
        width: calc(100% - 2rem);
        right: 1rem;
        bottom: 1rem;
        height: calc(100vh - 2rem);
        max-height: none;
      }

      .perspective-float-teaser {
        right: 1rem;
        left: 1rem;
      }

      .perspective-float-teaser-bubble {
        max-width: none;
      }
    }

    @media (max-width: 450px) {
      .perspective-float-bar {
        left: 0.5rem;
        right: 0.5rem;
        min-width: 0;
      }

      .perspective-float-window,
      .perspective-chat-window {
        width: calc(100% - 1rem);
        right: 0.5rem;
        bottom: 0.5rem;
        height: calc(100vh - 1rem);
      }

      .perspective-float-teaser {
        right: 0.5rem;
        left: 0.5rem;
      }
    }
  `;

  document.head.appendChild(style);
}

export const MIC_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
</svg>`;

/** @deprecated Use MIC_ICON instead */
export const CHAT_ICON = MIC_ICON;

export const CLOSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
</svg>`;

export const CHAT_BUBBLE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
</svg>`;

export const KEYBOARD_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <rect x="2" y="4" width="20" height="16" rx="2" />
  <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8" />
</svg>`;

export const SEND_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
</svg>`;

/** Get the appropriate icon SVG for a given icon type */
export function getIconSvg(icon: "chat" | "mic" | "keyboard"): string {
  switch (icon) {
    case "mic":
      return MIC_ICON;
    case "keyboard":
      return KEYBOARD_ICON;
    case "chat":
    default:
      return CHAT_BUBBLE_ICON;
  }
}
