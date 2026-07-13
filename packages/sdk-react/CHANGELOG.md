# @perspective-ai/sdk-react

## 1.15.0

### Minor Changes

- 30483ae: Add an × dismiss button to the float teaser bubble so users can close it without opening the chat. Dismissing removes the teaser and the notification dot, and persists for the rest of the browser session (per agent). Configurable via `teaser.dismissible` (default `true`) or `data-perspective-teaser-dismissible="false"`.

### Patch Changes

- Updated dependencies [30483ae]
  - @perspective-ai/sdk@1.15.0

## 1.14.1

### Patch Changes

- Updated dependencies [7c34250]
  - @perspective-ai/sdk@1.14.1

## 1.14.0

### Patch Changes

- Updated dependencies [fe18680]
  - @perspective-ai/sdk@1.14.0

## 1.13.1

### Patch Changes

- Updated dependencies [a0af14d]
  - @perspective-ai/sdk@1.13.1

## 1.13.0

### Minor Changes

- dc8254c: Add `teaser` config to control the float welcome teaser: `enabled` turns the whole welcome sequence (teaser bubble, chime, notification dot) on or off, `delay` sets when the teaser appears (ms, default 3000), and `sound` mutes the chime. Available programmatically (`createFloatBubble`, `FloatBubble`, `useFloatBubble`), via data attributes (`data-perspective-teaser`, `data-perspective-teaser-delay`, `data-perspective-teaser-sound`), and via API `embedSettings.teaser` (which takes precedence). Disabling the teaser through `update()` or late-arriving API config cancels a pending or visible teaser.

### Patch Changes

- Updated dependencies [dc8254c]
  - @perspective-ai/sdk@1.13.0

## 1.12.0

### Patch Changes

- Updated dependencies [d2f7626]
  - @perspective-ai/sdk@1.12.0

## 1.11.0

### Minor Changes

- 7a592f7: Widget: polished default appearance with a non-breaking, fully overridable
  frame.

  A bare inline widget (`<div data-perspective-widget>` / `<Widget />` with no
  container sizing) now renders as a centered, framed card — border, rounded
  corners, soft shadow, a comfortable height, and a sensible max-width — so it
  looks finished with zero CSS. Previously it was an unstyled, full-bleed iframe
  that looked awkward on wide pages.

  Backward compatible: when the host has sized the container (a height, `flex`,
  `height: 100%`, etc.), the widget keeps filling it edge to edge with no framing,
  exactly as before.

  New `frame` config object (also a `<Widget frame={…} />` prop) controls the
  inline widget's layout and appearance:
  - `layout: "card" | "fill"` — force a mode regardless of detection (`"fill"`
    restores the full-width behaviour; omit to auto-detect).
  - `maxWidth`, `minHeight`, `radius`, `border`, `shadow`, `background` — each
    maps to a `--perspective-widget-*` CSS custom property the card reads, so the
    same knob is reachable from the `frame` object, a stylesheet, or inline
    `style`. Because the SDK only reads these vars, an override wins at any
    specificity and isn't clobbered by global resets.

  Script-tag users get the same control declaratively via a packed
  `data-perspective-frame` attribute, mirroring `data-perspective-brand`:
  `data-perspective-frame="layout=fill,radius=4px,shadow=none,bg=#fff"`.

### Patch Changes

- Updated dependencies [7a592f7]
  - @perspective-ai/sdk@1.11.0

## 1.10.0

### Minor Changes

