# Perspective Embed SDK

**Forms are costing you business. An AI concierge turns them into conversations.**

[![@perspective-ai/sdk on npm](https://img.shields.io/npm/v/@perspective-ai/sdk?label=%40perspective-ai%2Fsdk)](https://www.npmjs.com/package/@perspective-ai/sdk)
[![@perspective-ai/sdk-react on npm](https://img.shields.io/npm/v/@perspective-ai/sdk-react?label=%40perspective-ai%2Fsdk-react)](https://www.npmjs.com/package/@perspective-ai/sdk-react)
[![npm downloads](https://img.shields.io/npm/dm/@perspective-ai/sdk?label=downloads)](https://www.npmjs.com/package/@perspective-ai/sdk)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@perspective-ai/sdk?label=min%2Bgzip)](https://bundlephobia.com/package/@perspective-ai/sdk)
[![CI](https://github.com/Perspective-AI/perspective/actions/workflows/ci.yml/badge.svg)](https://github.com/Perspective-AI/perspective/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

The Perspective Embed SDK drops adaptive AI conversations — **Concierges** — into any web page. Users talk through their situation in natural language. You get structured, schema-aligned data ready for your CRM, routing, underwriting, or onboarding workflows.

Client SDK for the hosted [Perspective AI](https://getperspective.ai) platform. Design a Concierge at [getperspective.ai](https://getperspective.ai/signup), get a `researchId`, embed it with this SDK.

Built by [Perspective AI](https://getperspective.ai). SOC 2 Type II and ISO 27001 certified.

```bash
npm install @perspective-ai/sdk-react
```

```jsx
import { Widget } from "@perspective-ai/sdk-react";

<Widget
  researchId="your-research-id"
  onSubmit={({ researchId }) => {
    // Conversation completed — trigger your workflow
  }}
/>;
```

Live examples: [getperspective.dev](https://getperspective.dev) · Templates: [getperspective.ai/templates](https://getperspective.ai/templates)

---

## Why this exists

Forms assume clean categories, perfect classification, and complete understanding. Real users don't think that way. They abandon, they guess, they compress messy situations into the wrong dropdown — and teams make decisions on incomplete information.

A Concierge is not a chatbot. It's production-ready structured capture:

- **Interprets** natural language and intent, not just keywords
- **Clarifies** ambiguity with intelligent follow-ups instead of ignoring it
- **Validates** inputs against your business rules as the conversation happens
- **Outputs** schema-aligned data your systems can act on immediately

If your form drives a meaningful decision — eligibility, qualification, intake, onboarding — it should understand before it submits.

---

## What you get

|                           |                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------- |
| **Drop-in embeds**        | Widget, popup, slider, float bubble, fullpage. One script tag or one React import.  |
| **Schema-aligned output** | Every conversation produces typed, validated fields ready for your CRM, DB, or API. |
| **Works with your stack** | Framework-agnostic core SDK. First-class React. Vanilla JS, Next.js, plain HTML.    |
| **Auto-triggers**         | Timeout, exit-intent, session-once — no glue code.                                  |
| **Audit-ready**           | Full transcript preserved alongside structured data.                                |
| **Secure by default**     | SOC 2 Type II, ISO 27001, data residency controls.                                  |

---

## Packages

| Package                                                                                | Purpose                                         |                                |
| -------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------ |
| [`@perspective-ai/sdk`](https://www.npmjs.com/package/@perspective-ai/sdk)             | Core embed SDK. Vanilla JS, CDN, any framework. | [README](./packages/sdk)       |
| [`@perspective-ai/sdk-react`](https://www.npmjs.com/package/@perspective-ai/sdk-react) | React components and hooks.                     | [README](./packages/sdk-react) |

---

## Common use cases

Workflows teams replace first:

- **Eligibility & pre-qualification** — insurance, lending, healthcare intake
- **Applications & claims** — legal intake, mortgage prequalification, incident reports
- **Demo qualification** — enterprise sales intake that actually routes correctly
- **Complex onboarding** — multi-path setup flows, KYC, client discovery
- **Compliance & regulatory** — structured capture with full conversational audit trail
- **Partner & vendor applications** — nuanced intake with validated outputs

Browse 181+ ready-to-fork templates at [getperspective.ai/templates](https://getperspective.ai/templates).

---

## Quick start

### React

```bash
npm install @perspective-ai/sdk-react
```

```jsx
import { Widget, usePopup } from "@perspective-ai/sdk-react";

export default function IntakePage() {
  const { open } = usePopup({
    researchId: "your-research-id",
    onSubmit: ({ researchId }) => {
      // Hand off to your intake workflow
    },
  });

  return (
    <>
      <button onClick={open}>Start intake</button>

      {/* Or embed inline */}
      <Widget researchId="your-research-id" />
    </>
  );
}
```

### Vanilla JS (npm)

```js
import { openPopup, createWidget } from "@perspective-ai/sdk";

// Modal popup
openPopup({
  researchId: "your-research-id",
  onSubmit: () => console.log("done"),
});

// Inline widget
createWidget(document.getElementById("intake"), {
  researchId: "your-research-id",
});
```

### Script tag / CDN (no build step)

```html
<script src="https://getperspective.ai/v1/perspective.js"></script>

<!-- Declarative — just drop in a tag -->
<div data-perspective-widget="your-research-id"></div>
<button data-perspective-popup="your-research-id">Start</button>

<!-- Or programmatic -->
<script>
  Perspective.openPopup({ researchId: "your-research-id" });
</script>
```

### Embed types

| Type     | React                                  | Vanilla                     | Description             |
| -------- | -------------------------------------- | --------------------------- | ----------------------- |
| Widget   | `<Widget />`                           | `createWidget(el, config)`  | Inline in the page flow |
| Popup    | `usePopup()`                           | `openPopup(config)`         | Modal overlay           |
| Slider   | `useSlider()`                          | `openSlider(config)`        | Side panel              |
| Float    | `<FloatBubble />` / `useFloatBubble()` | `createFloatBubble(config)` | Floating corner chat    |
| Fullpage | `<Fullpage />`                         | `createFullpage(config)`    | Full viewport takeover  |

Full API reference: [getperspective.ai/docs/build/embed-api](https://getperspective.ai/docs/build/embed-api)

---

## Get a `researchId`

Every embed needs a `researchId`. Create one by describing the intake flow in natural language at [getperspective.ai/signup](https://getperspective.ai/signup) — the design agent generates the outline, field schema, and conversation logic for you.

Free tier. No credit card to try.

---

## Examples

See [`examples/`](./examples) for working implementations:

- **[vanilla-js](./examples/vanilla-js)** — basic script-tag embed

Want a framework example (Next.js, Remix, Astro, WordPress, Shopify, etc.)? [Open an issue](https://github.com/Perspective-AI/perspective/issues/new) or a PR — we're actively adding them.

---

## Community & support

- **Docs** — [getperspective.ai/docs/build/embed-api](https://getperspective.ai/docs/build/embed-api)
- **Live demos** — [getperspective.dev](https://getperspective.dev)
- **Issues** — [GitHub Issues](https://github.com/Perspective-AI/perspective/issues)
- **X** — [@perspective_a1](https://x.com/perspective_a1)
- **LinkedIn** — [Perspective AI](https://www.linkedin.com/company/get-perspective-ai/)

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for local development setup, release process, and contribution guidelines.

## License

MIT — see [LICENSE](./LICENSE).
