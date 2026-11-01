# ACC-013 — Battery energy is treated as metered charging energy

- Status: Fixed — configurable efficiency separates battery energy, metered energy and wall-power duration.
- Priority: P2.
- Locations: `src/engine/costCalculator.js:70–76`, `src/data/vehicles.json:2–6`, `src/components/Calculator.jsx:132–168`.

## Reproduction
Historical pre-fix reproduction. `src/engine/sessionAccuracy.test.js` verifies 36 battery kWh / 90% = 40 metered kWh with re-integrated duration/cost and rejects invalid efficiency. `src/App.test.jsx` verifies the editable input, unchanged battery target, metered output and bounded unsupported-session validation. The backward-compatible default is explicitly labeled 100% (no losses), not a measured vehicle fact; constant-power duration excludes tapering/temperature.

Set a 60 kWh usable battery from 20% to 80%. The summary calculates **36 kWh** and uses all 36 directly as billable grid energy. There is no efficiency or accessory-load input and no explicit 100%-efficiency qualification.

For an illustrative, user-supplied **90% wall-to-battery efficiency**, the required metered energy is **40 kWh**, not 36. This is a mathematical fixture, not a verified efficiency for the owner's vehicle.

## Impact and expected behavior

Charging losses affect both metered energy and session duration, which can move charging into another TOU period. Useful battery energy and energy at the meter must have distinct meanings.

## Acceptance criteria

- Define whether charger kW is measured at the wall or delivered to the battery.
- Expose a defensible configurable efficiency/overhead assumption, or explicitly label idealized 100%-efficiency estimates.
- With 90% efficiency, 36 battery kWh requires 40 wall kWh; at 7.7 wall kW duration is approximately 5.1948 hours, absent other modeled effects.
- Integrate wall energy through actual time boundaries; do not just add a percentage to a previously computed cost.
- Keep 100% efficiency as a reproducible idealized fixture; reject invalid/non-finite efficiency values.
- Clearly label battery-added versus metered kWh. Do not invent a fixed loss rate or charging taper as an account fact.
- Keep this separate from solar accounting in ACC-012.