- 83eab2c: Trim brand color overrides to `primary` + `bg` only

  The interview app no longer honors the `secondary` and `text` brand overrides and has rescoped `bg`, so the SDK no longer advertises or forwards them.
  - **`BrandColors`** now centers on `primary` and `bg`. The SDK no longer forwards `secondary` or `text` to the iframe.
    - `primary` themes buttons, the progress bar, links, the mic, and focus rings.
    - `bg` paints the interview background behind the card, shown only when no background scene is set.
    - `secondary` and `text` remain on the type as `@deprecated` no-ops so existing TypeScript consumers don't break; they're ignored at runtime.

  This is non-breaking: the app gracefully ignores unknown `brand.*` params and already-deployed embeds keep working. Passing `secondary`/`text` is simply a no-op going forward.

  Also: SDK chrome that paints a brand color now derives a contrasting foreground from that color's WCAG luminance, so light brand colors no longer produce unreadable white-on-light content. This applies to the popup/slider **trigger button** text, the **float launcher** icon (both previously hard-coded to white), and the **loading skeleton** shimmer/border palette (now chosen from the actual `brand.bg` luminance rather than the theme, so a dark `brand.bg` under a light theme still shows visible shimmer). Each falls back to the previous behavior when the color isn't a parseable hex.

### Patch Changes

- Updated dependencies [83eab2c]
  - @perspective-ai/sdk@1.10.0

## 1.9.0

### Minor Changes

- 09a5fbb: Add slider `push` mode and trigger toggle
  - **`sliderMode: "overlay" | "push"`** option (default `"overlay"`, backward compatible). In `push` mode the slider shifts page content aside so it occupies real layout space instead of overlaying it — no backdrop, the page stays interactive, and clicking the page no longer closes the slider. Falls back to `"overlay"` on narrow viewports. Available via the JS API, the `data-perspective-slider-mode="push"` attribute, and the `useSlider` React hook.
  - **Trigger toggle**: clicking the same `data-perspective-slider` trigger again now closes an open slider instead of re-opening it (respects `disableClose`). The React `useSlider` hook continues to expose `toggle()`.
  - **Fix**: adjust the slider close-button position.

### Patch Changes

- Updated dependencies [09a5fbb]
  - @perspective-ai/sdk@1.9.0

## 1.8.0

### Minor Changes

- fd9a8d0: Stop blocking iframe creation on the embed config API for non-float embed types. Workspace-level appearance overrides (`hideProgress`, `hideGreeting`, `hideBranding`, `enableFullScreen`) are now resolved by the iframe page server-side, eliminating a parent-side API round trip on every cold load — previously this added 90ms warm and up to ~2.7s on a cold lambda.
  - `Widget`, `createWidget`, `openPopup`, `openSlider`, `createFullpage` no longer call `fetchEmbedConfig` before creating the iframe. The iframe element is created synchronously and `createWidget`/etc. show their own skeleton while the iframe loads.
  - `createFloatBubble` still fetches config (needed for bubble avatar, color, channel, and launcher customization) but no longer applies `embedSettings.appearance` to the iframe URL — that's also iframe-side now.
  - `appearanceToParams` and the `appearanceOverrides` parameter on `createIframe` are removed (they were only used by the old appearance-via-URL path).
  - API config consumers can continue to read `embedSettings.appearance` from `/api/v1/embed/config` — the field stays in the response for backwards compatibility with older SDK versions in the wild, but new SDKs ignore it.

- fd9a8d0: Hide the loading skeleton on a new `perspective:visual-ready` signal emitted by the iframe before React hydrates, instead of waiting for the post-hydration `perspective:ready`. The skeleton now disappears hundreds of milliseconds earlier on cold loads — the embed feels noticeably snappier, closer to a chat widget like Intercom.
  - New `MESSAGE_TYPES.visualReady` (`perspective:visual-ready`) constant exported alongside `ready`. The SDK listens for whichever arrives first and treats `ready` as a fallback for older iframe versions, so this is fully backwards compatible.
  - New optional `onVisualReady` callback on `EmbedConfig` for consumers who want to react to the early visual-ready signal. `onReady` continues to fire once the iframe is fully interactive and is still the right hook for most consumers.
  - Reduced the iframe fade-in / skeleton fade-out from 300ms to 150ms across `widget`, `popup`, `slider`, `fullpage`, and `float` — long fades made the embed feel slow even after content was ready.

