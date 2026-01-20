# @perspective-ai/sdk-react

React components for [Perspective AI](https://getperspective.ai).

> **Not using React?** Use [`@perspective-ai/sdk`](https://www.npmjs.com/package/@perspective-ai/sdk) for vanilla JavaScript.

## Installation

```bash
npm install @perspective-ai/sdk-react
```

**Peer Dependencies:** React 18+ or 19+

## Quick Start

```tsx
import { PopupButton } from "@perspective-ai/sdk-react";

function App() {
  return (
    <PopupButton
      researchId="your-research-id"
      onSubmit={() => console.log("Interview completed!")}
    >
      Give Feedback
    </PopupButton>
  );
}
```

## Components

| Component      | Description                     |
| -------------- | ------------------------------- |
| `Widget`       | Inline embed in a container     |
| `PopupButton`  | Button that opens a popup modal |
| `SliderButton` | Button that opens a side panel  |
| `FloatBubble`  | Floating chat bubble in corner  |
| `Fullpage`     | Full viewport takeover          |

### Widget

Inline embed that renders in a container.

```tsx
import { Widget } from "@perspective-ai/sdk-react";

<Widget
  researchId="your-research-id"
  onSubmit={() => console.log("Done!")}
  className="my-widget" // or style={{ height: 600 }}
/>;
```

### PopupButton

Button that opens a popup modal when clicked.

```tsx
import { PopupButton } from "@perspective-ai/sdk-react";

<PopupButton
  researchId="your-research-id"
  onSubmit={() => console.log("Done!")}
  className="btn btn-primary"
>
  Take Interview
</PopupButton>;
```

**Controlled mode:**

```tsx
const [open, setOpen] = useState(false);

<PopupButton researchId="xxx" open={open} onOpenChange={setOpen}>
  Take Interview
</PopupButton>;
```

### SliderButton

Button that opens a side panel when clicked.

```tsx
import { SliderButton } from "@perspective-ai/sdk-react";

<SliderButton researchId="your-research-id">Open Interview</SliderButton>;
```

### FloatBubble

Floating chat bubble in the corner of the screen.

```tsx
import { FloatBubble } from "@perspective-ai/sdk-react";

<FloatBubble researchId="your-research-id" />;
```

### Fullpage

Full viewport takeover embed.

```tsx
import { Fullpage } from "@perspective-ai/sdk-react";

<Fullpage researchId="your-research-id" />;
```

## Props

All components accept props from `EmbedConfig`:

```typescript
import type { EmbedConfig } from "@perspective-ai/sdk-react";

interface EmbedConfig {
  researchId: string;
  host?: string;
  theme?: "light" | "dark" | "system";
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

  // Callbacks
  onReady?: () => void;
  onSubmit?: (data: { researchId: string }) => void;
  onClose?: () => void;
  onNavigate?: (url: string) => void;
  onError?: (error: EmbedError) => void;
}
```

### Widget

```typescript
import type { WidgetProps } from "@perspective-ai/sdk-react";

interface WidgetProps extends EmbedConfig {
  embedRef?: RefObject<EmbedHandle | null>;
  className?: string;
  style?: CSSProperties;
  // ...other div props
}
```

### PopupButton / SliderButton

```typescript
import type {
  PopupButtonProps,
  SliderButtonProps,
} from "@perspective-ai/sdk-react";

interface PopupButtonProps extends EmbedConfig {
  children: ReactNode;
  open?: boolean; // Controlled mode
  onOpenChange?: (open: boolean) => void;
  embedRef?: RefObject<PopupButtonHandle | null>;
  // ...other button props
}

interface SliderButtonProps extends EmbedConfig {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  embedRef?: RefObject<SliderButtonHandle | null>;
  // ...other button props
}
```

### FloatBubble / Fullpage

```typescript
import type {
  FloatBubbleProps,
  FullpageProps,
} from "@perspective-ai/sdk-react";

interface FloatBubbleProps extends EmbedConfig {
  embedRef?: RefObject<FloatHandle | null>;
}

interface FullpageProps extends EmbedConfig {
  embedRef?: RefObject<EmbedHandle | null>;
}
```

## Programmatic Control

Use `embedRef` to control components:

```tsx
import { useRef } from "react";
import { PopupButton, type PopupButtonHandle } from "@perspective-ai/sdk-react";

function App() {
  const ref = useRef<PopupButtonHandle>(null);

  return (
    <>
      <PopupButton researchId="xxx" embedRef={ref}>
        Open
      </PopupButton>
      <button onClick={() => ref.current?.open()}>Open Programmatically</button>
      <button onClick={() => ref.current?.close()}>Close</button>
    </>
  );
}
```

### Handle Types

```typescript
// Widget, Fullpage
interface EmbedHandle {
  unmount(): void;
  update(options): void;
  destroy(): void; // deprecated, use unmount
}

// PopupButton
interface PopupButtonHandle {
  open(): void;
  close(): void;
  toggle(): void;
  unmount(): void;
  readonly isOpen: boolean;
  readonly researchId: string;
}

// SliderButton
interface SliderButtonHandle {
  open(): void;
  close(): void;
  toggle(): void;
  unmount(): void;
  readonly isOpen: boolean;
  readonly researchId: string;
}

// FloatBubble
interface FloatHandle {
  open(): void;
  close(): void;
  toggle(): void;
  unmount(): void;
  readonly isOpen: boolean;
}
```

## Hooks

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
  WidgetProps,
  PopupButtonProps,
  PopupButtonHandle,
  SliderButtonProps,
  SliderButtonHandle,
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

All components are SSR-safe and include the `"use client"` directive. Works with Next.js, Remix, and other React frameworks.

## License

MIT
