# ACC-010 — E-TOU-C ignores baseline credit and billing-period allocation

- Status: Mitigated — explicit baseline credit assumptions are supported; proportional whole-bill allocation remains unimplemented.
- Priority: P1.
- Locations: `src/data/ratePlans.json:987–992`, `src/data/effectivePlanConfig.js:3–32`, `src/engine/rateEngine.js:210–244`.

## Evidence and reproduction
The runtime applies the -$0.08140/kWh credit only for an explicit within-baseline assumption or positive remaining baseline; unknown eligibility uses a warned non-discounted reference. `src/data/effectivePlanConfig.test.js` and `src/engine/sessionAccuracy.test.js` verify credit inclusion/removal and session splits. The UI warns that sequential incremental-energy splitting does not implement proportional billing-period TOU allocation; season/day/territory/medical household modeling remains open.

[PG&E E-TOU-C tariff](https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_SCHEDS_E-TOU-C.pdf), sheet 2, specifies a **-$0.08140/kWh credit on baseline usage**. The value is stored but unused by pricing.

For a bill composed entirely of eligible baseline usage, winter bundled off-peak energy is $0.36757 - $0.08140 = **$0.28617/kWh**, not the app's unconditional $0.36757. Thirty-six eligible kWh differ by **$2.93040**.

This example isolates a fully within-baseline case. It does **not** establish that the same credit can be subtracted from every incremental charging kWh.

## Expected behavior

The tariff allocates TOU usage to tiers proportionately at billing-period level. A session's marginal bill effect depends on whole-house usage and remaining allowance. Current time alone cannot determine it.

## Acceptance criteria

- Model documented baseline allocation, or present explicit below/above-baseline assumptions/ranges when inputs are unknown.
- Test fully below baseline, fully above, and mixed billing-period usage across TOU periods.
- Verify season/day counts, baseline territory, basic/all-electric and medical eligibility.
- Derive expected values independently from the tariff, including proportional allocation; do not simply reuse E-1 sequential tier logic.
- Preserve provider-specific generation and correct CCA composition; do not subtract the credit twice.
- Scope bill-accurate claims honestly when household data is absent. Obtain approval before schema/data changes.
