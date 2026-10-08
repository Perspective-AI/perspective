---
"@perspective-ai/sdk": patch
---

Fix an unhandled `InvalidStateError` ("Closed before resume completed") on host pages when the float bubble unmounts while its welcome chime is still waiting on the browser to resume audio, such as on a client-side navigation to a page without the bubble.
