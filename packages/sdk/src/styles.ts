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

    /* Float bubble (and legacy chat-bubble alias) */
    .perspective-float-bubble,
    .perspective-chat-bubble {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 58px;
      height: 58px;
      border-radius: 50%;
      background: var(--perspective-float-bg, var(--perspective-chat-bg, #7629C8));
      color: white;
      border: none;
      cursor: pointer;
      box-shadow: var(--perspective-float-shadow, var(--perspective-chat-shadow, 0 4px 12px rgba(118, 41, 200, 0.4)));
      z-index: 9996;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      --animate-click-draw: click-draw 3s ease-in-out infinite;
      animation: var(--animate-click-draw);
    }

    .perspective-float-bubble:hover,
    .perspective-chat-bubble:hover {
      box-shadow: var(--perspective-float-shadow-hover, var(--perspective-chat-shadow-hover, 0 6px 16px rgba(118, 41, 200, 0.5)));
    }

    .perspective-float-bubble.perspective-float-bubble-open,
    .perspective-chat-bubble.perspective-float-bubble-open {
      animation: none;
    }

    .perspective-float-bubble:focus-visible,
    .perspective-chat-bubble:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 2px;
    }

    .perspective-float-bubble svg,
    .perspective-chat-bubble svg {
      width: 1.75rem;
      height: 1.75rem;
      stroke-width: 2;
    }

    @keyframes click-draw {
      0%,
      35%,
      65%,
      100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
    }

    .perspective-float-notification-dot {
      position: absolute;
      top: -1px;
      right: -1px;
      width: 13px;
      height: 13px;
      border-radius: 50%;
      background: #ff5252;
      border: 2px solid #fff;
      pointer-events: none;
      animation: perspective-slide-up 0.25s ease-out;
    }

    .perspective-float-teaser {
      position: fixed;
      right: 20px;
      bottom: 88px;
      z-index: 9996;
      background: var(--perspective-modal-bg);
      color: var(--perspective-modal-text);
      border-radius: 14px 14px 4px 14px;
      border: 1px solid var(--perspective-border);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
      max-width: 230px;
      padding: 11px 15px 9px;
      line-height: 1.45;
      cursor: pointer;
      animation: perspective-teaser-in 0.35s ease-out;
      user-select: none;
    }

    .perspective-float-teaser-message {
      font-size: 14px;
      font-weight: 500;
      min-height: 20px;
    }

    .perspective-float-type-cursor {
      display: inline-block;
      width: 2px;
      height: 14px;
      margin-left: 1px;
      vertical-align: middle;
      background: var(--perspective-float-bg, #7c3aed);
      animation: perspective-cursor-blink 0.8s step-end infinite;
    }

    @keyframes perspective-cursor-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }

    @keyframes perspective-teaser-in {
      from {
        opacity: 0;
        transform: translateY(10px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Float window (and legacy chat-window alias) */
    .perspective-float-window,
    .perspective-chat-window {
      position: fixed;
      bottom: 6.25rem;
      right: 1.5rem;
      width: 380px;
      height: calc(100vh - 8.75rem);
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

      .perspective-float-window,
      .perspective-chat-window {
        width: calc(100% - 2rem);
        right: 1rem;
        bottom: 5.625rem;
        height: calc(100vh - 7.5rem);
      }

      .perspective-float-bubble,
      .perspective-chat-bubble {
        bottom: 20px;
        right: 20px;
      }
    }

    @media (max-width: 450px) {
      .perspective-float-window,
      .perspective-chat-window {
        width: calc(100% - 1rem);
        right: 0.5rem;
        bottom: 5rem;
        height: calc(100vh - 6.5rem);
      }

      .perspective-float-bubble,
      .perspective-chat-bubble {
        bottom: 20px;
        right: 20px;
      }
    }
  `;

  document.head.appendChild(style);
}

export const MIC_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
</svg>`;

export const MESSAGES_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-messages-square-icon lucide-messages-square">
  <path d="M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
  <path d="M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1"/>
</svg>`;

/** @deprecated Use MIC_ICON instead */
export const CHAT_ICON = MIC_ICON;

export const CLOSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
</svg>`;
