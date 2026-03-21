# CLAUDE.md — Buellton EV Charging Cost Calculator

## Project Overview

A lightweight, mobile-first React SPA that shows Buellton, CA residents the real-time cost of charging an electric vehicle at home on the PG&E EV2-A rate plan with Central Coast Community Energy (3CE) generation.

**Notion Project:** https://www.notion.so/32ae8e8770bf81b59c72e509ed5ebdfc

## Tech Stack

- **Framework:** React 18+ (functional components, hooks only — no class components)
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (utility-first, no custom CSS files unless absolutely necessary)
- **Testing:** Vitest + React Testing Library
- **Linting:** ESLint with recommended React config
- **No backend.** All logic is client-side. Rate data lives in JSON config files.
- **No routing library.** Single page app — one view.
- **No state management library.** React useState/useReducer is sufficient.

## File Structure

```
src/
  data/
    rates.json              # All rate data, seasons, TOU periods, holidays
    vehicles.json           # EV model database (battery sizes, names)
  engine/
    rateEngine.js           # Core rate lookup logic (pure functions)
    rateEngine.test.js      # Unit tests for rate engine
    costCalculator.js       # Charging cost calculation logic
    costCalculator.test.js  # Unit tests for cost calculator
  components/
    RateDisplay.jsx         # Hero rate badge + countdown
    RateDisplay.test.jsx
    Timeline.jsx            # 24-hour rate visualization
    Timeline.test.jsx
    Calculator.jsx          # EV selector + charge slider + cost output
    Calculator.test.jsx
    ChargingTip.jsx         # Contextual recommendation
    ChargingTip.test.jsx
    Footer.jsx              # Rate explanation footnote
  App.jsx
  App.test.jsx
  index.css                 # Tailwind directives only
  main.jsx                  # Entry point
public/
  index.html
```

## Rate Data Reference

This is the authoritative rate information. All values are for **EV2-A with 3CE 3Cchoice generation** in Buellton, CA (Santa Barbara County).

### Time-of-Use Periods (apply every day, all year, including weekends and holidays)

|Period   |Hours                                   |
|---------|----------------------------------------|
|Peak     |4:00 PM – 9:00 PM                       |
|Part-Peak|3:00 PM – 4:00 PM AND 9:00 PM – 12:00 AM|
|Off-Peak |12:00 AM – 3:00 PM                      |

**Critical:** Part-peak has TWO windows (3–4 PM and 9 PM–12 AM). This is easy to get wrong.

### Seasons

|Season|Months               |
|------|---------------------|
|Summer|June 1 – September 30|
|Winter|October 1 – May 31   |

### Rate Components

The all-in rate a customer pays combines PG&E delivery charges + 3CE generation charges. These must be added together to get the actual $/kWh.

**3CE Generation Rates (3Cchoice tier, effective Feb 15, 2026):**

|Period   |Summer  |Winter  |
|---------|--------|--------|
|Peak     |$0.18441|$0.12810|
|Part-Peak|$0.14014|$0.11574|
|Off-Peak |$0.09941|$0.09249|

**PG&E Delivery Rates (EV2 Schedule, effective March 1, 2026):**

The PG&E delivery rate = Total Bundled Rate minus Generation component. From the EV2 tariff sheet:

|Component ($ per kWh)          |Peak    |Part-Peak|Off-Peak|
|-------------------------------|--------|---------|--------|
|**Total Bundled Rate (Summer)**|$0.53809|$0.42760 |$0.22558|
|**Total Bundled Rate (Winter)**|$0.41099|$0.39428 |$0.22558|
|Generation (Summer)            |$0.18830|$0.14359 |$0.10245|
|Generation (Winter)            |$0.13143|$0.11894 |$0.09546|
|**Delivery Only (Summer)**     |$0.34979|$0.28401 |$0.12313|
|**Delivery Only (Winter)**     |$0.27956|$0.27534 |$0.13012|

**Combined All-In Rates (3CE gen + PG&E delivery) for CCA customers:**

|Period   |Summer                            |Winter                            |
|---------|----------------------------------|----------------------------------|
|Peak     |$0.18441 + $0.34979 = **$0.53420**|$0.12810 + $0.27956 = **$0.40766**|
|Part-Peak|$0.14014 + $0.28401 = **$0.42415**|$0.11574 + $0.27534 = **$0.39108**|
|Off-Peak |$0.09941 + $0.12313 = **$0.22254**|$0.09249 + $0.13012 = **$0.22261**|

**Additional per-kWh adjustments for CCA customers:**

