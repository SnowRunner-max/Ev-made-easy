# ACC-002 — Spring-DST date construction can freeze charging calculations

- Status: Fixed — calendar-aware Pacific construction and bounded, strictly advancing integration.
- Priority: P1; blocks safe session calculation.
- Locations: `src/utils/pacificTime.js:63–79`, `src/engine/rateEngine.js:255–282`, `src/engine/costCalculator.js:22–29`.

## Reproduction
Historical pre-fix reproduction. `src/utils/pacificTime.test.js` defines skipped/repeated-hour semantics; `src/engine/rateEngine.boundaries.test.js` covers all five TOU plans and runs real production summaries in a killable subprocess with a five-second deadline. `src/engine/sessionAccuracy.test.js` covers invalid/non-finite input and integrated DST sessions. Boundary/session tests also pass under UTC, Tokyo and New York host timezones.

Call `buildPacificTime('2026-03-08', 0)`.

- Actual: `2026-03-07T08:00:00.000Z`.
- Expected: `2026-03-08T08:00:00.000Z`.

For `2026-03-07T23:30:00-08:00`, `getNextRateChange(date, rawPlan, 'bundled')` returns that past instant for all five PG&E TOU plans: **-23.5 hours** from the input.

A normal `calcChargeSummary` call at March 7, 2026, 10 AM PST, with effective EV2-A + 3Cchoice, 60 kWh battery, 20% charge, and 7.7 kW failed to return within two seconds in an isolated worker. The cheapest-window search evaluates late starts even in the morning.

## Cause and impact

Pacific conversion corrects the wall-clock hour without validating the calendar date. The cost loop accepts a non-positive duration, moves backward or stalls, and never consumes the remaining energy correctly. Synchronous execution can block rendering.

## Acceptance criteria

- Construct the intended Pacific calendar date as well as hour; define handling for nonexistent and repeated local hours.
- Require strictly advancing integration boundaries and terminate predictably on invalid/non-finite input.
- Test the exact reproduction, all five TOU plans, spring-forward, fall-back, midnight, month/year rollover, and multiple browser timezones.
- Verify ordinary summary inputs return finite nonnegative costs and durations.
- Run hang regressions in a worker/subprocess with an external timeout. An ordinary asynchronous test timeout cannot stop a blocked synchronous event loop.
- Do not simply clamp a past boundary to zero and leave the loop stuck.
- Keep integration/day-boundary behavior compatible with ACC-014 and future-start search in ACC-015.
