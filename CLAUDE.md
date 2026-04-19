# CLAUDE.md — EV Made Easy

Real-time home EV charging cost calculator for PG&E and SCE service territories across Central and Southern California. Supports multiple CCAs per territory. Client-side React SPA, no backend.

**Notion:** https://www.notion.so/32ae8e8770bf81b59c72e509ed5ebdfc

-----

## Stack

React 18 + Vite · Tailwind CSS · Vitest + React Testing Library · No router · No state library

-----

## File Structure

```
src/
  data/
    ratePlans.json      # PG&E rate plans (delivery, generation, CCA rates, TOU schedules)
    sceRatePlans.json   # SCE rate plans (same schema as ratePlans.json)
    serviceAreas.json   # Service area registry: utility → CCA → default plan
    pgeTerritory.json   # ZIP-to-service-area lookup for PG&E territory
    sceTerritory.json   # ZIP-to-service-area lookup for SCE territory
    multiUtilityZips.json  # ZIPs that span PG&E/SCE boundaries (triggers UtilityPicker)
    vehicles.json       # EV model database
  engine/
    rateEngine.js / .test.js
    costCalculator.js / .test.js
  components/        # Co-located .test.jsx for each component
  hooks/
    useCurrentRate.js
    useCountdown.js
  App.jsx            # RATE_PLAN_REGISTRY maps serviceAreaId → rate data file
pge_source/         # Authoritative source documents for PG&E rate data
  res-inclu-tou-current.xlsx   # PG&E residential inclusive TOU rates (current)
  3ce-rates.pdf                # 3CE (Central Coast Community Energy) rate sheet
sce_source/         # Authoritative source documents for SCE rate data (gitignored)
  SCE_Combined_Rates.xlsx      # SCE delivery + CCA generation rates workbook
```

See `src/data/README.md` for the registry pattern and instructions for adding a new utility.

When modifying `ratePlans.json` or `sceRatePlans.json`, validate every changed cell against the documents in the corresponding `*_source/` directory. Source files are the source of truth — the JSON files are derived artifacts. If the two disagree, the source document wins. Note the effective date in the rate data section below.

-----

## Rate Data — What’s in ratePlans.json

Six supported plans: **EV2-A, E-ELEC, EV-B, E-TOU-C, E-TOU-D, E-1**

Source: PG&E Advice Letter 7846-E (eff. March 1 2026) · 3CE Rate Sheet v29 (eff. Feb 15 2026)

**Schema v3.0** — every rate cell has three fields. This invariant must hold: `delivery + generation = totalBundled` (±0.00001). Applies to both `ratePlans.json` (PG&E) and `sceRatePlans.json` (SCE).

```json
"peak": {
  "summer": { "delivery": 0.xxx, "generation": 0.xxx, "totalBundled": 0.xxx },
  "winter": { ... }
}
```

The `ccaGeneration` map holds CCA generation charges keyed by CCA slug (e.g. `"3ce"`, `"cpa"`). Never collapse delivery + generation into a single field — the separation prevents double-counting CCA rates, which was the v1 bug.

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