- PCIA (2021 vintage for Buellton): $0.05264/kWh (charged by PG&E, replaces bundled PCIA)
- Franchise Fee Surcharge: ~$0.00048/kWh
- Note: The bundled PCIA of -$0.01011 is removed and replaced with the vintaged PCIA above

**Cross-validation against Nov 2025 bill (winter rates):**

- Bill showed: Peak $0.48575, Part-Peak $0.46905, Off-Peak $0.30036
- These are the PG&E-side rates (before generation credit, with NBC, PCIA adjustments)
- 3CE charges separately: Peak $0.14920, Part-Peak $0.13753, Off-Peak $0.11560

### Base Services Charge

$0.79343/day for Income Tier 3 (standard, non-CARE/FERA). **Do NOT include this in the per-kWh rate display.** Show in footnote only.

### PG&E Holidays (2026)

These holidays are recognized by PG&E but **do NOT change EV2-A TOU periods** (rates are the same every day). Include for informational display and future rate plan support.

```
2026-01-01  New Year's Day
2026-02-16  Presidents' Day (3rd Monday of February)
2026-05-25  Memorial Day (last Monday of May)
2026-07-03  Independence Day (observed — Jul 4 is Saturday)
2026-09-07  Labor Day (1st Monday of September)
2026-11-11  Veterans Day
2026-11-26  Thanksgiving (4th Thursday of November)
2026-12-25  Christmas Day
```

### EV Model Database

|Model                     |Usable Battery (kWh)|Approx Range (mi)|
|--------------------------|--------------------|-----------------|
|Tesla Model 3 (Standard)  |60                  |272              |
|Tesla Model Y (Long Range)|75                  |310              |
|Chevy Bolt EV/EUV         |65                  |259              |
|Chevy Equinox EV          |85                  |319              |
|Rivian R1T (Large Pack)   |135                 |352              |

Default Level 2 charging speed assumption: **7.7 kW** (240V / 32A typical home EVSE).

## Development Principles

### 1. Test-Driven Development (TDD) — Red-Green-Refactor

**Every feature starts with a failing test.** Follow this cycle strictly:

1. **Red:** Write a test that describes the expected behavior. Run it. Watch it fail.
1. **Green:** Write the minimum code to make the test pass. No more.
1. **Refactor:** Clean up the code while keeping tests green. Remove duplication, improve naming, extract helpers.

**Never write production code without a failing test first.**

### 2. Testing Strategy

#### Unit Tests (engine/ directory) — Test First, Always

The rate engine and cost calculator are **pure functions** with no UI dependencies. These are the easiest and most important code to test.

```javascript
// rateEngine.test.js — WRITE THESE FIRST

import { describe, it, expect } from 'vitest';
import { getCurrentPeriod, getSeason, getRate } from './rateEngine';

describe('getCurrentPeriod', () => {
  it('returns offPeak for 2:00 AM', () => {
    const date = new Date('2026-03-15T02:00:00-07:00'); // PDT
    expect(getCurrentPeriod(date)).toBe('offPeak');
  });

  it('returns offPeak for 2:59 PM', () => {
    const date = new Date('2026-03-15T14:59:00-07:00');
    expect(getCurrentPeriod(date)).toBe('offPeak');
  });

  it('returns partPeak for 3:00 PM (first window)', () => {
    const date = new Date('2026-03-15T15:00:00-07:00');
    expect(getCurrentPeriod(date)).toBe('partPeak');
  });

  it('returns peak for 4:00 PM', () => {
    const date = new Date('2026-03-15T16:00:00-07:00');
    expect(getCurrentPeriod(date)).toBe('peak');
  });

  it('returns peak for 8:59 PM', () => {
    const date = new Date('2026-03-15T20:59:00-07:00');
    expect(getCurrentPeriod(date)).toBe('peak');
  });

  it('returns partPeak for 9:00 PM (second window)', () => {
    const date = new Date('2026-03-15T21:00:00-07:00');
    expect(getCurrentPeriod(date)).toBe('partPeak');
  });

  it('returns partPeak for 11:59 PM', () => {
    const date = new Date('2026-03-15T23:59:00-07:00');
    expect(getCurrentPeriod(date)).toBe('partPeak');
  });

  it('returns offPeak for exactly midnight', () => {
    const date = new Date('2026-03-15T00:00:00-07:00');
    expect(getCurrentPeriod(date)).toBe('offPeak');
  });
});

describe('getSeason', () => {
  it('returns winter for January', () => {
    expect(getSeason(new Date('2026-01-15'))).toBe('winter');
  });

  it('returns winter for May 31', () => {
    expect(getSeason(new Date('2026-05-31'))).toBe('winter');
  });

  it('returns summer for June 1', () => {
    expect(getSeason(new Date('2026-06-01'))).toBe('summer');
  });

  it('returns summer for September 30', () => {
    expect(getSeason(new Date('2026-09-30'))).toBe('summer');
  });

  it('returns winter for October 1', () => {
    expect(getSeason(new Date('2026-10-01'))).toBe('winter');
  });
});
```

