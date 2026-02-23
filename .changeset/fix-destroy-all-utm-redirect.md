---
"@perspective-ai/sdk": patch
---

Fix destroyAll not resetting initialized flags (auto-trigger popups would fail to re-open after destroyAll+autoInit), fix relative URLs being incorrectly blocked in redirect security check.
