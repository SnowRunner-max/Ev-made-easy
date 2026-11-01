# Buellton EV Charging Cost Calculator

A client-side home EV energy-cost estimator covering five California utility territories. Buellton supports six PG&E plans with bundled or 3CE generation. Confirm the provider and account assumptions; a location alone cannot identify them.

## What It Does

- Supports EV2-A, E-ELEC, EV-B, E-TOU-C, E-TOU-D and E-1 in PG&E territory
- Displays the current electricity rate (off-peak / part-peak / peak) updated live
- Shows a countdown to the next rate change
- Visualizes the 24-hour rate schedule on a timeline (3–5 segments depending on plan and day)
- Calculates the cost to charge your EV from any state of charge to 80% or 100%
- Gives contextual charging recommendations based on the current time and plan

## Rate Plans

Standard non-exempt PG&E delivery + 3CE 3Cchoice generation, **explicit 2021 PCIA vintage**, franchise fee and 2026 state energy surcharge. Energy snapshot effective March 1, 2026 (PG&E) and February 15, 2026 (3CE). These are incremental grid-import estimates, not NEM2 settlement or an all-in bill. Fixed daily charges, export credits, true-up balances, NBC reconciliation and local taxes are excluded.

### EV2-A — Standard EV Rate

Same schedule every day. Summer = June–September, Winter = October–May.

| Period    | Summer   | Winter   | Hours (Pacific Time)               |
|-----------|----------|----------|------------------------------------|
| Off-Peak  | $0.27807 | $0.27814 | 12:00 AM – 3:00 PM                 |
| Part-Peak | $0.47968 | $0.44661 | 3:00–4:00 PM and 9:00 PM–12:00 AM  |
| Peak      | $0.58973 | $0.46319 | 4:00 PM – 9:00 PM                  |

### E-ELEC — Electric Home Rate

Same TOU windows as EV2-A; different delivery rates. Summer = June–September, Winter = October–May.

Use the app's effective-rate table for the selected provider/product/vintage. Do not reuse EV2-A delivery prices for this plan.

### EV-B — Separately Metered EV Rate

Requires a separately metered EV outlet. Weekday and weekend schedules differ. Summer = **May–October**, Winter = November–April.

**Weekdays:** Off-Peak 12–7 AM & 11 PM–midnight / Part-Peak 7 AM–2 PM & 9–11 PM / Peak 2–9 PM

**Weekends & holidays:** Off-Peak 12 AM–3 PM & 7 PM–midnight / Peak 3–7 PM

All listed EV-B windows shift **one hour later** from the second March Sunday to the first April Sunday, and from the last October Sunday to the first November Sunday. PG&E delivery timing is verified; 3CE generation alignment and residential holiday observation remain provisional. See [accuracy backlog](bugs/README.md) for verified scope and open policy questions.

### Estimation assumptions

- PCIA vintage is account-specific, never ZIP-derived; unknown vintage uses a warned 2021 reference.
- E-1/E-TOU-C expose baseline assumptions and optional remaining metered baseline. E-TOU-C session splitting does not reproduce proportional whole-bill allocation.
- Charging efficiency is configurable; 100% means no losses, not a typical-efficiency claim. Wall power and constant-power duration exclude tapering.
- Session breakdowns integrate all components; cheapest starts are absolute future timestamps within the next 24 elapsed hours.

## Tech Stack

- **React 18** — functional components and hooks only
- **Vite** — build tool and dev server
- **Tailwind CSS** — utility-first styling, mobile-first
- **Vitest + React Testing Library** — TDD throughout

No backend. No routing library. No state management library. All rate logic is client-side.

## Getting Started

```bash
# Install Git LFS once on the machine if it is not already available
git lfs install

# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Run tests in watch mode
npm test

# Run tests once (CI)
npm run test:ci

# Build for production
npm run build

# Preview production build
npm run preview
```

Large authoritative source artifacts such as PDFs, workbooks, and pinned geospatial snapshots are managed with Git LFS. A normal clone plus Git LFS hydration keeps them available locally without storing future binary revisions as ordinary Git blobs.

## Project Structure

```
src/
  data/
    ratePlans.json    # Multi-plan config: TOU schedules, rates, seasons, holidays
    vehicles.json     # EV model database (battery sizes, range)
  engine/
    rateEngine.js     # Pure functions: getCurrentPeriod, getSeason, getRate, getScheduleForDay
    costCalculator.js # Multi-period charging cost calculation
  components/
    PlanSelector.jsx  # Plan dropdown (EV2-A / E-ELEC / EV-B)
    RateDisplay.jsx   # Live rate badge with color coding
    Timeline.jsx      # 24-hour rate visualization (3–5 segments)
    Calculator.jsx    # EV selector + charge slider + cost output
    ChargingTip.jsx   # Contextual recommendations
    Footer.jsx        # Rate source footnote
  hooks/
    useCurrentRate.js # Returns current rate + next change for selected plan
    useCountdown.js   # Countdown timer to target time
  App.jsx             # Plan state + planConfig wiring
  main.jsx
```

## Development

This project follows **Test-Driven Development**. Every feature starts with a failing test.

See [AGENTS.md](./AGENTS.md) for the full development guide, including:
- Rate data schema, source verification, and plan-specific rules
- TDD workflow and testing strategy
- React, Tailwind, and UI/UX conventions
- Build, validation, and testing commands
- Common pitfalls to avoid

## Rate Sources

- PG&E EV2-A / E-ELEC / EV-B Schedules (effective March 1, 2026)
- 3CE 3Cchoice Generation Rates (effective February 15, 2026)
- Explicit account vintage 2021 reference: PCIA $0.05264/kWh plus franchise fee $0.00048/kWh; other supported vintages have different charges
- CDTFA 2026 state energy surcharge: $0.00030/kWh
- EV2-A / E-ELEC Base Services Charge: $0.79343/day (Income Tier 3, non-CARE/FERA)
- EV-B Daily Meter Charge: $0.04928/day

For source governance, use the committed catalogs and manifests before opening raw artifacts directly:

- `data-sources/source-catalog.json`
- `data-sources/territory/source-manifest.json`
- `npm run sources:validate`