#### Component Tests (components/ directory) — Test Behavior, Not Implementation

Use React Testing Library. Test what the user sees and does, not internal state.

```javascript
// RateDisplay.test.jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RateDisplay from './RateDisplay';

describe('RateDisplay', () => {
  it('displays the current rate formatted as currency', () => {
    // Mock the current time to a known off-peak period
    vi.setSystemTime(new Date('2026-03-15T02:00:00-07:00'));

    render(<RateDisplay />);

    // Should show the off-peak rate — test the user-visible output
    expect(screen.getByText(/\$0\.\d{2}/)).toBeInTheDocument();
    expect(screen.getByText(/off-peak/i)).toBeInTheDocument();
  });

  it('shows green styling during off-peak', () => {
    vi.setSystemTime(new Date('2026-03-15T02:00:00-07:00'));
    render(<RateDisplay />);

    const badge = screen.getByTestId('rate-badge');
    expect(badge.className).toMatch(/green/);
  });

  it('shows red styling during peak', () => {
    vi.setSystemTime(new Date('2026-07-15T17:00:00-07:00'));
    render(<RateDisplay />);

    const badge = screen.getByTestId('rate-badge');
    expect(badge.className).toMatch(/red/);
  });
});
```

#### Testing Best Practices

- **Test file naming:** `[module].test.js` or `[Component].test.jsx` — co-located with source
- **Use `describe` blocks** to group related tests by function or behavior
- **One assertion per test** when possible. If a test fails, you should know exactly what broke.
- **Use descriptive test names** that read as specifications:
  - Good: `'returns partPeak for 9:00 PM (second window)'`
  - Bad: `'test partPeak'`
- **Test edge cases explicitly:** midnight boundaries, season transitions, DST changes, Feb 29
- **Mock time, not logic:** Use `vi.setSystemTime()` to control the clock. Never mock the rate engine functions themselves — test them directly.
- **No snapshot tests** for this project. They're brittle and don't test behavior.
- **Test the rate engine exhaustively.** This is the core of the app. Every boundary condition must have a test. If a rate is wrong, the entire app is wrong.

### 3. React Best Practices

#### Component Design

- **Functional components only.** No class components.
- **Custom hooks** for shared logic (e.g., `useCurrentRate()`, `useCountdown(targetTime)`).
- **Props down, events up.** Components receive data via props, communicate changes via callbacks.
- **Keep components small.** If a component exceeds ~100 lines, extract sub-components.
- **Use `data-testid` attributes** for elements that tests need to find but that don't have semantic selectors.

#### State Management

```javascript
// Good: derived state from a single source of truth
const [currentTime, setCurrentTime] = useState(new Date());
const rate = getRate(currentTime);        // derived
const period = getCurrentPeriod(currentTime); // derived
const season = getSeason(currentTime);       // derived

// Bad: storing derived values in separate state
const [rate, setRate] = useState(null);
const [period, setPeriod] = useState(null); // Don't do this
```

#### Time Handling

- **All time logic must use Pacific Time** (`America/Los_Angeles`)
- Use `Intl.DateTimeFormat` or a helper to extract the hour in Pacific Time from a Date object
- **Never assume the user's browser timezone is Pacific.** Always convert explicitly.
- Set up a `useEffect` with `setInterval` to update the current time every 60 seconds (or every second during the final 5 minutes before a rate change)

```javascript
// Helper to get Pacific Time hour from any Date
function getPacificHour(date) {
  return parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      hour12: false,
    }).format(date)
  );
}
```

### 4. Tailwind CSS Best Practices

- **Use Tailwind utilities directly in JSX.** No `@apply` unless extracting a truly reusable component class.
- **Mobile-first responsive design.** Write base styles for mobile, then add `sm:`, `md:`, `lg:` prefixes for larger screens.
- **Use semantic color naming** via Tailwind config or consistent utility classes:
  - Off-Peak: `bg-emerald-500`, `text-emerald-700`, `border-emerald-400`
  - Part-Peak: `bg-amber-500`, `text-amber-700`, `border-amber-400`
  - Peak: `bg-red-500`, `text-red-700`, `border-red-400`
