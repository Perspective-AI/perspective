# @perspective-ai/sdk-react

React hooks and components for [Perspective AI](https://getperspective.ai) — AI-powered conversation agents.

> **Not using React?** Use [`@perspective-ai/sdk`](https://www.npmjs.com/package/@perspective-ai/sdk) for vanilla JavaScript.

## Installation

```bash
npm install @perspective-ai/sdk-react
```

**Peer Dependencies:** React 18+ or 19+

## Quick Start

```tsx
import { usePopup } from "@perspective-ai/sdk-react";

function App() {
  const { open } = usePopup({
    researchId: "your-research-id",
    onSubmit: () => console.log("Conversation completed!"),
  });

  return <button onClick={open}>Get Started</button>;
}
```

## API Overview

| API              | Type      | Description                            |
| ---------------- | --------- | -------------------------------------- |
| `usePopup`       | Hook      | Open popup modal programmatically      |
| `useSlider`      | Hook      | Open slider panel programmatically     |
| `useAutoOpen`    | Hook      | Auto-trigger popup (timeout/exit)      |
| `useFloatBubble` | Hook      | Floating chat bubble lifecycle         |
| `Widget`         | Component | Inline embed in a container            |
| `Fullpage`       | Component | Full viewport takeover                 |
| `FloatBubble`    | Component | Convenience wrapper for useFloatBubble |

**Mental Model:**

- **Hooks** for overlays (popup, slider, float bubble) - you control the trigger
- **Components** for embeds (widget, fullpage) - render inline DOM

## Hooks

### usePopup

Open a popup modal with your own trigger element.

```tsx
import { usePopup } from "@perspective-ai/sdk-react";

function App() {
  const { open, close, isOpen } = usePopup({
    researchId: "your-research-id",
    onSubmit: () => console.log("Done!"),
  });

  return (
    <>
      <button onClick={open}>Start Conversation</button>
      {isOpen && <span>Survey is open</span>}
    </>
  );
}
```

**Programmatic trigger:**

```tsx
const { open } = usePopup({ researchId: "xxx" });

useEffect(() => {
  if (userCompletedCheckout) {
    open();
  }
}, [userCompletedCheckout, open]);
```

**Controlled mode:**

```tsx
const [isOpen, setIsOpen] = useState(false);

const popup = usePopup({
  researchId: "xxx",
  open: isOpen,
  onOpenChange: setIsOpen,
});

// External control
<button onClick={() => setIsOpen(true)}>Open from anywhere</button>;
```

### useSlider

Open a slider panel with your own trigger element.

```tsx
import { useSlider } from "@perspective-ai/sdk-react";

function App() {
  const { open, close, isOpen } = useSlider({
    researchId: "your-research-id",
  });

  return <button onClick={open}>Open Panel</button>;
}
```

### useAutoOpen

Auto-trigger a popup based on a timeout or exit intent — no user click needed.

```tsx
import { useAutoOpen } from "@perspective-ai/sdk-react";

function FeedbackTrigger() {
  const { cancel, triggered } = useAutoOpen({
    researchId: "your-research-id",
    trigger: { type: "timeout", delay: 5000 },
    showOnce: "session",
    onSubmit: () => console.log("Completed!"),
  });

  // Renders nothing — popup opens automatically after 5s
  return null;
}
```

**Exit intent:**

```tsx
useAutoOpen({
  researchId: "your-research-id",
  trigger: { type: "exit-intent" },
  showOnce: "visitor",
});
```

**Options:**

| Option       | Type            | Default     | Description                                                              |
| ------------ | --------------- | ----------- | ------------------------------------------------------------------------ |
| `researchId` | `string`        | —           | Research ID (required)                                                   |
| `trigger`    | `TriggerConfig` | —           | `{ type: "timeout", delay: ms }` or `{ type: "exit-intent" }` (required) |
| `showOnce`   | `ShowOnce`      | `"session"` | `"session"`, `"visitor"`, or `false`                                     |

Plus all standard `EmbedConfig` options (`theme`, `params`, `brand`, callbacks).

**Returns:**

| Property    | Type         | Description                   |
| ----------- | ------------ | ----------------------------- |
| `cancel`    | `() => void` | Cancel the pending trigger    |
| `triggered` | `boolean`    | Whether the trigger has fired |

### useFloatBubble

Manage a floating chat bubble lifecycle.

```tsx
import { useFloatBubble } from "@perspective-ai/sdk-react";

function App() {
  const { open, close, isOpen } = useFloatBubble({
    researchId: "your-research-id",
  });

  // Bubble mounts on component mount
  // Use open/close for programmatic control
  return null;
}
```

**With launcher customization:**

```tsx
import { HeadphonesIcon } from "lucide-react";

const { open, close } = useFloatBubble({
  researchId: "your-research-id",
  launcher: {
    icon: <HeadphonesIcon className="w-6 h-6" />, // React component as icon
    style: {
      width: "64px",
      height: "64px",
      borderRadius: "12px",
      backgroundColor: "#0ea5e9",
    },
  },
});
```

React components passed as `icon` are converted to static SVG markup for the core SDK. See the [core SDK docs](../sdk/README.md#launcher-customization-float-bubble) for all `launcher` options.

## Components

### Widget

Inline embed that renders in a container.

```tsx
import { Widget } from "@perspective-ai/sdk-react";

<Widget
  researchId="your-research-id"
  onSubmit={() => console.log("Done!")}
  className="my-widget"
  style={{ height: 600 }}
/>;
```

### Fullpage

Full viewport takeover embed.

```tsx
import { Fullpage } from "@perspective-ai/sdk-react";

<Fullpage researchId="your-research-id" />;
```

### FloatBubble

Convenience wrapper around `useFloatBubble` hook.

```tsx
import { FloatBubble } from "@perspective-ai/sdk-react";

<FloatBubble researchId="your-research-id" />;
```

**With launcher customization:**

```tsx
<FloatBubble
  researchId="your-research-id"
  launcher={{
    icon: "avatar",
    style: { width: "64px", height: "64px", borderRadius: "12px" },
    className: "my-custom-launcher",
  }}
/>
```

## Hook Options

All hooks accept options from `EmbedConfig`:

```typescript
interface UsePopupOptions {
  researchId: string; // The ID of your Perspective agent
  host?: string;
  theme?: "light" | "dark" | "system";
  channel?: "TEXT" | "VOICE" | ["TEXT", "VOICE"]; // Interaction mode
  welcomeMessage?: string; // Teaser text (float only)
  params?: Record<string, string>;
  brand?: {
    light?: {
      primary?: string;
      secondary?: string;
      bg?: string;
      text?: string;
    };
    dark?: { primary?: string; secondary?: string; bg?: string; text?: string };
  };
  disableClose?: boolean; // Prevent closing popup/slider

  // Callbacks
  onReady?: () => void;
  onSubmit?: (data: { researchId: string }) => void;
  onClose?: () => void;
  onNavigate?: (url: string) => void;
  onError?: (error: EmbedError) => void;
  onAuth?: (data: { researchId: string; token: string }) => void;

  // Controlled mode
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
```

`useFloatBubble` also accepts `launcher` for button customization — see [Launcher Customization](#with-launcher-customization-1).

## Hook Return Types

```typescript
interface UsePopupReturn {
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: boolean;
  handle: EmbedHandle | null;
}

interface UseSliderReturn {
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: boolean;
  handle: EmbedHandle | null;
}

interface UseFloatBubbleReturn {
  open: () => void;
  close: () => void;
  toggle: () => void;
  unmount: () => void;
  isOpen: boolean;
  handle: FloatHandle | null;
}
```

## Other Hooks

### useThemeSync

Sync theme between your app and embedded interviews:

```tsx
import { useThemeSync } from "@perspective-ai/sdk-react";

function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Syncs theme changes to all active embeds
  useThemeSync(theme);

  return (
    <button onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}>
      Toggle Theme
    </button>
  );
}
```

## TypeScript

All types are exported:

```typescript
import type {
  // Hook types
  UsePopupOptions,
  UsePopupReturn,
  UseSliderOptions,
  UseSliderReturn,
  UseFloatBubbleOptions,
  UseFloatBubbleReturn,
  UseAutoOpenOptions,
  UseAutoOpenReturn,
  // Component types
  WidgetProps,
  FloatBubbleProps,
  FullpageProps,
} from "@perspective-ai/sdk-react";

// Re-exported from @perspective-ai/sdk
import type {
  EmbedConfig,
  EmbedHandle,
  FloatHandle,
  BrandColors,
  ThemeValue,
  EmbedError,
} from "@perspective-ai/sdk-react";
```

## SSR Safety

All hooks and components are SSR-safe and include the `"use client"` directive. Works with Next.js, Remix, and other React frameworks.

## License

MIT
