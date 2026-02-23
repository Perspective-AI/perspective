# @perspective-ai/sdk

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
