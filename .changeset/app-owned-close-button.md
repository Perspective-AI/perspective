---
"@perspective-ai/sdk": minor
---

Slider, popup, and float now hand their close (X) button to the interview app.

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
