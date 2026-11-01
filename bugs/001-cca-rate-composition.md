# ACC-001 — CCA rates omit charges and retain a bundled PCIA credit

- Status: Fixed for standard non-exempt PG&E/3CE; exempt groups and other-provider component verification remain unsupported follow-ups.
- Priority: P1.
- Scope: PG&E + 3CE confirmed across supported plans; other CCAs require their own component verification.
- Locations: `src/data/effectivePlanConfig.js:27`, `src/data/effectivePlanConfig.js:87–95`, `src/data/ratePlans.json:10–12`.

## Reproduction and actual result
Historical pre-fix reproduction. Verified implementation: `src/data/pgeChargePolicy.js` and `effectivePlanConfig.js` normalize bundled PCIA and add explicit vintage/franchise/state components. Unknown vintage is warned, not ZIP-inferred. Exempt-group requests retain a warned standard reference rather than inventing discounted charges.

Regression evidence: `src/data/effectivePlanConfig.test.js`, `pgeChargePolicy.test.js`, `sanitizedBillOracle.test.js` and `src/engine/sessionAccuracy.test.js` cover corrected six-cell prices, premiums, itemization and bill reconciliation. `AGENTS.md` and `data-sources/PGE_README.md` now describe the correct composition.

Select Buellton, EV2-A, 3CE, 3Cchoice. Evaluate a winter off-peak instant such as `2026-10-31T10:00:00-07:00`.

The app adds stored delivery $0.13012 to 3CE generation $0.08449 and returns **$0.21461/kWh**.

Stored delivery is bundled total minus PG&E's published generation component. It still contains the **-$0.01011/kWh bundled PCIA**. Metadata PCIA/franchise values never enter the runtime total.

## Expected result and evidence

For a standard non-exempt 2021-vintage account, remove the bundled PCIA credit, add vintage PCIA $0.05264 and franchise $0.00048, and use 3CE generation.

Winter off-peak: $0.13012 + $0.01011 + $0.08449 + $0.05264 + $0.00048 = **$0.27784/kWh**, excluding state energy surcharge and fixed charges. Correction: **+$0.06323/kWh**, or $3.7938 per 60 metered kWh.

[EV2 tariff](https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_SCHEDS_EV2%20(Sch).pdf), sheets 3–5, explicitly excludes bundled generation **and** bundled PCIA for CCA customers. [3CE sheet](https://3cenergy.org/wp-content/uploads/2026/04/PGE-Residential-Website-Rate-Sheet-2026.02.15_with3Cflex.pdf), page 2, lists vintage charges. The [sanitized bill reference](README.md#sanitized-statement-reference) confirms the account's vintage and billed components.

## Acceptance criteria

- Independently verify all six EV2-A seasonal/period totals in the shared reference, both 3CE products, and non-TOU composition.
- Preserve bundled totals; do not charge bundled customers CCA PCIA/franchise a second time.
- Support applicable vintage and charge exemptions without assuming every account in a ZIP has the same vintage.
- Never apply +$0.06323 universally. Verify any provider-embedded fees before adding charges; do not treat existing comments as authoritative proof.
- Expose components so the session breakdown can reconcile under ACC-008.
- Correct the formula in `data-sources/PGE_README.md` and misleading composition/vintage guidance in `AGENTS.md`.
- Obtain approval before schema/rate-data changes. ACC-011 handles the separate state surcharge; ACC-012 handles NEM.
