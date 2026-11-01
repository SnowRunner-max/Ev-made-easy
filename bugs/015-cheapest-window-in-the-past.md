# ACC-015 — Cheapest-window search can select a start time in the past

- Status: Fixed — optimizer searches future feasible starts and returns absolute timestamps; unused UI optimization is skipped.
- Priority: P2.
- Locations: `src/engine/costCalculator.js:45–58`, `src/engine/costCalculator.js:75–84`, `src/components/Calculator.jsx:132–168`.

## Reproduction
Historical pre-fix reproduction. `findCheapestWindow` includes now and searches the next 24 elapsed hours, considering tariff boundaries aligned with session start, finish and baseline crossing. Earliest equal-cost feasible start wins. `src/engine/costCalculator.test.js` and `sessionAccuracy.test.js` cover future starts and comparable energy costs; DST/rollover tests preserve absolute timestamps. Live UI calls `calcChargeSummary` with `optimize: false`, returning null optimization fields rather than running an unused search.

Call `findCheapestWindow` for effective EV2-A + 3Cchoice at `2026-07-15T18:00:00-07:00`, requesting 36 kWh at 7.7 kW.

The helper evaluates midnight through 11 PM on that same calendar date and returns `startHour: 0`, with approximately **$7.72344** under the old rate composition. Midnight was **18 hours ago**.

The parent summary still executes this search synchronously, even though the current cards display only charge-now results. Do not claim users currently see this recommendation.

## Expected behavior

For actionable optimization, compare feasible starts at or after the requested instant over an explicitly defined future horizon. If same-day historical comparison is intentionally retained, give it a different name/contract and do not present it as an available saving.

## Acceptance criteria

- Define the future horizon and sampling granularity, including whether “start now” is a candidate.
- Return an absolute timestamp/date, not an ambiguous hour alone.
- Cover evening starts, next-day/season/year rollover, DST gaps/repeated hours, and sessions longer than the search horizon.
- Compare against an independent feasible-window oracle; no recommended start may be in the past.
- Recompute savings from comparable energy/efficiency assumptions.
- Avoid running unused expensive searches on the render path; protect against ACC-002 nontermination.
