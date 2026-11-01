# ACC-009 — E-1 always prices charging at Tier 1

- Status: Fixed for explicit incremental tier/remaining-baseline assumptions; automatic household allowance inference is intentionally unsupported.
- Priority: P1.
- Locations: `src/data/effectivePlanConfig.js:87–95`, `src/data/ratePlans.json:1255–1267`.

## Reproduction
Historical pre-fix reproduction. Effective pricing supports tier1/tier2 and remaining metered baseline, with warned above-baseline reference when unknown. `src/data/effectivePlanConfig.test.js` covers bundled/CCA below, above and unknown cases; `src/engine/sessionAccuracy.test.js` verifies exact baseline crossing without adding the tier delta twice. `src/App.test.jsx` covers editable assumptions and visible provisional status. No territory/medical/all-electric allowance is guessed, and billing-period rollover requires fresh user-supplied context.

Build an effective bundled E-1 configuration. Price 36 metered kWh for a household already above its billing-period baseline.

- App: always uses Tier 1 **$0.32561/kWh**, or **$11.72196**.
- Applicable Tier 2 bundled energy rate: **$0.40702/kWh**, or **$14.65272**.
- Understatement: **$2.93076**, excluding separately applicable charges.

Bundled examples isolate this defect from CCA composition. [PG&E E-1 tariff](https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_SCHEDS_E-1.pdf), sheet 1, lists both tiers.

## Expected behavior

No time dependence does not mean no usage dependence. The applicable price requires billing-period usage, baseline allowance, and household/service context. The app currently has no such input.

## Acceptance criteria

- Represent Tier 1/Tier 2 eligibility or explicitly disclose and allow selection of a pricing assumption.
- Do not silently assert Tier 1 when household usage is unknown.
- Handle a session crossing the remaining baseline, with household usage and period/season allowance treatment defined.
- Verify baseline territory, basic/all-electric and applicable medical allowances from authoritative sources; do not universalize metadata territory P.
- Test below-baseline, above-baseline, crossing, and unknown-input cases for bundled and supported CCA generation.
- Do not apply conservation adjustments twice: the stored E-1 tiered delivery cells already embed them.
- Coordinate with ACC-001/ACC-006 and obtain approval for schema/data changes.
