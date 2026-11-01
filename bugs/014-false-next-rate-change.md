# ACC-014 — Countdown promises a price drop when the rate is unchanged

- Status: Fixed — actual-price transitions and integration boundaries have separate contracts.
- Priority: P2.
- Locations: `src/engine/rateEngine.js:255–282`, `src/components/RateDisplay.jsx:40–41`, `src/components/RateDisplay.jsx:85–87`.

## Reproduction
Historical pre-fix reproduction. `getNextIntegrationBoundary` retains future day/schedule/offset boundaries; `getNextRateChange` skips equal prices and returns null if no change is found within the bounded repeating-calendar search. `src/engine/rateEngine.boundaries.test.js` verifies weekend/season/equality/null behavior. `src/components/RateDisplay.test.jsx` ensures equal/no-change events make no drop claim and retain the current rate.

Use E-TOU-D + 3Cchoice at `2026-07-11T18:00:00-07:00` (Saturday).

- Current rate: off-peak **$0.33110/kWh** under the old composition.
- `getNextRateChange` returns Sunday midnight with the **same** rate and period.
- The UI calls equality “drops to,” promising a nonexistent drop in six hours.

The actual next TOU price transition is Monday, July 13, at 5 PM PDT for this case.

## Cause

The engine returns the next integration/day boundary, not necessarily the next actual price change. The UI interprets every returned boundary as a rise/drop and has no equality case.

## Acceptance criteria

- Distinguish integration boundaries from a genuine upcoming rate change.
- Show no price-drop/rise claim for equal prices, including equal-rate period changes.
- Find the actual future change across weekends, holidays, and season transitions, with a defined no-change outcome.
- Preserve midnight integration boundaries when they are necessary to recompute season/day schedules.
- Test both rate and displayed wording, including a plan whose adjacent periods have equal prices.
- Keep countdown timestamps strictly future-facing; ACC-002 handles the separate past-boundary bug.
- Do not remove all midnight boundaries from the cost engine merely to repair the headline countdown.
