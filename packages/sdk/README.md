# @perspective-ai/sdk

Embed SDK for [Perspective AI](https://getperspective.ai) — AI-powered conversation agents for your website.

## Installation

```bash
npm install @perspective-ai/sdk
```

## Quick Start

### Vanilla JavaScript

```html
<button id="feedback-btn">Get Started</button>

<script type="module">
  import { openPopup } from "@perspective-ai/sdk";

  document.getElementById("feedback-btn").addEventListener("click", () => {
    openPopup({
      researchId: "your-research-id",
      onSubmit: () => {
        console.log("Conversation completed!");
      },
    });
  });
</script>
```

> **React?** Use [`@perspective-ai/sdk-react`](https://www.npmjs.com/package/@perspective-ai/sdk-react) for hooks and components.

## Embed Types

| Type     | Function                          | Description                     |
| -------- | --------------------------------- | ------------------------------- |
| Widget   | `createWidget(container, config)` | Inline embed in a container     |
| Popup    | `openPopup(config)`               | Centered modal overlay          |
| Slider   | `openSlider(config)`              | Side panel slides in from right |
| Float    | `createFloatBubble(config)`       | Floating chat bubble in corner  |
| Fullpage | `createFullpage(config)`          | Full viewport takeover          |

### Widget (Inline Embed)

```typescript
import { createWidget } from "@perspective-ai/sdk";

const container = document.getElementById("interview-container");
const handle = createWidget(container, {
  researchId: "your-research-id",
});
```

#### Sizing — two modes, picked automatically

The widget adapts to whether **you** have sized its container:

- **Bare drop-in** (no size on the container) → renders as a centered, framed
  **card** (border, rounded corners, soft shadow, `max-width: 480px`,
  `min-height: 640px`) so it looks finished with zero CSS.
- **Host-sized container** (you give it a height, `flex`, a grid track,
  absolute positioning, etc.) → the widget **fills the container exactly**, with
  no card framing. This is the original behaviour and is ideal for full-bleed or
  "full page" layouts (e.g. header + widget + footer):

```html
<header>…</header>
<!-- sized by the host → fills it edge to edge, no card -->
<div
  data-perspective-widget="your-research-id"
  style="height: calc(100vh - 120px)"
></div>
<footer>…</footer>
```

The widget's container and appearance are configured with the **`frame`**
object. **Force a mode** when auto-detection isn't what you want — `"fill"`
restores the full-width behaviour, `"card"` always frames:

```ts
createWidget(el, { researchId: "…", frame: { layout: "fill" } }); // or "card"
```

```tsx
<Widget researchId="…" frame={{ layout: "fill" }} /> // @perspective-ai/sdk-react
```

```html
<div data-perspective-widget="…" data-perspective-frame="layout=fill"></div>
```

#### Styling the frame

Every visual aspect of the card is exposed three equivalent ways — pick
whichever fits. They all resolve to the same CSS custom property:

| Aspect     | `frame` field | CSS variable                      | Default            |
| ---------- | ------------- | --------------------------------- | ------------------ |
| Max width  | `maxWidth`    | `--perspective-widget-max-width`  | `480px`            |
| Min height | `minHeight`   | `--perspective-widget-min-height` | `640px`            |
| Border     | `border`      | `--perspective-widget-border`     | `1px solid` border |
| Radius     | `radius`      | `--perspective-widget-radius`     | theme radius       |
| Shadow     | `shadow`      | `--perspective-widget-shadow`     | soft shadow        |
| Background | `background`  | `--perspective-widget-bg`         | theme background   |

**Precedence** (highest → lowest): a field set via `frame` / `data-perspective-frame`
(the SDK writes it as an inline variable on the wrapper) → your own
`--perspective-widget-*` declaration in CSS → the built-in default. So a `frame`
field overrides a stylesheet variable. For any field you _don't_ pass to
`frame`, your CSS variable wins at **any specificity** — the SDK leaves that var
unset, so there's nothing to out-specify and it isn't clobbered by global resets
like Tailwind Preflight's `* { border-width: 0 }`.

```tsx
// 1) The frame object (config / React prop)
<Widget researchId="…" frame={{ radius: "4px", shadow: "none" }} />
```

```html
<!-- 2) Script tag — packed data attribute (same format as data-perspective-brand) -->
<div
  data-perspective-widget="…"
  data-perspective-frame="radius=4px,shadow=none,layout=card"
></div>
```

```css
/* 3) Stylesheet — any selector, even :root */
.perspective-widget {
  --perspective-widget-radius: 4px;
}
```

> Sizing the container (`height`, `flex`, `height: 100%`, …) switches to fill
> mode automatically; `frame.layout` overrides that detection either way. Values
> that contain commas (e.g. a multi-layer `box-shadow`) can't be packed into the
> data attribute — use the CSS variable for those.

### Popup Modal

```typescript
import { openPopup } from "@perspective-ai/sdk";

const handle = openPopup({
  researchId: "your-research-id",
  theme: "dark",
});
```

### Slider Panel

```typescript
import { openSlider } from "@perspective-ai/sdk";

const handle = openSlider({
  researchId: "your-research-id",
});
```

### Float Bubble

```typescript
import { createFloatBubble } from "@perspective-ai/sdk";

const handle = createFloatBubble({
  researchId: "your-research-id",
});

// Control the bubble
handle.open();
handle.close();
handle.toggle();
console.log(handle.isOpen); // boolean
```

### Fullpage

```typescript
import { createFullpage } from "@perspective-ai/sdk";

const handle = createFullpage({
  researchId: "your-research-id",
});
```

## Configuration

```typescript
interface EmbedConfig {
  // Required
  researchId: string; // The ID of your Perspective agent

  // Optional
  host?: string; // Custom API host
  theme?: "light" | "dark" | "system"; // Theme preference (default: "system")
  channel?: "TEXT" | "VOICE" | ["TEXT", "VOICE"]; // Interaction mode (default: from server config)
  welcomeMessage?: string; // Teaser text next to float button (float-type only)
  teaser?: TeaserConfig; // Teaser on/off, delay, sound, and dismissibility (float-type only)
  buttonText?: string; // Custom text for popup/slider trigger buttons
  params?: Record<string, string>; // Custom URL parameters for tracking
  brand?: {
    light?: BrandColors; // Light mode brand colors
    dark?: BrandColors; // Dark mode brand colors
  };
  launcher?: LauncherConfig; // Float button customization (see Launcher Customization section)
  disableClose?: boolean; // Prevent user from closing popup/slider (hides X, blocks ESC/overlay)

  // Callbacks
  onReady?: () => void;
  onSubmit?: (data: { researchId: string }) => void;
  onClose?: () => void;
  onNavigate?: (url: string) => void; // Handle navigation (default: window.location.href)
  onError?: (error: EmbedError) => void;
  onAuth?: (data: { researchId: string; token: string }) => void; // Cross-origin auth complete
}

interface BrandColors {
  primary?: string; // Primary accent — buttons, progress bar, links, mic, focus rings
  bg?: string; // Interview background behind the card, shown only when no background scene is set
  secondary?: string; // @deprecated — ignored, no longer forwarded (no-op)
  text?: string; // @deprecated — ignored, no longer forwarded (no-op)
}
```

## Handle API

All embed functions return a handle for programmatic control:

### EmbedHandle (Widget, Popup, Slider, Fullpage)

```typescript
interface EmbedHandle {
  unmount(): void; // Remove the embed
  update(options): void; // Update callbacks
  destroy(): void; // Alias for unmount (deprecated)
  readonly iframe: HTMLIFrameElement | null;
  readonly container: HTMLElement | null;
  readonly researchId: string;
  readonly type: EmbedType;
}
```

### FloatHandle (Float Bubble)

```typescript
interface FloatHandle extends EmbedHandle {
  open(): void; // Open the chat window
  close(): void; // Close the chat window
  toggle(): void; // Toggle open/close
  readonly isOpen: boolean; // Current state
  readonly type: "float";
}
```

## Launcher Customization (Float Bubble)

Customize the float bubble's icon, size, shape, color, and CSS via the `launcher` config:

### Icon Options

```typescript
import { createFloatBubble } from "@perspective-ai/sdk";

// Default — channel-based SVG (mic for voice, chat for text)
createFloatBubble({ researchId: "xxx" });

// Brand avatar — fetched from the embed config API
createFloatBubble({
  researchId: "xxx",
  launcher: { icon: "avatar" },
});

// Custom image URL
createFloatBubble({
  researchId: "xxx",
  launcher: { icon: { url: "https://example.com/icon.png" } },
});

// Inline SVG
createFloatBubble({
  researchId: "xxx",
  launcher: { icon: { svg: '<svg viewBox="0 0 24 24">...</svg>' } },
});
```

### Style & Size

Use `launcher.style` for inline CSS overrides (highest precedence, overrides brand colors):

```typescript
createFloatBubble({
  researchId: "xxx",
  launcher: {
    style: {
      width: "64px", // default: 58px
      height: "64px",
      borderRadius: "12px", // default: 50% (circle)
      bottom: "24px", // default: 20px
      right: "24px", // default: 20px
      backgroundColor: "#10b981",
      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)",
    },
  },
});
```

### Custom CSS Class

Use `launcher.className` to add CSS classes (additive — existing SDK classes are preserved):

```typescript
createFloatBubble({
  researchId: "xxx",
  launcher: { className: "my-custom-launcher" },
});
```

### CDN Data Attributes

```html
<!-- Custom icon URL -->
<div
  data-perspective-float="your-research-id"
  data-perspective-launcher-icon="https://example.com/icon.png"
></div>

<!-- Avatar icon with style overrides -->
<div
  data-perspective-float="your-research-id"
  data-perspective-launcher-icon="avatar"
  data-perspective-launcher-style="width:64px;height:64px;border-radius:12px"
  data-perspective-launcher-class="my-class"
></div>
```

### Launcher Config Reference

```typescript
interface LauncherConfig {
  icon?:
    | "default" // Channel-based SVG (default)
    | "avatar" // Brand avatar from config API
    | { url: string } // Custom image URL
    | { svg: string }; // Inline SVG markup (JS API only)
  style?: LauncherStyle; // CSS overrides (e.g. width, borderRadius, backgroundColor)
  className?: string; // CSS class(es) to add to the button
}
```

| Data Attribute                    | Description                                      |
| --------------------------------- | ------------------------------------------------ |
| `data-perspective-launcher-icon`  | Icon: `"avatar"`, `"default"`, or an image URL   |
| `data-perspective-launcher-style` | CSS overrides: `"width:64px;border-radius:12px"` |
| `data-perspective-launcher-class` | CSS class(es) to add to the button               |

### Style Precedence

Highest wins:

1. `launcher.style` (e.g. `backgroundColor`)
2. `brand.light.primary` / `brand.dark.primary`
3. Server-configured theme colors
4. SDK default (`#7629C8`)

### Image Error Fallback

When `icon` is `{ url }` or `"avatar"` and the image fails to load, the button automatically falls back to the default channel-based SVG icon.

## Channel & Welcome Message

### Channel

Control which interaction mode the embed uses:

```typescript
// Voice only (default)
createFloatBubble({ researchId: "xxx" });

// Text only — shows chat icon instead of mic
createFloatBubble({ researchId: "xxx", channel: "TEXT" });

// Both channels enabled
createFloatBubble({ researchId: "xxx", channel: ["TEXT", "VOICE"] });
```

If not set, the channel defaults to the server-configured value for the research.

### Welcome Message

Show a teaser bubble next to the float button with a typewriter animation:

```typescript
createFloatBubble({
  researchId: "xxx",
  welcomeMessage: "Have a question? I'm here to help.",
});
```

The teaser appears after 3 seconds with a chime sound. Click the teaser or the float button to open the chat, or the teaser's × button to dismiss it without opening the chat (the dismissal holds for the rest of the browser session). Only applies to float-type embeds.

### Teaser Control

Control whether and when the teaser appears via the `teaser` option:

```typescript
createFloatBubble({
  researchId: "xxx",
  welcomeMessage: "Have a question? I'm here to help.",
  teaser: {
    enabled: true, // false disables the whole welcome sequence (teaser, chime, dot)
    delay: 5000, // ms after mount before the teaser appears (default: 3000)
    sound: false, // mute the chime (default: true)
    dismissible: false, // hide the teaser's × button (default: true)
  },
});
```

- `enabled: false` turns off the teaser bubble, the chime sound, and the notification dot entirely.
- `delay` sets when the teaser bubble appears, in milliseconds. The chime tracks the teaser, playing 1 second before it appears (or immediately, when `delay` is under a second).
- `sound: false` mutes the chime while keeping the teaser bubble.
- `dismissible: false` removes the × button from the teaser bubble. By default, dismissing the teaser also clears the notification dot and keeps the teaser hidden for the rest of the browser session (per agent, stored in `sessionStorage`).

Or declaratively via data attributes:

```html
<div
  data-perspective-float="research_xxx"
  data-perspective-teaser="false"
></div>

<div
  data-perspective-float="research_xxx"
  data-perspective-teaser-delay="5000"
  data-perspective-teaser-sound="false"
></div>
```

| Data Attribute                        | Description                             |
| ------------------------------------- | --------------------------------------- |
| `data-perspective-teaser`             | `"false"` disables the welcome sequence |
| `data-perspective-teaser-delay`       | Milliseconds before the teaser appears  |
| `data-perspective-teaser-sound`       | `"false"` mutes the chime               |
| `data-perspective-teaser-dismissible` | `"false"` hides the teaser's × button   |

Teaser settings configured in the Perspective dashboard (delivered via the config API) take precedence over values passed in code.

## Disable Close

Prevent users from closing the popup or slider (hides the close button, disables ESC key and overlay click):

```typescript
openPopup({
  researchId: "xxx",
  disableClose: true,
});
```

```html
<button
  data-perspective-popup="your-research-id"
  data-perspective-disable-close
>
  Start
</button>
```

Useful for mandatory onboarding flows or required interviews.

## Embed Auth (onAuth)

Handle cross-origin authentication tokens from embedded interviews:

```typescript
openPopup({
  researchId: "xxx",
  onAuth: ({ researchId, token }) => {
    // Store or forward the auth token
    console.log("Auth token received:", token);
  },
});
```

The `onAuth` callback fires when the embedded interview completes an authentication flow. The token can be used for custom session management or API calls.

## State Persistence

The SDK automatically persists the open/closed state of popup, slider, and float embeds across page navigations within the same session.

- Uses `sessionStorage` (resets when the tab/window closes)
- Key format: `perspective-embed-state:{host}:{type}:{researchId}`
- On page load, if a previous embed was open, it auto-restores to the open state
- `handle.destroy()` persists a "closed" state (won't auto-restore)
- `handle.unmount()` cleans up without affecting persisted state (for framework cleanup)

This happens automatically — no configuration needed.

## Global Configuration

Configure SDK-wide defaults before creating embeds:

```typescript
import { configure, getConfig } from "@perspective-ai/sdk";

// Set global host
configure({ host: "https://custom-host.example.com" });

// Get current config
const config = getConfig();
```

`configure` also accepts Google Tag Manager settings. See [Install with Google Tag Manager](#install-with-google-tag-manager) for the event names and the loader stub.

| Option          | Description                                                                                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dataLayer`     | `false` disables lifecycle events. `true` creates the target array when it is missing. Omit it to push only if the array already exists — `window.dataLayer` is not created. |
| `dataLayerName` | Property on `window` to push to. Default `"dataLayer"`. A custom name is created only when `dataLayer: true`.                                                                |
| `observe`       | Browser bundle only. `true` watches the document and runs `autoInit` when `data-perspective-*` nodes are inserted after the first scan.                                      |

## Custom Parameters

Pass tracking or attribution parameters:

```typescript
openPopup({
  researchId: "your-research-id",
  params: {
    email: "user@example.com",
    name: "John Doe",
    source: "marketing-campaign",
  },
});
```

### Reserved Parameters

These parameters are managed by the SDK and cannot be overridden via `params`:

- `embed`, `embed_type`, `theme`
- Brand colors: `brand.primary`, `brand.bg`, etc.
- UTM parameters: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`

## Constants

Import SSR-safe constants for advanced use cases:

```typescript
import {
  SDK_VERSION,
  MESSAGE_TYPES,
  DATA_ATTRS,
  PARAM_KEYS,
  THEME_VALUES,
} from "@perspective-ai/sdk";

// Or import from the constants submodule
import { MESSAGE_TYPES } from "@perspective-ai/sdk/constants";
```

### Available Constants

| Constant        | Description                           |
| --------------- | ------------------------------------- |
| `SDK_VERSION`   | Current SDK version                   |
| `FEATURES`      | Feature flags for version negotiation |
| `MESSAGE_TYPES` | PostMessage event types               |
| `DATA_ATTRS`    | HTML data attribute names             |
| `PARAM_KEYS`    | URL parameter keys                    |
| `BRAND_KEYS`    | Brand color parameter keys            |
| `THEME_VALUES`  | Valid theme values                    |

## Types

All types are exported for TypeScript users:

```typescript
import type {
  EmbedConfig,
  EmbedHandle,
  FloatHandle,
  EmbedError,
  EmbedType,
  BrandColors,
  ThemeConfig,
  SDKConfig,
  // Auto-trigger types
  TriggerConfig,
  TriggerType,
  ShowOnce,
  AutoOpenConfig,
} from "@perspective-ai/sdk";
```

## Auto-Trigger Popups

Open popups automatically based on configurable triggers — no user click required. Ideal for lead capture, onboarding, intake flows, and engagement prompts.

### JavaScript API

```typescript
import {
  openPopup,
  setupTrigger,
  shouldShow,
  markShown,
} from "@perspective-ai/sdk";
import type { TriggerConfig, ShowOnce } from "@perspective-ai/sdk";

const researchId = "your-research-id";
const showOnce: ShowOnce = "session"; // "session" | "visitor" | false

if (shouldShow(researchId, showOnce)) {
  const cleanup = setupTrigger({ type: "timeout", delay: 5000 }, () => {
    markShown(researchId, showOnce);
    openPopup({ researchId });
  });

  // Call cleanup() to cancel the pending trigger
}
```

### Trigger Types

| Trigger     | Config                             | Description                          |
| ----------- | ---------------------------------- | ------------------------------------ |
| Timeout     | `{ type: "timeout", delay: 5000 }` | Open after a delay (ms)              |
| Exit Intent | `{ type: "exit-intent" }`          | Open when cursor leaves the viewport |

### Show-Once Dedup

| Value       | Storage          | Behavior                                         |
| ----------- | ---------------- | ------------------------------------------------ |
| `"session"` | `sessionStorage` | Show once per browser session (default)          |
| `"visitor"` | `localStorage`   | Show once per visitor (persists across sessions) |
| `false`     | —                | Always show                                      |

### Functions

| Function           | Signature                                                     | Description                                        |
| ------------------ | ------------------------------------------------------------- | -------------------------------------------------- |
| `setupTrigger`     | `(config: TriggerConfig, callback: () => void) => () => void` | Set up a trigger, returns cleanup function         |
| `shouldShow`       | `(researchId: string, showOnce: ShowOnce) => boolean`         | Check if popup should show (dedup check)           |
| `markShown`        | `(researchId: string, showOnce: ShowOnce) => void`            | Mark popup as shown for dedup                      |
| `parseTriggerAttr` | `(value: string) => TriggerConfig`                            | Parse data attribute value (e.g. `"timeout:5000"`) |

## CDN / Script Tag Usage

For non-module environments, use the browser bundle:

```html
<script src="https://getperspective.ai/v1/perspective.js"></script>
```

### Declarative (Data Attributes)

```html
<!-- Inline widget -->
<div data-perspective-widget="your-research-id"></div>

<!-- Popup trigger -->
<button data-perspective-popup="your-research-id">Start Conversation</button>

<!-- Slider trigger -->
<button data-perspective-slider="your-research-id">Open Panel</button>

<!-- Float bubble -->
<div data-perspective-float="your-research-id"></div>

<!-- Fullpage -->
<div data-perspective-fullpage="your-research-id"></div>
```

### Data Attributes Reference

| Attribute                             | Description                                             |
| ------------------------------------- | ------------------------------------------------------- |
| `data-perspective-widget`             | Inline widget embed                                     |
| `data-perspective-frame`              | Widget frame: `"layout=fill,radius=4px,shadow=none,…"`  |
| `data-perspective-popup`              | Popup trigger button                                    |
| `data-perspective-slider`             | Slider trigger button                                   |
| `data-perspective-float`              | Floating chat bubble                                    |
| `data-perspective-fullpage`           | Full page embed                                         |
| `data-perspective-params`             | Custom params: `"key1=value1,key2=value2"`              |
| `data-perspective-theme`              | Theme: `"light"`, `"dark"`, or `"system"`               |
| `data-perspective-brand`              | Light mode colors: `"primary=#xxx,bg=#yyy"`             |
| `data-perspective-brand-dark`         | Dark mode colors                                        |
| `data-perspective-no-style`           | Disable auto-styling on trigger buttons                 |
| `data-perspective-disable-close`      | Prevent user from closing popup/slider                  |
| `data-perspective-auto-open`          | Auto-open trigger: `"timeout:5000"` or `"exit-intent"`  |
| `data-perspective-show-once`          | Show-once dedup: `"session"`, `"visitor"`, or `"false"` |
| `data-perspective-launcher-icon`      | Launcher icon: `"avatar"`, `"default"`, or image URL    |
| `data-perspective-launcher-style`     | Launcher CSS: `"width:64px;border-radius:12px"`         |
| `data-perspective-launcher-class`     | CSS class(es) for the launcher button                   |
| `data-perspective-teaser`             | `"false"` disables the float welcome teaser             |
| `data-perspective-teaser-delay`       | Milliseconds before the teaser appears (default 3000)   |
| `data-perspective-teaser-sound`       | `"false"` mutes the teaser chime                        |
| `data-perspective-teaser-dismissible` | `"false"` hides the teaser's × button                   |
| `data-perspective-datalayer`          | `"false"` skips dataLayer events for this embed         |

### Auto-Trigger (Data Attributes)

```html
<!-- Auto-open popup after 5 seconds, once per session -->
<div
  data-perspective-popup="your-research-id"
  data-perspective-auto-open="timeout:5000"
  data-perspective-show-once="session"
  style="display:none"
></div>

<!-- Exit-intent popup, show every time -->
<div
  data-perspective-popup="your-research-id"
  data-perspective-auto-open="exit-intent"
  data-perspective-show-once="false"
  style="display:none"
></div>
```

When `data-perspective-auto-open` is present, the element acts as a hidden config holder — no button styling is applied.

### Programmatic (Global API)

```html
<script>
  // Direct functions
  Perspective.openPopup({ researchId: "xxx" });
  Perspective.openSlider({ researchId: "xxx" });
  Perspective.createFloatBubble({ researchId: "xxx" });
  Perspective.createFullpage({ researchId: "xxx" });

  // Mount widget into container
  Perspective.mount("#container", { researchId: "xxx" });

  // Generic init with type
  Perspective.init({ researchId: "xxx", type: "popup" });

  // Destroy by researchId
  Perspective.destroy("xxx");
  Perspective.destroyAll();

  // Configuration
  Perspective.configure({ host: "https://custom.example.com" });
</script>
```

## Install with Google Tag Manager

Tag Manager injects the embed script asynchronously, and a History Change
trigger runs the tag again after a single-page navigation. The browser bundle
supports both:

- Calls made before the script arrives are queued and replayed. After load,
  `Perspective` is still a function, so a later `Perspective('autoInit')` runs
  immediately, and the existing methods (`Perspective.openPopup`,
  `Perspective.autoInit`, `Perspective.destroy`, …) stay in place.
- A second load is not a no-op. Queued commands are replayed and `autoInit`
  scans the page again.
- If an embed's container (or the marker a float / fullpage was mounted from)
  is no longer in the document, that instance is destroyed and mounted into the
  new element.
- `configure({ observe: true })` — or `Perspective('configure', { observe: true })`
  — watches for `data-perspective-*` nodes added later. Use this when the page
  inserts the marker without running the tag again.

The declarative snippet still works unchanged:

```html
<div data-perspective-float="your-research-id"></div>
<script src="https://getperspective.ai/v1/perspective.js"></script>
```

### Custom HTML tag

Replace `YOUR_RESEARCH_ID` and the embed type (`float`, `widget`, `popup`,
`slider`, or `fullpage`).

```html
<script>
  (function (w, d, n, researchId, embedType) {
    w[n] =
      w[n] ||
      function () {
        (w[n].q = w[n].q || []).push(arguments);
      };
    var attr = "data-perspective-" + embedType;
    if (!d.querySelector("[" + attr + '="' + researchId + '"]')) {
      var el = d.createElement("div");
      el.setAttribute(attr, researchId);
      (d.body || d.documentElement).appendChild(el);
    }
    w[n]("autoInit");
    if (d.getElementById("perspective-sdk")) return;
    var s = d.createElement("script");
    s.id = "perspective-sdk";
    s.async = true;
    s.src = "https://getperspective.ai/v1/perspective.js";
    (d.head || d.documentElement).appendChild(s);
  })(window, document, "Perspective", "YOUR_RESEARCH_ID", "float");
</script>
```

Queued commands, if you would rather not use a data attribute:

| Call                                        | Effect                             |
| ------------------------------------------- | ---------------------------------- |
| `Perspective('configure', { ... })`         | Same as `Perspective.configure`    |
| `Perspective('init', { researchId, type })` | Popup, slider, float, or fullpage  |
| `Perspective('mount', selector, config)`    | Inline widget                      |
| `Perspective('autoInit')`                   | Scan `data-perspective-*` elements |
| `Perspective('destroy', researchId)`        | Tear down one embed                |

Suggested trigger:

1. Tags → New → Custom HTML. Paste the snippet.
2. Fire on **All Pages** (or Page View) and filter by the page path that should show the interview.
3. On a single-page app, also fire on **History Change** so the tag runs after client-side navigations.
4. Preview, then Publish.

`configure({ observe: true })` is the alternative to a History Change trigger when the app itself inserts the marker node.

### dataLayer events

When `window.dataLayer` (or `configure({ dataLayerName })`) already exists, the SDK pushes the events below. This applies to every build — the script tag, the npm package and `@perspective-ai/sdk-react` — not only Tag Manager installs.

| `event`                              | When                                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| `perspective_widget_open`            | A widget, popup, slider, or fullpage is shown, or a float window opens       |
| `perspective_widget_ready`           | The iframe is interactive (`perspective:ready`)                              |
| `perspective_conversation_started`   | The participant sends their first message (`perspective:conversation-start`) |
| `perspective_conversation_completed` | The interview is submitted (`perspective:submit`)                            |
| `perspective_widget_close`           | The embed closes                                                             |

Each push is `{ event, perspective_research_id, perspective_embed_type }`.

The SDK does **not** create `window.dataLayer` unless you opt in with
`configure({ dataLayer: true })`. To opt out everywhere:

```typescript
import { configure } from "@perspective-ai/sdk";

configure({ dataLayer: false });
```

With the script tag, `Perspective('configure', { dataLayer: false })` does the
same. To opt out a single embed, add `data-perspective-datalayer="false"` to a
script-tag embed, or pass `dataLayer: false` in the config for `createWidget`,
`openPopup`, `openSlider`, `createFloatBubble` or `createFullpage` (or as a
prop to the `@perspective-ai/sdk-react` components and hooks).

In Google Analytics 4, add a Custom Event trigger for
`perspective_conversation_completed`, fire a GA4 Event tag on it, and mark that
event as a key event. Allow `https://getperspective.ai` in `script-src` and
`frame-src` if the page has a Content Security Policy.

**Upgrading:** if your site already pushes its own Perspective events — a
Custom HTML tag that listens for `perspective:*` messages, or `onSubmit` /
`onReady` callbacks that call `dataLayer.push` — remove that code or call
`configure({ dataLayer: false })`, so the events are not counted twice.

## SSR Safety

The SDK is SSR-safe. All DOM access is guarded and returns no-op handles on the server:

```typescript
// Safe to call during SSR - returns a no-op handle
const handle = openPopup({ researchId: "xxx" });
handle.unmount(); // No-op on server
```

## Browser Support

- Chrome 80+
- Firefox 80+
- Safari 14+
- Edge 80+

## License

MIT
