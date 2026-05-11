---
name: SCE territory mock update strategy
description: The sceTerritory vi.mock factory at the top of useLocationLookup.test.js must be edited to add SCE ZIPs — it cannot be changed per-describe
type: feedback
---

`vi.mock(...)` calls are hoisted by Vitest and run once per module — they cannot be overridden inside a describe block or individual test. To add SCE territory ZIP coverage to `useLocationLookup.test.js`, edit the factory in the existing `vi.mock('../data/sceTerritory.json', ...)` call at the top of the file.

**Why:** Vitest's mock hoisting means per-test overrides via `vi.mocked().mockReturnValue()` don't work for static JSON module mocks. Only the factory value matters.

**How to apply:** When adding SCE territory tests to useLocationLookup.test.js, update the `sceTerritory.json` mock factory to include the needed SCE ZIPs. This is a mock setup change, not a modification to existing test assertions.

Added in the factory: `'91001': 'sce-cpa-la'` (Altadena, SCE + CPA CCA)