- **Avoid arbitrary values** (`bg-[#1a2b3c]`) unless matching a specific brand color
- **Use `max-w-md` or `max-w-lg`** on the main container to keep the app readable on large screens
- **Dark mode is not required for v1** but avoid hardcoding white backgrounds — use `bg-gray-50` or similar so dark mode can be added later

### 5. Code Quality Rules

- **No `any` types** if using TypeScript (currently JS, but keep code type-safe in spirit)
- **No `console.log`** in production code. Use it only for debugging, then remove.
- **No commented-out code.** Git tracks history.
- **Prefer `const` over `let`.** Never use `var`.
- **Use early returns** to reduce nesting:

```javascript
// Good
function getRate(date) {
  const hour = getPacificHour(date);
  const season = getSeason(date);

  if (hour >= 16 && hour < 21) return rates[season].peak;
  if (hour === 15 || (hour >= 21 && hour < 24)) return rates[season].partPeak;
  return rates[season].offPeak;
}

// Bad
function getRate(date) {
  const hour = getPacificHour(date);
  const season = getSeason(date);
  let rate;
  if (hour >= 16 && hour < 21) {
    rate = rates[season].peak;
  } else if (hour === 15 || (hour >= 21 && hour < 24)) {
    rate = rates[season].partPeak;
  } else {
    rate = rates[season].offPeak;
  }
  return rate;
}
```

- **Extract magic numbers into named constants:**

```javascript
// Good
const PEAK_START = 16;  // 4 PM
const PEAK_END = 21;    // 9 PM
const PART_PEAK_AFTERNOON_START = 15; // 3 PM
const PART_PEAK_EVENING_END = 24;     // Midnight

// Bad
if (hour >= 16 && hour < 21) { ... }
```

### 6. Git Practices

- **Commit after each green test.** Small, frequent commits.
- **Commit message format:** `feat: add rate engine getCurrentPeriod function`
  - Prefixes: `feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`
- **One feature per branch** if working on multiple stories
- **Never commit failing tests** to main

## Build Order (Recommended)

Follow this sequence. Each step builds on the previous.

1. **Project scaffolding** — Vite + React + Tailwind + Vitest setup
1. **Rate JSON config** — `rates.json` and `vehicles.json` with all data from this document
1. **Rate engine** — TDD the core functions (`getCurrentPeriod`, `getSeason`, `getRate`, `getNextRateChange`, `getDaySchedule`)
1. **Bill validation** — Write tests that reproduce the Nov 2025 bill charges to validate rates
1. **Live rate display** — `RateDisplay` component with color-coded badge
1. **Countdown timer** — `useCountdown` hook + display
1. **24-hour timeline** — `Timeline` component with current time marker
1. **Calculator: EV selector** — Vehicle picker component
1. **Calculator: Cost output** — Charge slider + multi-period cost calculation
1. **Charging tips** — Contextual recommendations
1. **Footer & explanation** — Rate footnote with sources
1. **SEO metadata** — Title, description, OG tags
1. **Final polish** — Responsive tweaks, accessibility audit, performance check

## Running the Project

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests (watch mode)
npm test

# Run tests once (CI)
npm run test:ci

# Build for production
npm run build

# Preview production build
npm run preview
```

## Common Pitfalls

1. **Part-peak has TWO windows.** 3–4 PM and 9 PM–midnight. Don't treat it as contiguous.
1. **EV2-A rates are the same every day.** Unlike E-TOU-B or E-TOU-D, there is no weekday/weekend distinction and holidays don't change TOU periods.
1. **Browser timezone ≠ Pacific Time.** Always convert. A user visiting from the East Coast should still see Pacific Time rates.
1. **Season boundaries are month-based, not date-based.** Summer = months 6–9 (June–September). Winter = months 10–12, 1–5.
1. **Multi-hour charging spans rate periods.** A charge starting at 2 PM spans off-peak (2–3 PM), part-peak (3–4 PM), peak (4–9 PM), and potentially part-peak again (9 PM+). The cost calculator must walk through each period.
1. **Rates are for CCA (3CE) customers, not PG&E bundled customers.** The PG&E bundled total rates are different from what a 3CE customer pays. We use PG&E delivery + 3CE generation.
1. **The PCIA vintage matters.** Buellton's 3CE enrollment vintage is 2021, so the PCIA is $0.05264/kWh. Different vintages have different PCIA rates.
1. **Charging to 80% vs 100%.** Show both options. Many EV owners charge to 80% for battery longevity.