### Patch Changes

- Updated dependencies [fd9a8d0]
- Updated dependencies [fd9a8d0]
  - @perspective-ai/sdk@1.8.0

## 1.7.1

### Patch Changes

- 7fb0a65: Align JSON-LD SoftwareApplication description with the main app's schema
- Updated dependencies [7fb0a65]
  - @perspective-ai/sdk@1.7.1

## 1.7.0

### Minor Changes

- a037de3: Add AEO (Answer Engine Optimization) attribution signals so AI crawlers can identify Perspective AI on customer sites
  - Inject JSON-LD `SoftwareApplication` structured data into the parent page DOM
  - Set `window.PerspectiveAI` frozen global for tech detection tools (Wappalyzer, BuiltWith)
  - Add `data-perspective-version` and `data-perspective-type` attributes to embed containers
  - Add `title="Powered by Perspective AI concierge"` to iframes for accessibility and discoverability
  - Insert HTML comments before embed containers on all SDK entry points (CDN, npm, React)
  - New `DiscoveryMetadata` React component auto-rendered by `Widget`, `Fullpage`, and `FloatBubble` for SSR JSON-LD
  - All signals use canonical `https://getperspective.ai` URL regardless of configured host
  - All signals are invisible to users and enabled by default
  - New `disableJsonLdAttribution` config option to opt out of JSON-LD injection (for enterprise/white-label customers)

### Patch Changes

- Updated dependencies [a037de3]
  - @perspective-ai/sdk@1.7.0

## 1.6.2

### Patch Changes

- 6798566: Remove footer hint skeleton from the loading indicator
- Updated dependencies [6798566]
  - @perspective-ai/sdk@1.6.2

## 1.6.1

### Patch Changes

- Updated dependencies [831e88b]
  - @perspective-ai/sdk@1.6.1

## 1.6.0

### Minor Changes

- e4bfca7: Apply embedSettings from config API with precedence over embed code

### Patch Changes

- Updated dependencies [e4bfca7]
  - @perspective-ai/sdk@1.6.0

## 1.5.1

### Patch Changes

- Updated dependencies [3d06d75]
  - @perspective-ai/sdk@1.5.1

## 1.5.0

### Minor Changes

- f9f9f02: Add launcher customization for float bubble — icon, style, className support

### Patch Changes

- Updated dependencies [f9f9f02]
  - @perspective-ai/sdk@1.5.0

## 1.4.0

### Minor Changes

- 76a7ab1: Add `disableClose` option for popup and slider embeds
  - New `disableClose` config option hides the close button, disables overlay/backdrop click, and blocks ESC key
  - Programmatic `unmount()`/`destroy()` and iframe-initiated `perspective:close` still work
  - SDK now sends `hasCloseButton` flag in the `perspective:init` message so the iframe can adjust layout accordingly
  - Supported via `data-perspective-disable-close` HTML attribute for declarative usage
  - React hooks `usePopup` and `useSlider` forward the new option

### Patch Changes

- Updated dependencies [76a7ab1]
  - @perspective-ai/sdk@1.4.0

## 1.3.1

### Patch Changes

- ca61c73: Persist popup, slider, and float open state within the current browser
  session. The SDK now restores shell state after reloads and React remounts
  while keeping explicit closes separate from teardown.
- Updated dependencies [ca61c73]
  - @perspective-ai/sdk@1.3.1

## 1.3.0

### Minor Changes

- ef714e7: feat: add embed auth for cross-origin iframe authentication
  - Popup auth flow: SDK handles `perspective:auth-request` from iframe, opens OAuth popup, relays token back via `perspective:auth-complete`
  - Two-layer token caching: parent localStorage (Layer 2) persists auth across tab close on Safari where iframe localStorage is ephemeral
  - Popup-blocked fallback: falls back to new tab when popup is blocked by browser
  - Feature negotiation: `FEATURES.EMBED_AUTH` bitmask in `perspective:init` handshake for graceful degradation with old SDK versions
  - Fix base64url JWT decode (replace `-`/`_` with `+`/`/` before `atob`)
  - New `onAuth` callback in `EmbedConfig` for custom token handling

