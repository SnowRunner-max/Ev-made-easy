# Buellton EV Charging Cost Calculator

A lightweight, mobile-first web app that shows Buellton, CA residents the **real-time cost** of charging an electric vehicle at home on the **PG&E EV2-A rate plan** with **Central Coast Community Energy (3CE) 3Cchoice generation**.

## What It Does

- Displays the current electricity rate (off-peak / part-peak / peak) updated live
- Shows a countdown to the next rate change
- Visualizes the full 24-hour rate schedule on a timeline
- Calculates the cost to charge your EV from any state of charge to 80% or 100%
- Gives contextual charging recommendations based on the current time

## Rate Plan: PG&E EV2-A + 3CE 3Cchoice

All-in rates (PG&E delivery + 3CE generation) for Buellton, CA:

| Period    | Summer    | Winter    | Hours (Pacific Time)              |
|-----------|-----------|-----------|-----------------------------------|
| Off-Peak  | $0.22254  | $0.22261  | 12:00 AM – 3:00 PM                |
| Part-Peak | $0.42415  | $0.39108  | 3:00–4:00 PM and 9:00 PM–12:00 AM |
| Peak      | $0.53420  | $0.40766  | 4:00 PM – 9:00 PM                 |

Rates effective March 1, 2026 (PG&E) and February 15, 2026 (3CE). Seasons: Summer = June–September, Winter = October–May. Rates apply every day including weekends and holidays.

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
    rates.json        # TOU periods, seasonal rates, holidays
    vehicles.json     # EV model database (battery sizes, range)
  engine/
    rateEngine.js     # Pure functions: getCurrentPeriod, getSeason, getRate
    costCalculator.js # Multi-period charging cost calculation
  components/
    RateDisplay.jsx   # Live rate badge with color coding
    Timeline.jsx      # 24-hour rate visualization
    Calculator.jsx    # EV selector + charge slider + cost output
    ChargingTip.jsx   # Contextual recommendations
    Footer.jsx        # Rate source footnote
  App.jsx
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

- PG&E EV2-A Schedule (effective March 1, 2026)
- 3CE 3Cchoice Generation Rates (effective February 15, 2026)
- PCIA vintage 2021 for Buellton, CA: $0.05264/kWh
- Base Services Charge: $0.79343/day (Income Tier 3, non-CARE/FERA)
