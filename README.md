# Buellton EV Charging Cost Calculator

A lightweight, mobile-first web app that shows Buellton, CA residents the **real-time cost** of charging an electric vehicle at home. Supports three PG&E rate plans with **Central Coast Community Energy (3CE) 3Cchoice generation**. Select your plan from a dropdown — the app updates instantly.

## What It Does

- Selects between three rate plans: EV2-A, E-ELEC, and EV-B
- Displays the current electricity rate (off-peak / part-peak / peak) updated live
- Shows a countdown to the next rate change
- Visualizes the 24-hour rate schedule on a timeline (3–5 segments depending on plan and day)
- Calculates the cost to charge your EV from any state of charge to 80% or 100%
- Gives contextual charging recommendations based on the current time and plan

## Rate Plans

All-in rates (PG&E delivery + 3CE 3Cchoice generation) for Buellton, CA. Rates effective March 1, 2026 (PG&E) and February 15, 2026 (3CE).

### EV2-A — Standard EV Rate

Same schedule every day. Summer = June–September, Winter = October–May.

| Period    | Summer   | Winter   | Hours (Pacific Time)               |
|-----------|----------|----------|------------------------------------|
| Off-Peak  | $0.22254 | $0.22261 | 12:00 AM – 3:00 PM                 |
| Part-Peak | $0.42415 | $0.39108 | 3:00–4:00 PM and 9:00 PM–12:00 AM  |
| Peak      | $0.53420 | $0.40766 | 4:00 PM – 9:00 PM                  |

### E-ELEC — Electric Home Rate

Same TOU windows as EV2-A; different delivery rates. Summer = June–September, Winter = October–May.

| Period    | Summer   | Winter   |
|-----------|----------|----------|
| Off-Peak  | $0.44116 | $0.34153 |
| Part-Peak | $0.53249 | $0.36861 |
| Peak      | $0.80249 | $0.41047 |

### EV-B — Separately Metered EV Rate

Requires a separately metered EV outlet. Weekday and weekend schedules differ. Summer = **May–October**, Winter = November–April.

**Weekdays:** Off-Peak 12–7 AM & 11 PM–midnight / Part-Peak 7 AM–2 PM & 9–11 PM / Peak 2–9 PM

**Weekends & holidays:** Off-Peak 12 AM–3 PM & 7 PM–midnight / Peak 3–7 PM

| Period    | Summer   | Winter   |
|-----------|----------|----------|
| Off-Peak  | $0.36069 | $0.30190 |
| Part-Peak | $0.51915 | $0.37363 |
| Peak      | $0.90530 | $0.53024 |

## Tech Stack

- **React 18** — functional components and hooks only
- **Vite** — build tool and dev server
- **Tailwind CSS** — utility-first styling, mobile-first
- **Vitest + React Testing Library** — TDD throughout

No backend. No routing library. No state management library. All rate logic is client-side.

## Getting Started

```bash
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

See [CLAUDE.md](./CLAUDE.md) for the full development guide, including:
- Complete rate data reference
- TDD workflow and testing strategy
- React and Tailwind best practices
- Recommended build order
- Common pitfalls to avoid

## Rate Sources

- PG&E EV2-A / E-ELEC / EV-B Schedules (effective March 1, 2026)
- 3CE 3Cchoice Generation Rates (effective February 15, 2026)
- PCIA vintage 2021 for Buellton, CA: $0.05264/kWh
- EV2-A / E-ELEC Base Services Charge: $0.79343/day (Income Tier 3, non-CARE/FERA)
- EV-B Daily Meter Charge: $0.04928/day
