# ACC-016 — Holiday observation policy and year rollover need authoritative verification

- Status: Partially fixed — adjacent-year consistency corrected; residential observation still needs authoritative verification.
- Priority: P2 verification item.
- Locations: `src/engine/rateEngine.js:41–99`; holiday assumptions in repository guidance.

## Confirmed internal reproduction
Historical pre-fix reproduction. `src/engine/rateEngine.js` now checks adjacent nominal holiday years using UTC calendar arithmetic. Boundary tests cover cross-year observations under the retained legacy assumption, not as a tariff financial oracle. Effective EV-B/E-TOU-D configs visibly warn that observation is unverified. PG&E's non-residential TOU holiday page specifies different Saturday handling and is insufficient to establish the residential rule; full policy closure remains open.

The calendar explicitly observes Saturday holidays on Friday and Sunday holidays on Monday.

`isHoliday(new Date('2027-12-31T18:00:00-08:00'))` returns **false**, despite the helper's own Saturday-to-Friday rule implying observation of Saturday January 1, 2028 on that Friday.

The lookup generates holidays only for the date's own year, losing an adjacent year's holiday observed in December.

## What remains unverified

The reviewed PG&E tariffs list named holidays on dates “legally observed.” That wording alone did not establish the precise Saturday/Sunday observation policy. The code's “FERC” label and shared-PG&E/SCE comment are not sufficient independent evidence.

[EV-B tariff](https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_SCHEDS_EV%20(Sch).pdf), sheet 3, and [E-TOU-D tariff](https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_SCHEDS_E-TOU-D.pdf) are the starting sources. Other utilities require separate verification.

## Acceptance criteria

- Obtain a definitive applicable tariff/calendar interpretation before changing which weekdays receive holiday pricing.
- Implement adjacent-year lookup consistently with the verified policy, not simply the current comment.
- Test fixed-date holidays on Saturday/Sunday, year-crossing observations, floating holidays, and Pacific date boundaries under multiple host timezones.
- Confirm plan-specific holiday applicability; EV2-A's everyday schedule must not gain holiday exceptions.
- Do not claim a proven customer overcharge or use an unverified observed calendar as a financial test oracle.
- Correct stale “all utilities share the same calendar” guidance if sources do not support it.
