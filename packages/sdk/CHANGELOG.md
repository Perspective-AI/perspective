# @perspective-ai/sdk

## 1.15.0

### Minor Changes

- 30483ae: Add an × dismiss button to the float teaser bubble so users can close it without opening the chat. Dismissing removes the teaser and the notification dot, and persists for the rest of the browser session (per agent). Configurable via `teaser.dismissible` (default `true`) or `data-perspective-teaser-dismissible="false"`.

## 1.14.1

### Patch Changes

- 7c34250: Fix float teaser delay from dashboard embed settings being ignored. Script-tag embeds armed the welcome sequence at mount with the default 3s delay before the async `/embed/config` fetch resolved, and never rescheduled when the API config arrived with a custom `embedSettings.teaser.delay`. The teaser is now deferred until the config resolves (it can no longer fire early while the fetch is in flight) and then fires at the resolved delay measured from mount, crediting the time already waited. Delay changes on a still-pending teaser reschedule it against the same anchor; a delivered or cancelled teaser is never re-armed by a late config refresh.

## 1.14.0

### Minor Changes

- fe18680: Replace the loading skeleton with the interview's real chrome.

  Instead of a skeleton that mirrors the interview UI's internal layout (welcome
  card, message, input pill) — which drifts whenever that UI changes — the
  loading state now renders what the interview actually looks like from the
  outside in:
  - the research's **scene image** (fetched from
    `{host}/interview/{researchId}/scene-image`) behind
  - a **frosted translucent card** (55% panel + backdrop blur, matching the
    app's card treatment), with
  - a **circular loader** centered in the card (40px) — a conic-gradient arc
    with a fading tail over a faint track, tinted with the brand primary
    resolved with the SDK's usual precedence: local `brand.primary` override →
    API embed config (`primaryColor` / `darkPrimaryColor`) → Perspective
    default (`#7c3aed` / `#a78bfa`). As essential loading motion it is not
    disabled by `prefers-reduced-motion`.

  The scene image is applied only after it has actually loaded, layered over
  the app's default surface color (`#f5f2f0` light, `#15171e` dark, or a custom
  `brand.bg`) — so a research without a scene (404), a slow network, or a
  blocked request cleanly degrades to a solid color.

  Because the loading state renders in the host page DOM (an overlay sibling of
  the cross-origin iframe), responsiveness is driven by CSS **container
  queries** on the slot the consumer provides — not viewport media queries. The
  card's sizing mirrors the interview app's own container queries (full-bleed
  below 672px width; a centered `max-width: 672px` box above it, with vertical
  padding stepping 4px → 48px → 80px at the app's 448px/768px container-height
  breakpoints), so the card doesn't jump at handoff. Breakpoints are in px, not
  the app's rem: the overlay lives in the host page, so rem would resolve against
  the host's (uncontrolled) root font-size, whereas the card must match the
  iframe's fixed pixels.

  `LoadingOptions` gains optional `researchId` and `host` (used for the scene
  URL) and `apiConfig` (used for the loader tint); all embed types pass them
  automatically.

  A new `prefetchSceneImage(researchId, host?)` export warms the scene image on
  intent signals — the SDK wires it to float-bubble hover/focus and to
  `data-perspective-popup`/`-slider` trigger elements — so deferred embeds open
  with the scene already cached.

## 1.13.1

### Patch Changes

- a0af14d: Change the float launcher's default icon from a microphone to lucide's AudioLines icon for the voice and voice+text channels.

## 1.13.0

### Minor Changes

- dc8254c: Add `teaser` config to control the float welcome teaser: `enabled` turns the whole welcome sequence (teaser bubble, chime, notification dot) on or off, `delay` sets when the teaser appears (ms, default 3000), and `sound` mutes the chime. Available programmatically (`createFloatBubble`, `FloatBubble`, `useFloatBubble`), via data attributes (`data-perspective-teaser`, `data-perspective-teaser-delay`, `data-perspective-teaser-sound`), and via API `embedSettings.teaser` (which takes precedence). Disabling the teaser through `update()` or late-arriving API config cancels a pending or visible teaser.

## 1.12.0

### Minor Changes

- d2f7626: Slider, popup, and float now hand their close (X) button to the interview app.

  The app renders its own X (it emits `perspective:close` when clicked), placed
  within its own header so it no longer overlaps the app's top-right UI such as
  the participant avatar or the `…` menu. The SDK now only draws a temporary X
  over the loading skeleton and removes it the moment the interview becomes
  visible, so there's never a double or overlapping X.
  - The `perspective:init` handshake now sends `renderCloseButton` (`true` unless
    `disableClose` is set) for slider, popup, and float. `widget`/`fullpage` have
    no X and don't send it.
  - The legacy `hasCloseButton` init flag is retired — the SDK no longer emits it.
    It remains on the `InitMessage` type as `@deprecated` because the app may still
    receive it from older deployed SDK clients.
  - Backdrop-click and Escape close handlers are unchanged; float's launcher bubble
    still closes the window. `disableClose` continues to suppress the X entirely.

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

