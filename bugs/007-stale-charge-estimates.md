# ACC-007 — Charge-now estimates become stale within the same TOU period

- Status: Fixed — one live timestamp drives rate and session estimates, including resume refresh.
- Priority: P1.
- Locations: `src/App.jsx:99–105`, `src/hooks/useCurrentRate.js:5–19`.

## Reproduction
Historical pre-fix reproduction. `src/App.test.jsx` covers same-period 30-minute advance, the 4 PM transition and immediate focus/resume refresh with real engines. `useCurrentRate` refreshes every 60 seconds, tightening to one second within five minutes of an integration boundary, and on visible/focused resume. Live UI summaries skip the unused future-window optimization; slider debouncing is preserved.

Use a controlled clock and the real engine. Resolve Buellton; choose EV2-A + 3CE 3Cchoice; set a 60 kWh battery at 20% and 7.7 kW.

At `2026-07-15T14:00:00-07:00`, charge-to-80% shows **$15.70**. Advance 30 minutes without changing inputs. Both instants remain off-peak.

Actual UI: still **$15.70**. Fresh calculation at 2:30 PM: approximately **$16.90** with the old rate snapshot, because more of the session crosses expensive periods.

## Cause and impact

The summary memo depends on `currentRate.period`, not elapsed time/date/season. A changing start time changes the session cost even while its starting rate stays constant. Same-period midnight and season changes can also leave old totals in place.

## Acceptance criteria

- Use a consistent explicit calculation timestamp for live rate and charge-now estimates.
- Recompute at a documented bounded cadence, across date/season changes, and after resuming from sleep/backgrounding.
- Mounted-app tests advance time inside the same period and compare against an independent expected session integral.
- Cover midnight, June/October boundaries, and DST without requiring a user input change.
- Avoid unnecessary expensive searches each second; preserve responsive debouncing.
- Fix ACC-002 before exercising hanging boundaries. Recompute expected dollar fixtures after ACC-001/ACC-011 rather than locking in current underpricing.
