# ACC-008 — Delivery/generation subtotals do not reconcile to the session total

- Status: Fixed — all session components integrate over the same metered-energy segments as the total.
- Priority: P1.
- Locations: `src/components/CostFacts.jsx:90–97`, `src/engine/costCalculator.js:16–32`.

## Reproduction
Historical pre-fix reproduction. `src/engine/sessionAccuracy.test.js` verifies the $16.11414 bundled oracle, real PG&E/3CE fees, baseline crossings and DST component sums before rounding. `src/components/CostFacts.test.jsx` verifies integrated subtotals and metered session averages; non-TOU and charge-to-100% states are supported. Individual cents use deterministic `toFixed(2)` display rounding and may differ by one cent from the rounded total; this is disclosed rather than changing the underlying tariff math.

Select bundled EV2-A. At `2026-07-15T14:00:00-07:00`, price 36 kWh at 7.7 kW and open the breakdown.

- Integrated total: **$16.11414**, displayed $16.11.
- Delivery plus generation subtotals, calculated from the initial off-peak rate for all 36 kWh: **$8.12088**, displayed approximately $8.12 combined.

The total traverses subsequent part-peak and peak blocks; component subtotals do not.

## Expected behavior

All session amounts must derive from the same time/energy segments. Instantaneous rate and session-weighted average rate must be labeled separately.

## Acceptance criteria

- Accumulate delivery, generation, PCIA, fees, and any applicable modeled adjustments on the same segments used by the total.
- Components reconcile before display rounding; document deterministic rounding for displayed cents.
- Cover single-period, multi-period, midnight, season, provider/product, and DST cases.
- If a component is already embedded, do not itemize it again as an extra charge.
- Keep fixed daily fees separate from incremental charging cost.
- Show sensible non-TOU and charge-target states instead of implying a valid configuration is missing.
- Coordinate with ACC-001, ACC-011, ACC-012, and ACC-013. Correcting only the total or relabeling the wrong subtotals does not close this report.
