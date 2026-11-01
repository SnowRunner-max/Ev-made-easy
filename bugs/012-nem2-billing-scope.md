# ACC-012 — NEM2 solar billing is absent from personalized estimate scope

- Status: Mitigated by explicit scope/exclusions; full NEM2 settlement remains open and is not claimed.
- Priority: P1 for bill-accurate claims about this account.
- Locations: `src/App.jsx:29–105`, `src/engine/costCalculator.js:16–32`, `src/components/CostFacts.jsx:90–107`.

## Evidence and reproduction
`src/App.jsx` now labels incremental grid-import estimation and excludes export credits, NBC reconciliation, balances, true-up, fixed charges and local taxes. `src/App.test.jsx` verifies the visible exclusion. `src/data/sanitizedBillOracle.test.js` independently reconciles $285.29 variable, $308.30 combined and $111.41 due, distinguishing $285.06 runtime component-only math from statement-specific NBC/rounding. That fixture is not a runtime settlement model; no private statement or identifiers are stored.

The supplied statement explicitly identifies **NEM2**, but the app accepts no solar/net-metering state, export context, accumulated credits, or settlement-period context.

The [sanitized reference](README.md#sanitized-statement-reference) shows:

- Imports 916.9128 kWh, exports 26.8027 kWh, net 890.1101 kWh.
- NBC usage adjustment/replacement produces a net **+$0.23** this statement.
- PG&E $196.89 accrued toward true-up; 3CE $88.40 billed currently; fixed charge $23.01.
- $111.41 due now versus $308.30 combined current-period charges/accruals.

The app cannot distinguish an extra grid-import session from charging that reduces exports or consumes otherwise self-used solar.

## Expected behavior

Distinguish tariff component price, incremental grid charging, and estimated final bill impact. A corrected flat import rate is useful but is not a complete NEM2 settlement model.

## Acceptance criteria

- Establish solar/NEM status or visibly state that solar settlement is outside the estimate.
- Never promise a final marginal bill amount from time alone when necessary import/export/credit inputs are unavailable.
- If modeling NEM2, source its netting interval, NBC treatment, PCIA/fees, credit eligibility, and separate PG&E/3CE settlement rules from current authoritative documents.
- Before claiming bill-accurate NEM2 support, reconcile the sanitized statement to $285.29 variable charges and $308.30 including fixed charge, preserving line rounding.
- Do not hardcode +$0.23 as a reusable fee or count NBCs twice.
- Separate amount due now, deferred accruals, annual balance, and fixed costs.
- Cover import-only, export-offset, credit-surplus, and unknown-data scenarios.
- Label unsupported NEM/NBT variants rather than treating all solar programs as identical. Do not commit the private PDF.
