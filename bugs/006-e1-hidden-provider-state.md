# ACC-006 — E-1 hides active generation provider and product controls

- Status: Fixed — provider/product availability no longer depends on TOU pricing.
- Priority: P2.
- Locations: `src/App.jsx:89`, `src/App.jsx:192–205`, `src/data/effectivePlanConfig.js:87–108`.

## Reproduction
Historical pre-fix reproduction. `src/App.test.jsx` verifies E-1 keeps provider/product controls and editable baseline context. `supportsProviderToggle` now uses supported provider options, not `touPeriods`.

1. Resolve Buellton, choose EV2-A, select 3CE and 3Cchoice, then switch to E-1.
2. Return to EV2-A, select PG&E Bundled, then switch to E-1 again.

With the audited snapshot, the first path displays approximately **$0.31/kWh** (underlying $0.31431); the second approximately **$0.33/kWh** ($0.32561). Both E-1 screens hide the provider selector and have the same misleading header.

Generation product state can likewise remain active while its control is hidden.

## Cause and expected behavior

`supportsProviderToggle` requires `touPeriods`, even though E-1 has valid CCA generation data and effective composition. CCA eligibility is independent of whether the delivery tariff uses TOU periods.

## Acceptance criteria

- Show provider/product controls for supported non-TOU plans.
- Directly choose bundled, 3Cchoice, and 3Cprime while on E-1.
- Test switching into E-1 from different provider/product histories, normalization of incompatible choices, and switching back.
- Make active context visible and consistent; no hidden state may silently determine price.
- Keep this separate from E-1 Tier 1 pricing in ACC-009 and CCA composition in ACC-001.
- Reproduction dollar amounts are pre-fix code observations, not endorsed correct E-1 rates.