## 1.9.0

### Minor Changes

- 09a5fbb: Add slider `push` mode and trigger toggle
  - **`sliderMode: "overlay" | "push"`** option (default `"overlay"`, backward compatible). In `push` mode the slider shifts page content aside so it occupies real layout space instead of overlaying it — no backdrop, the page stays interactive, and clicking the page no longer closes the slider. Falls back to `"overlay"` on narrow viewports. Available via the JS API, the `data-perspective-slider-mode="push"` attribute, and the `useSlider` React hook.
  - **Trigger toggle**: clicking the same `data-perspective-slider` trigger again now closes an open slider instead of re-opening it (respects `disableClose`). The React `useSlider` hook continues to expose `toggle()`.
  - **Fix**: adjust the slider close-button position.

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

## 1.7.1

### Patch Changes

- 7fb0a65: Align JSON-LD SoftwareApplication description with the main app's schema

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

## 1.6.2

### Patch Changes

- 6798566: Remove footer hint skeleton from the loading indicator

## 1.6.1

### Patch Changes

- 831e88b: Fix float bubble avatar padding by resetting default button padding

## 1.6.0

### Minor Changes

- e4bfca7: Apply embedSettings from config API with precedence over embed code

## 1.5.1

### Patch Changes

- 3d06d75: Make float button expand to fullscreen on mobile screens (≤640px) and hide the bubble when the window is open

## 1.5.0

### Minor Changes

- f9f9f02: Add launcher customization for float bubble — icon, style, className support

## 1.4.0

### Minor Changes

- 76a7ab1: Add `disableClose` option for popup and slider embeds
  - New `disableClose` config option hides the close button, disables overlay/backdrop click, and blocks ESC key
  - Programmatic `unmount()`/`destroy()` and iframe-initiated `perspective:close` still work
  - SDK now sends `hasCloseButton` flag in the `perspective:init` message so the iframe can adjust layout accordingly
  - Supported via `data-perspective-disable-close` HTML attribute for declarative usage
  - React hooks `usePopup` and `useSlider` forward the new option

## 1.3.1

### Patch Changes

- ca61c73: Persist popup, slider, and float open state within the current browser
  session. The SDK now restores shell state after reloads and React remounts
  while keeping explicit closes separate from teardown.

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

- 6e1f4e4: fix: clear NextAuth session on signout via hidden popup

  When a user signs out inside the iframe, open a hidden popup to the first-party domain's `/embed-auth/signout` endpoint to clear the NextAuth session cookie. Without this, the persisted session causes silent re-authentication on next visit.

## 1.2.0

### Minor Changes

- c057395: Improve float button UX with channel-aware icons, welcome teaser, and pulse animation
  - Show messages-square icon for text-only channel, microphone for voice/both
  - Add welcome message teaser with typewriter animation above the float button
  - Add notification chime sound and red notification dot
  - Default welcome message: "Have a question? I'm here to help."
  - Add click-draw pulse animation (disabled when chat is open)
  - Standardize button size to 58x58px with 20px positioning on all viewports
  - Support light and dark mode for teaser bubble

### Patch Changes

- 73afba3: docs: add auto-trigger popup documentation to READMEs

## 1.1.3

### Patch Changes

- 077220a: Auto-sync SDK_VERSION constant from package.json at build time via tsup define, removing the need for manual version bumps.
- a834471: Fix destroyAll not resetting initialized flags (auto-trigger popups would fail to re-open after destroyAll+autoInit), fix relative URLs being incorrectly blocked in redirect security check.

## 1.1.2

### Patch Changes

- d646215: Add auto-open trigger system for popup embeds with timeout and exit-intent triggers, show-once dedup, and cleanup tracking.

## 1.1.0

### Minor Changes

- af48387: Forward all parent URL search params to iframe

## 1.0.1

### Patch Changes

- 9e6537d: remove unused constant values

## 1.0.0

### Major Changes

- 2cd5d5e: Initial alpha release with perspective SDK and React components
- 45839b0: Initial stable release with perspective SDK and React components with widget, popup, slider, float bubble, and fullpage embed types

## 1.0.0-alpha.3

## 1.0.0-alpha.2

### Major Changes

- 2cd5d5e: Initial alpha release with perspective SDK and React components
