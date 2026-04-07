# CLAUDE.md — EV Made Easy (Buellton, CA)

Real-time home EV charging cost calculator for Buellton, CA. PG&E delivery + 3CE generation. Client-side React SPA, no backend.

**Notion:** https://www.notion.so/32ae8e8770bf81b59c72e509ed5ebdfc

-----

## Stack

React 18 + Vite · Tailwind CSS · Vitest + React Testing Library · No router · No state library

-----

## File Structure

```
src/
  data/
    ratePlans.json    # Source of truth for all rates, TOU schedules, seasons, holidays
    vehicles.json     # EV model database
  engine/
    rateEngine.js / .test.js
    costCalculator.js / .test.js
  components/        # Co-located .test.jsx for each component
  hooks/
    useCurrentRate.js
    useCountdown.js
  App.jsx
pge_source/         # Authoritative source documents for rate data
  res-inclu-tou-current.xlsx   # PG&E residential inclusive TOU rates (current)
  3ce-rates.pdf                # 3CE (Central Coast Community Energy) rate sheet
```

When modifying `ratePlans.json`, validate every changed cell against the documents in `pge_source/`. These files are the source of truth — `ratePlans.json` is a derived artifact. If the two disagree, `pge_source/` wins. Update these files when PG&E or 3CE publish new tariffs, and note the effective date in the rate data section below.

-----

## Rate Data — What’s in ratePlans.json

Six supported plans: **EV2-A, E-ELEC, EV-B, E-TOU-C, E-TOU-D, E-1**

Source: PG&E Advice Letter 7846-E (eff. March 1 2026) · 3CE Rate Sheet v29 (eff. Feb 15 2026)

**Schema v2.0** — every rate cell has three fields. This invariant must hold: `pgeDelivery + pgeGeneration = pgeTotalBundled` (±0.00001).

```json
"peak": {
  "summer": { "pgeDelivery": 0.xxx, "pgeGeneration": 0.xxx, "pgeTotalBundled": 0.xxx },
  "winter": { ... }
}
```

The `cce` field holds the 3CE generation charge (3Cchoice or 3Cprime). Never collapse these three fields — the separation prevents double-counting CCA rates, which was the v1 bug.

**Plan quirks to remember:**

- **EV2-A / E-ELEC**: Part-peak has TWO windows (3–4 PM and 9 PM–midnight). Easy to get wrong.
- **EV-B**: Weekday and weekend/holiday schedules differ. Summer = May–Oct (not June–Sep). Daily meter charge $0.04928/day (show in footer, not per-kWh).
- **E-TOU-C / E-TOU-D**: Only two TOU periods — no part-peak.
- **E-1**: Tiered, not time-based.
- **Holidays**: Affect EV-B only (use weekend schedule). List lives in `ratePlans.json`.
- **Base Services Charge** ($0.79/day income tier 3): footnote only, never in per-kWh display.
- **PCIA vintage**: Buellton = 2021 vintage → $0.05264/kWh.
- **EV-A**: Eliminated Nov 30 2025. EV-B is the correct separate-meter plan.

-----

## Engine Rules

All engine functions accept `planConfig` as a parameter — always pass it. Never hardcode TOU hours; read from `planConfig.touSchedules`. Season boundaries are plan-specific — read from `planConfig.seasons.summer.months`.

Time logic: always Pacific Time (`America/Los_Angeles`). Browser timezone ≠ Pacific.

Multi-hour charging spans multiple rate periods. Walk each period individually when calculating cost.

-----

## Testing

TDD: write failing test first, then minimum code to pass, then refactor.

- Unit tests on engine functions: exhaustive boundary coverage (midnight, season transitions, DST, holidays)
- Component tests: React Testing Library, test behavior not implementation
- Mock time with `vi.setSystemTime()`, never mock engine functions
- No snapshot tests

-----

## UI/UX Rules

**Layout**: Split panel — Input Laboratory (white, left) + Results Monolith (ink-black, right). Stack vertically on mobile (<860px).

**Color palette** — CSS custom properties in `index.css`. No rogue hex values. Key tokens:

- `--color-ink: #050517` · `--color-paprika: #CF5C36` · `--color-apricot: #EFC88B`
- `--color-custard: #F4E3B2` · `--color-off-white: #FAFAF8`
- TOU colors: green (off-peak) · amber (part-peak) · red (peak)

**Typography**: `Space Grotesk` (display) for hero numbers and structural headers only. `DM Sans` or `Inter` for everything else.

**No 1px structural borders.** Separate sections with background-color shifts. Borders only on interactive elements (focus rings, toggle groups).

**Results Monolith is always dark.** Never render light-background cards inside it.

**One hero number.** The current $/kWh rate is the single most prominent element.

**Settings sheet** contains: season toggle · generation provider selector (PG&E bundled / 3CE 3Cchoice / 3CE 3Cprime) · rate plan selector. Persistent header shows active config (e.g., “EV2-A · 3CE 3Cchoice”) + gear icon.

-----

## Action Boundaries

**Pause and confirm before:**

- Modifying `ratePlans.json` — validate against tariff PDFs first
- Changing season month ranges
- Changing `pgeDelivery / pgeGeneration / cce` schema structure
- Deleting or renaming test files

**Proceed without asking:**

- Adding/editing tests
- Refactoring internals without changing props/behavior
- Updating docs, comments, CLAUDE.md
- Adding CSS custom properties following naming conventions
- Creating new components following existing patterns

-----

## Commands

```bash
npm run dev          # Dev server
npm test             # Watch mode
npm run test:ci      # Single run
npm run build
```

Filter test output: `npm run test:ci 2>&1 | tail -30`
