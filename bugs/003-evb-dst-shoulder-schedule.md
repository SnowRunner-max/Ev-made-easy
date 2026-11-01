# ACC-003 — EV-B omits tariff-specific DST shoulder schedules

- Status: Partially fixed — PG&E meter shoulder schedules corrected; independent CCA generation alignment remains unverified.
- Priority: P1.
- Locations: `src/data/ratePlans.json:540–560`, `src/engine/rateEngine.js:139–162`.

## Requirement and evidence
Implemented in `src/engine/schedulePolicy.js` without raw-rate, schema or season changes. `src/engine/rateEngine.boundaries.test.js` verifies interior dates, bounding Sundays, weekends, timeline/engine agreement and unchanged EV2-A/E-ELEC windows. Effective CCA configs visibly warn that generation alignment is provisional. Holiday observation remains tracked separately in ACC-016.

[PG&E Schedule EV, sheet 3](https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_SCHEDS_EV%20(Sch).pdf), Advice 7771-E effective December 1, 2025, moves all TOU periods **one hour later** between:

- Second Sunday in March and first Sunday in April.
- Last Sunday in October and first Sunday in November.

In 2026 the bounding Sundays are March 8/April 5 and October 25/November 1. Exact transition instants need documented interpretation; interior dates already establish the defect.

## Reproduction

Use raw EV-B with `getRate(date, rawPlan, 'bundled')`:

- `2026-03-16T14:30:00-07:00`: app winter peak $0.43878; tariff part-peak **$0.30677**.
- `2026-10-26T14:30:00-07:00`: app summer peak $0.62131; tariff part-peak **$0.37720**.
- `2026-10-31T15:30:00-07:00`: app summer peak $0.62131; tariff off-peak **$0.26465**.
- October 31 at 7:30 PM reverses the error: app off-peak, tariff peak.

Bundled examples isolate the proven PG&E schedule mismatch. Do not assume the abbreviated 3CE sheet independently resolves its shoulder-period treatment; verify CCA alignment.

## Acceptance criteria

- Represent and apply the tariff exception without changing summer May–October or winter November–April.
- Cover weekday, weekend, holiday, both shoulder intervals, and just-outside dates.
- Keep current period, timeline, next boundary, and integrated cost consistent.
- Confirm precise transition-day semantics and how 3CE generation periods align with delivered meter intervals.
- Keep EV2-A/E-ELEC schedules unchanged; this is distinct from ACC-002's conversion error.
- Obtain approval for rate-data/schema changes.
