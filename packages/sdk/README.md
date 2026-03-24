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
  primary?: string; // Primary brand color
  secondary?: string; // Secondary brand color
  bg?: string; // Background color
  text?: string; // Text color
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

The teaser appears after 3 seconds with a chime sound. Click the teaser or the float button to open the chat. Only applies to float-type embeds.

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

| Attribute                         | Description                                             |
| --------------------------------- | ------------------------------------------------------- |
| `data-perspective-widget`         | Inline widget embed                                     |
| `data-perspective-popup`          | Popup trigger button                                    |
| `data-perspective-slider`         | Slider trigger button                                   |
| `data-perspective-float`          | Floating chat bubble                                    |
| `data-perspective-fullpage`       | Full page embed                                         |
| `data-perspective-params`         | Custom params: `"key1=value1,key2=value2"`              |
| `data-perspective-theme`          | Theme: `"light"`, `"dark"`, or `"system"`               |
| `data-perspective-brand`          | Light mode colors: `"primary=#xxx,bg=#yyy"`             |
| `data-perspective-brand-dark`     | Dark mode colors                                        |
| `data-perspective-no-style`       | Disable auto-styling on trigger buttons                 |
| `data-perspective-disable-close`  | Prevent user from closing popup/slider                  |
| `data-perspective-auto-open`      | Auto-open trigger: `"timeout:5000"` or `"exit-intent"`  |
| `data-perspective-show-once`      | Show-once dedup: `"session"`, `"visitor"`, or `"false"` |
| `data-perspective-launcher-icon`  | Launcher icon: `"avatar"`, `"default"`, or image URL    |
| `data-perspective-launcher-style` | Launcher CSS: `"width:64px;border-radius:12px"`         |
| `data-perspective-launcher-class` | CSS class(es) for the launcher button                   |

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
