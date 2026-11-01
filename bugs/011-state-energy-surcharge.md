# ACC-011 — State energy surcharge is missing from the displayed charging cost

- Status: Fixed for verified standard PG&E bundled/3CE import estimates; unsupported utilities/solar settlement bases are disclosed.
- Priority: P2.
- Locations: `src/data/effectivePlanConfig.js:27`, `src/data/effectivePlanConfig.js:93–95`, `src/components/CostFacts.jsx:90–97`.

## Reproduction and evidence
Historical pre-fix reproduction. `src/data/pgeChargePolicy.test.js`, `effectivePlanConfig.test.js` and `sanitizedBillOracle.test.js` cover the 2026 $0.00030/kWh component, six effective rates and independent $0.27 statement line. The session engine itemizes metered-energy surcharge costs. Unverified provider fees are not added globally; NEM netting/billing-base modeling is excluded explicitly under ACC-012.

Compare the app's rate components to the supplied statement, page 9. The bill lists **$0.27 Energy Commission Surcharge** for 890.1101 net kWh.

[CDTFA's 2026 notice](https://cdtfa.ca.gov/formspubs/l1020.pdf) sets the surcharge at **$0.00030/kWh**. Applying it to this statement's usage gives $0.26703303, rounded to $0.27.

After ACC-001 alone, winter off-peak is $0.27784/kWh. Including this surcharge gives **$0.27814/kWh**, before fixed charges and NEM reconciliation.

## Expected behavior

Define whether the primary number is tariff energy only or a price including applicable variable surcharges. Do not call a tax-exclusive subtotal the customer's complete variable price without disclosure.

## Acceptance criteria

- Apply or explicitly disclose the surcharge using source-backed effective dates and applicability.
- Test the bill-derived $0.27 example and all six standard EV2-A component totals in the shared reference.
- Account for a provider that already includes a fee; no double charging.
- Preserve full precision during integration and distinguish rate rounding from bill line rounding.
- For solar accounts, verify the surcharge's billing base; do not assume gross imports or net usage universally.
- Expose inclusion/exclusion consistently in the headline, session estimate, and breakdown.
- Do not mix this charge with franchise surcharge, PCIA, or ACC-012's NBC reconciliation.
