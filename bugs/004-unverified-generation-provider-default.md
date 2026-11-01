# ACC-004 — Buellton silently defaults to an unverified generation provider

- Status: Fixed — editable defaults explicitly provisional until the effective provider is confirmed.
- Priority: P1.
- Locations: `src/App.jsx:29–62`, `src/data/serviceAreas.json:22–31`.

## Reproduction and impact
Historical pre-fix reproduction. `src/App.jsx` now requests provider confirmation, labels reference estimates in the results panel, tracks confirmation by effective provider identity, and discloses unsupported-provider bundled fallback. `src/App.test.jsx` verifies initial Buellton state, explicit selections, provider changes and incompatible-plan fallback. Location is not treated as enrollment.

Open a fresh app, resolve Buellton/93427, and inspect the generation provider without changing it.

The initial provider is `pge`, and the service-area default is also `pge`. Entering a location in the initial service area does not change it. The app therefore calculates bundled service unless the user notices and selects 3CE.

The supplied statement confirms this account purchases 3CE generation. A correct bundled tariff is still the wrong price for that account.

## Expected behavior

A location establishes eligible utility/provider options, not an individual account's actual enrollment. Avoid silently presenting an unverified provider as the customer's confirmed rate. Either require confirmation or clearly label a sensible editable default.

Do not fix this by assuming all Buellton customers must use 3CE: opted-out bundled customers exist.

## Acceptance criteria

- A fresh Buellton session clearly establishes or requests provider selection before claiming a personalized price.
- Existing explicit selections survive ordinary location edits unless incompatible with the new territory.
- Test initial-area resolution, cross-area changes, bundled opt-outs, unsupported providers, and returning to Buellton.
- Provider changes update rates, product controls, header, timeline, and estimates consistently.
- Keep territory information distinct from enrollment; fix header accuracy separately in ACC-005.
- Do not store account identifiers or infer enrollment from ZIP alone.
