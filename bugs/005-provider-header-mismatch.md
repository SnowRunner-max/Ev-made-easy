# ACC-005 — Header identifies the territory CCA instead of the selected provider

- Status: Fixed — header follows the effective utility/provider/product configuration.
- Priority: P2.
- Location: `src/App.jsx:135–141`.

## Reproduction
Historical pre-fix reproduction. `src/App.jsx` renders the effective provider/product and delivery utility rather than territory CCA eligibility. `src/App.test.jsx` verifies bundled context has no active 3CE claim and selecting 3CE changes the header consistently.

Resolve Buellton, select EV2-A, and select PG&E Bundled. Read the header, then switch to 3CE and a different generation product.

The header appends `serviceArea.utility + serviceArea.cca`, so it says **PG&E + 3CE even when bundled PG&E prices are active**. The visible provider context does not follow the calculation.

## Expected behavior

The account/calculation context must identify the effective delivery utility, selected generation provider, plan, and relevant generation product. Territory eligibility may be displayed separately but must not imply enrollment.

## Acceptance criteria

- Bundled selection explicitly identifies PG&E bundled generation, without a misleading active 3CE label.
- 3CE selection and 3Cchoice/3Cprime changes have unambiguous visible context.
- Header and breakdown agree with `effectivePlanConfig`, not just the location registry.
- Cover non-CCA territories and provider normalization after location changes.
- Preserve accessibility and compact/mobile context; do not rely only on a hidden selector.
- Coordinate with ACC-004/ACC-006, but do not treat a corrected default as sufficient to fix this defect.
