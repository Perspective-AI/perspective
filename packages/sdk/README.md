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

`configure` also has settings for Google Tag Manager. See [Install with Google Tag Manager](#install-with-google-tag-manager) for how they are used.

| Option          | Description                                                                                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dataLayer`     | Events sent to Google Tag Manager. Leave it out to send them only on pages that have Tag Manager. `false` turns them off. `true` sends them even when Tag Manager isn't on the page yet. |
| `dataLayerName` | Only needed if your Tag Manager setup uses a name other than the standard `dataLayer`.                                                                                                   |
| `observe`       | Script tag only. `true` shows interviews whose elements your site adds to the page later, for example after switching pages without a reload.                                            |

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

| Attribute                             | Description                                               |
| ------------------------------------- | --------------------------------------------------------- |
| `data-perspective-widget`             | Inline widget embed                                       |
| `data-perspective-frame`              | Widget frame: `"layout=fill,radius=4px,shadow=none,…"`    |
| `data-perspective-popup`              | Popup trigger button                                      |
| `data-perspective-slider`             | Slider trigger button                                     |
| `data-perspective-float`              | Floating chat bubble                                      |
| `data-perspective-fullpage`           | Full page embed                                           |
| `data-perspective-params`             | Custom params: `"key1=value1,key2=value2"`                |
| `data-perspective-theme`              | Theme: `"light"`, `"dark"`, or `"system"`                 |
| `data-perspective-brand`              | Light mode colors: `"primary=#xxx,bg=#yyy"`               |
| `data-perspective-brand-dark`         | Dark mode colors                                          |
| `data-perspective-no-style`           | Disable auto-styling on trigger buttons                   |
| `data-perspective-disable-close`      | Prevent user from closing popup/slider                    |
| `data-perspective-auto-open`          | Auto-open trigger: `"timeout:5000"` or `"exit-intent"`    |
| `data-perspective-show-once`          | Show-once dedup: `"session"`, `"visitor"`, or `"false"`   |
| `data-perspective-launcher-icon`      | Launcher icon: `"avatar"`, `"default"`, or image URL      |
| `data-perspective-launcher-style`     | Launcher CSS: `"width:64px;border-radius:12px"`           |
| `data-perspective-launcher-class`     | CSS class(es) for the launcher button                     |
| `data-perspective-teaser`             | `"false"` disables the float welcome teaser               |
| `data-perspective-teaser-delay`       | Milliseconds before the teaser appears (default 3000)     |
| `data-perspective-teaser-sound`       | `"false"` mutes the teaser chime                          |
| `data-perspective-teaser-dismissible` | `"false"` hides the teaser's × button                     |
| `data-perspective-datalayer`          | `"false"` stops this interview sending Tag Manager events |

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

You can add a Perspective interview to your website from Google Tag Manager,
without changing your site's code. It works on regular websites and on sites
that switch pages without a full reload (common with React, Next.js or Vue).

### Step 1: Create the tag

1. In Tag Manager, go to **Tags → New → Tag Configuration → Custom HTML**.
2. Paste the code below.
3. On the last line, replace `YOUR_RESEARCH_ID` with your research ID, and
   `float` with how you want the interview to appear (see the table below).

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

| Type       | What visitors see                         | Notes                                                                                                                                     |
| ---------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `float`    | A chat bubble in the corner of the screen | Works as is.                                                                                                                              |
| `fullpage` | The interview fills the whole page        | Works as is.                                                                                                                              |
| `widget`   | The interview shown inside the page       | Appears at the bottom of the page. To place it elsewhere, add `<div data-perspective-widget="YOUR_RESEARCH_ID"></div>` where you want it. |
| `popup`    | A button that opens a pop-up window       | Add the button to your page yourself, e.g. `<button data-perspective-popup="YOUR_RESEARCH_ID">Share feedback</button>`.                   |
| `slider`   | A button that opens a side panel          | Add the button to your page yourself, e.g. `<button data-perspective-slider="YOUR_RESEARCH_ID">Share feedback</button>`.                  |

If the page already has a Perspective element for this interview, the tag uses
it instead of adding a new one.

### Step 2: Choose when it runs

1. Add a trigger for **All Pages**, or a **Page View** trigger limited to the
   pages where the interview should appear.
2. If your site switches pages without a full reload, also add a
   **History Change** trigger. This runs the tag again each time a visitor
   moves to another page, so the interview shows up there too.

### Step 3: Preview and publish

Use **Preview** to check the interview appears where you expect, then
**Publish**.

### What the tag takes care of

- **It doesn't matter which loads first.** Your tag can run before the
  Perspective script has finished downloading. Nothing is lost; it starts as
  soon as the script is ready.
- **Running it again is safe.** If the tag runs again (for example on a
  History Change), the interview is not shown twice. If the page was replaced,
  the interview moves to the new page, and an open chat stays open.
- **Older installs keep working.** A plain
  `<div data-perspective-float="…"></div>` plus
  `<script src="https://getperspective.ai/v1/perspective.js"></script>`
  works exactly as before.

### Track results in Google Analytics

If Tag Manager is on the page, Perspective tells it what visitors do with the
interview. You can use these events as triggers in Tag Manager:

| Event name                           | What it means                                   |
| ------------------------------------ | ----------------------------------------------- |
| `perspective_widget_open`            | The interview was shown, or the chat was opened |
| `perspective_widget_ready`           | The interview finished loading and can be used  |
| `perspective_conversation_started`   | The visitor sent their first message            |
| `perspective_conversation_completed` | The visitor finished the interview              |
| `perspective_widget_close`           | The interview was closed                        |

Each event also says which interview it came from
(`perspective_research_id`) and how it was shown (`perspective_embed_type`),
so you can tell interviews apart in your reports.

To count finished interviews as conversions in Google Analytics 4:

1. In Tag Manager, create a **Custom Event** trigger with the event name
   `perspective_conversation_completed`.
2. Create a **Google Analytics: GA4 Event** tag that fires on that trigger.
3. In Google Analytics, mark the event as a **key event**.

This works the same whether you add Perspective with Tag Manager, the script
tag, the npm package or the React package. On pages without Tag Manager,
nothing is sent and nothing is added to the page.

### Avoid counting things twice

If you set up your own Perspective tracking before this was built in — for
example a Tag Manager tag that listens for Perspective messages, or site code
that sends these events in `onSubmit` — remove it when you upgrade. Otherwise
every event is counted twice. Or turn the built-in events off, as shown below.

### Turn the events off

- **For your whole site (Tag Manager):** in the tag above, add
  `w[n]("configure", { dataLayer: false });` on the line just before
  `w[n]("autoInit");`.
- **For your whole site (in code):**

  ```typescript
  import { configure } from "@perspective-ai/sdk";

  configure({ dataLayer: false });
  ```

- **For one interview only:** add `data-perspective-datalayer="false"` to its
  element. In code, pass `dataLayer: false` in its options, or
  `dataLayer={false}` to the React component or hook.

### If your site has a Content Security Policy

Some sites only allow scripts and frames from approved addresses. If yours
does, allow `https://getperspective.ai` for both scripts (`script-src`) and
frames (`frame-src`). Your developer will know if this applies.

<details>
<summary><strong>For developers: more options</strong></summary>

**Commands you can call from the tag.** Instead of adding an element to the
page, the tag can call these. Calls made before the script has loaded wait and
then run in order.

| Call                                        | What it does                                                     |
| ------------------------------------------- | ---------------------------------------------------------------- |
| `Perspective('configure', { ... })`         | Change settings (same as `configure()` in code)                  |
| `Perspective('init', { researchId, type })` | Open a popup, slider, float or fullpage interview                |
| `Perspective('mount', selector, config)`    | Show the interview inside the element matching `selector`        |
| `Perspective('autoInit')`                   | Look for `data-perspective-*` elements on the page and show them |
| `Perspective('destroy', researchId)`        | Remove one interview                                             |

After the script loads, `Perspective` keeps all its usual methods
(`Perspective.openPopup`, `Perspective.destroy`, and so on).

**Elements your site adds later.** If your site adds a Perspective element by
itself (without the tag running again), turn on `observe` and the interview
appears as soon as the element does:
`Perspective('configure', { observe: true })`.

**Other event settings.**

- `configure({ dataLayer: true })` sends events even if the page doesn't have
  Tag Manager's `window.dataLayer` yet, by creating it.
- `configure({ dataLayerName: "myLayer" })` sends events to a different name,
  if your Tag Manager setup doesn't use the standard `dataLayer`.

</details>

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