### Patch Changes

- Updated dependencies [6e1f4e4]
- Updated dependencies [ef714e7]
  - @perspective-ai/sdk@1.3.0

## 1.2.0

### Patch Changes

- 73afba3: docs: add auto-trigger popup documentation to READMEs
- Updated dependencies [73afba3]
- Updated dependencies [c057395]
  - @perspective-ai/sdk@1.2.0

## 1.1.3

### Patch Changes

- Updated dependencies [077220a]
- Updated dependencies [a834471]
  - @perspective-ai/sdk@1.1.3

## 1.1.2

### Patch Changes

- Updated dependencies [d646215]
  - @perspective-ai/sdk@1.1.2

## 1.1.1

### Patch Changes

- 77c5a2d: Fix `useStableCallback` always returning a truthy function even when the underlying callback is `undefined`. This caused `onNavigate` to silently swallow navigation instead of falling back to the SDK's default `window.location.href` redirect, since the SDK branches on the callback's truthiness. The hook now preserves `undefined` pass-through, fixing all embed types (Widget, Fullpage, FloatBubble, Slider, Popup).

## 1.1.0

### Patch Changes

- Updated dependencies [af48387]
  - @perspective-ai/sdk@1.1.0

## 1.0.1

### Patch Changes

- 9e6537d: remove unused constant values
- Updated dependencies [9e6537d]
  - @perspective-ai/sdk@1.0.1

## 1.0.0

### Major Changes

- 3577ac8: Refactor to hooks-first API

  BREAKING CHANGE: Replace button components with headless hooks
  - Remove `PopupButton` and `SliderButton` components
  - Add `usePopup`, `useSlider`, `useFloatBubble` hooks
  - Update `FloatBubble` to use `useFloatBubble` internally
  - Support controlled/uncontrolled patterns via `open`/`onOpenChange` props

  Migration:

  ```tsx
  // Before
  import { PopupButton } from "@perspective-ai/sdk-react";
  <PopupButton researchId="xxx">Open Survey</PopupButton>;

  // After
  import { usePopup } from "@perspective-ai/sdk-react";
  const { open } = usePopup({ researchId: "xxx" });
  <button onClick={open}>Open Survey</button>;
  ```

- 2cd5d5e: Initial alpha release with perspective SDK and React components
- 45839b0: Initial stable release with perspective SDK and React components with widget, popup, slider, float bubble, and fullpage embed types

### Patch Changes

- Updated dependencies [2cd5d5e]
- Updated dependencies [45839b0]
  - @perspective-ai/sdk@1.0.0

## 1.0.0-alpha.3

### Major Changes

- 3577ac8: Refactor to hooks-first API

  BREAKING CHANGE: Replace button components with headless hooks
  - Remove `PopupButton` and `SliderButton` components
  - Add `usePopup`, `useSlider`, `useFloatBubble` hooks
  - Update `FloatBubble` to use `useFloatBubble` internally
  - Support controlled/uncontrolled patterns via `open`/`onOpenChange` props

  Migration:

  ```tsx
  // Before
  import { PopupButton } from "@perspective-ai/sdk-react";
  <PopupButton researchId="xxx">Open Survey</PopupButton>;

  // After
  import { usePopup } from "@perspective-ai/sdk-react";
  const { open } = usePopup({ researchId: "xxx" });
  <button onClick={open}>Open Survey</button>;
  ```

### Patch Changes

- @perspective-ai/sdk@1.0.0-alpha.3

## 1.0.0-alpha.2

### Major Changes

- 2cd5d5e: Initial alpha release with perspective SDK and React components

### Patch Changes

- Updated dependencies [2cd5d5e]
  - @perspective-ai/sdk@1.0.0-alpha.2
