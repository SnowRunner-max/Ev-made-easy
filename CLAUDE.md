# CLAUDE.md — Buellton EV Charging Cost Calculator

## Project Overview

A lightweight, mobile-first React SPA that shows Buellton, CA residents the real-time cost of charging an electric vehicle at home. Supports three PG&E rate plans with Central Coast Community Energy (3CE) generation: **EV2-A** (standard EV rate), **E-ELEC** (electric home rate), and **EV-B** (separately metered EV outlet). Users select their plan via a dropdown; all rate logic is data-driven from `ratePlans.json`.

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

## Context Loading Strategy

This file is long by design — it's the single source of truth for rate data, development practices, and design rules. **Do not load the entire file on every task.** Load sections progressively based on the work at hand:

- **Always load:** Tech Stack, File Structure, Common Pitfalls
- **Load when working on the rate engine or cost calculator:** Rate Data Reference
- **Load when writing or fixing tests:** Testing Strategy (section 2)
- **Load when touching UI components or styling:** UI/UX Design System (section 5), Tailwind CSS Best Practices (section 4)
- **Load when modifying rate data:** Rate Data Reference + Common Pitfalls (especially #1–#8)

Every token loaded into context that isn't relevant to the current task depletes attention for the tokens that matter.

## File Structure

```
src/
  data/
    ratePlans.json          # Multi-plan config registry (TOU schedules, rates, seasons, holidays)
    rates.json              # Legacy: still referenced by Footer.jsx fallback; holidays now in ratePlans.json
    vehicles.json           # EV model database (battery sizes, names)
  engine/
    rateEngine.js           # Core rate lookup logic (pure functions, all accept planConfig)
    rateEngine.test.js      # Unit tests for rate engine
    costCalculator.js       # Charging cost calculation logic (accepts planConfig)
    costCalculator.test.js  # Unit tests for cost calculator
  components/
    PlanSelector.jsx        # Plan dropdown (EV2-A / E-ELEC / EV-B)
    PlanSelector.test.jsx
    RateDisplay.jsx         # Hero rate badge + countdown
    RateDisplay.test.jsx
    Timeline.jsx            # 24-hour rate visualization (variable segment count)
    Timeline.test.jsx
    Calculator.jsx          # EV selector + charge slider + cost output
    Calculator.test.jsx
    ChargingTip.jsx         # Contextual recommendation
    ChargingTip.test.jsx
    Footer.jsx              # Rate explanation footnote
  hooks/
    useCurrentRate.js       # Hook: returns current rate + next change (accepts planConfig)
    useCountdown.js         # Hook: countdown timer to target time
  App.jsx                   # Plan state, planConfig derivation, wires PlanSelector + children
  App.test.jsx
  index.css                 # Tailwind directives only
  main.jsx                  # Entry point
public/
  index.html
```

## Rate Data Reference

All rate data lives in `src/data/ratePlans.json`. The three supported plans share the same 3CE generation provider (3Cchoice) but have different TOU windows, season definitions, and delivery rates. All combine PG&E delivery + 3CE generation charges.

### EV2-A — Standard EV Rate

**TOU windows** (every day, all year, including weekends and holidays):

|Period   |Hours                                    |
|---------|-----------------------------------------|
|Peak     |4:00 PM – 9:00 PM                        |
|Part-Peak|3:00 PM – 4:00 PM AND 9:00 PM – 12:00 AM |
|Off-Peak |12:00 AM – 3:00 PM                       |

**Critical:** Part-peak has TWO windows (3–4 PM and 9 PM–12 AM). This is easy to get wrong.

**Seasons:** Summer = June–September (months 6–9), Winter = October–May

**Combined All-In Rates (3CE gen + PG&E delivery):**

|Period   |Summer     |Winter     |
|---------|-----------|-----------|
|Peak     |$0.52620   |$0.39966   |
|Part-Peak|$0.41615   |$0.38308   |
|Off-Peak |$0.21454   |$0.21461   |

**Base Services Charge:** $0.79343/day (Income Tier 3). Show in footnote only, never in per-kWh display.

**Rate component detail (EV2-A):**

|Component ($/kWh)              |Peak    |Part-Peak|Off-Peak|
|-------------------------------|--------|---------|--------|
|Total Bundled Rate (Summer)    |$0.53809|$0.42760 |$0.22558|
|Total Bundled Rate (Winter)    |$0.41099|$0.39428 |$0.22558|
|Delivery Only (Summer)         |$0.34979|$0.28401 |$0.12313|
|Delivery Only (Winter)         |$0.27956|$0.27534 |$0.13012|
|3CE Generation (Summer)        |$0.17641|$0.13214 |$0.09141|
|3CE Generation (Winter)        |$0.12010|$0.10774 |$0.08449|

**Additional per-kWh adjustments for CCA customers:**
- PCIA (2021 vintage for Buellton): $0.05264/kWh
- Franchise Fee Surcharge: ~$0.00048/kWh

**Cross-validation against Nov 2025 bill (winter rates):**
- Bill showed: Peak $0.48575, Part-Peak $0.46905, Off-Peak $0.30036 (PG&E-side before generation credit)
- 3CE charges separately: Peak $0.14920, Part-Peak $0.13753, Off-Peak $0.11560

---

### E-ELEC — Electric Home Rate

**TOU windows:** Identical to EV2-A (Peak 4–9 PM, Part-Peak 3–4 PM & 9 PM–midnight, Off-Peak all other)

**Seasons:** Same as EV2-A (Summer = June–September, Winter = October–May)

**Combined All-In Rates:**

|Period   |Summer     |Winter     |
|---------|-----------|-----------|
|Peak     |$0.53950   |$0.30961   |
|Part-Peak|$0.37861   |$0.28772   |
|Off-Peak |$0.32238   |$0.27399   |

*(PG&E E-ELEC delivery + 3CE 3Cchoice generation)*

**Base Services Charge:** $0.79343/day. Show in footnote only.

---

### EV-B — Separately Metered EV Rate

**Requires a separately metered EV outlet** — must be noted in UI.

**TOU windows differ by day type:**

*Weekdays (Mon–Fri, non-holidays):*

|Period   |Hours                              |
|---------|-----------------------------------|
|Off-Peak |12:00 AM – 7:00 AM                 |
|Part-Peak|7:00 AM – 2:00 PM AND 9:00 PM – 11:00 PM|
|Peak     |2:00 PM – 9:00 PM                  |
|Off-Peak |11:00 PM – 12:00 AM                |

*Weekends and PG&E holidays:*

|Period  |Hours              |
|--------|-------------------|
|Off-Peak|12:00 AM – 3:00 PM |
|Peak    |3:00 PM – 7:00 PM  |
|Off-Peak|7:00 PM – 12:00 AM |

*(No part-peak on weekends/holidays)*

**Seasons:** Summer = **May–October** (months 5–10), Winter = November–April — **different from EV2-A/E-ELEC**

**Combined All-In Rates:**

|Period   |Summer     |Winter     |
|---------|-----------|-----------|
|Peak     |$0.60833   |$0.42774   |
|Part-Peak|$0.36565   |$0.29598   |
|Off-Peak |$0.25357   |$0.22425   |

**Daily Meter Charge:** $0.04928/day (not a base services charge — it is a separate meter fee). Show in footer.

---

### PG&E Holidays (2026)

Holidays affect EV-B TOU schedules (weekend/holiday schedule applies). They do **not** change EV2-A or E-ELEC periods.

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
// All engine functions accept planConfig as a second argument.
// Import ratePlans.json and pass the relevant plan config to each call.

import { describe, it, expect } from 'vitest';
import ratePlans from '../data/ratePlans.json';
import { getCurrentPeriod, getSeason, getRate } from './rateEngine';

const ev2aConfig = ratePlans.plans['ev2a'];

describe('getCurrentPeriod — EV2-A', () => {
  it('returns offPeak for 2:00 AM', () => {
    const date = new Date('2026-03-15T02:00:00-07:00'); // PDT
    expect(getCurrentPeriod(date, ev2aConfig)).toBe('offPeak');
  });

  it('returns partPeak for 3:00 PM (first window)', () => {
    const date = new Date('2026-03-15T15:00:00-07:00');
    expect(getCurrentPeriod(date, ev2aConfig)).toBe('partPeak');
  });

  it('returns peak for 4:00 PM', () => {
    const date = new Date('2026-03-15T16:00:00-07:00');
    expect(getCurrentPeriod(date, ev2aConfig)).toBe('peak');
  });

  it('returns partPeak for 9:00 PM (second window)', () => {
    const date = new Date('2026-03-15T21:00:00-07:00');
    expect(getCurrentPeriod(date, ev2aConfig)).toBe('partPeak');
  });
});

describe('getSeason', () => {
  // Season months are plan-specific: EV2-A summer = Jun–Sep, EV-B summer = May–Oct
  it('returns winter for January (EV2-A)', () => {
    expect(getSeason(new Date('2026-01-15'), ev2aConfig)).toBe('winter');
  });

  it('returns summer for June 1 (EV2-A)', () => {
    expect(getSeason(new Date('2026-06-01'), ev2aConfig)).toBe('summer');
  });
});
```

#### Component Tests (components/ directory) — Test Behavior, Not Implementation

Use React Testing Library. Test what the user sees and does, not internal state.

```javascript
// RateDisplay.test.jsx
// All components require a planConfig prop — import ratePlans.json in every test file.
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ratePlans from '../data/ratePlans.json';
import RateDisplay from './RateDisplay';

const ev2aConfig = ratePlans.plans['ev2a'];

describe('RateDisplay', () => {
  it('displays the current rate formatted as currency', () => {
    vi.setSystemTime(new Date('2026-03-15T02:00:00-07:00'));
    render(<RateDisplay planConfig={ev2aConfig} />);
    expect(screen.getByText(/\$0\.\d{2}/)).toBeInTheDocument();
    expect(screen.getByText(/off-peak/i)).toBeInTheDocument();
  });

  it('shows green styling during off-peak', () => {
    vi.setSystemTime(new Date('2026-03-15T02:00:00-07:00'));
    render(<RateDisplay planConfig={ev2aConfig} />);
    expect(screen.getByTestId('rate-badge').className).toMatch(/emerald/);
  });

  it('shows red styling during peak', () => {
    vi.setSystemTime(new Date('2026-07-15T17:00:00-07:00'));
    render(<RateDisplay planConfig={ev2aConfig} />);
    expect(screen.getByTestId('rate-badge').className).toMatch(/red/);
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
- **Use the brand color palette** via CSS custom properties and Tailwind's `bg-[var(--color)]` syntax, or extend `tailwind.config.js` with the brand tokens defined in section 5 below.
- **Avoid arbitrary hex values** (`bg-[#1a2b3c]`) — always reference a named CSS variable or Tailwind config token. If a color isn't in the palette, it shouldn't be in the app.
- **Use `max-w-[1120px]`** on the main layout container to match the two-panel design width.
- **No 1px structural borders.** Use `bg-grey-light/40` surface containers or background-color shifts to visually separate sections in the Input Laboratory. Reserve `border` and `divide-*` utilities for interactive elements only (toggle button groups, focus rings).
- **Dark mode is not required for v1** but avoid hardcoding white backgrounds — use `bg-[var(--off-white)]` or the Tailwind equivalent so dark mode can be added later.

### 5. UI/UX Design System

This section defines the visual design language for the entire app. The design follows **"The Editorial Engineer"** creative direction — Organic Brutalism: bold, high-contrast typography and rigid information architecture softened by a warm palette and layered depth. The interface feels intentional and asymmetric, not generic SaaS dashboard.

The split-view system has two named zones: the light-themed **"Energy Price by Rate"** panel (left) where users configure their inputs, and the high-contrast dark **"Energy Pricing"** panel (right) where cost output is displayed. The app is named **"ChargeRate"**.

**Visual reference:** See `design_system/` folder — `template-monolith.png` + `example.html` (desktop), `example_detail.html` (Cost Facts view), `example_mobile.html` + `template-mobile.png` (mobile).

#### 5.1 Color Palette — Brand Tokens

All colors are defined as CSS custom properties in `index.css` (or a `theme.css` file imported by `index.css`). Every color used in the app must come from this palette. No rogue hex values.

**The "No-Line" Rule:** Traditional 1px solid borders are prohibited for structural sectioning. Define section edges through background shifts (e.g., `surface-container-low` against a `surface` background) or tonal transitions (Vanilla Custard → Alabaster Grey). The only exception is interactive elements (input focus rings, toggle button groups) where a ghost border at 15% opacity is acceptable for accessibility.

```css
:root {
  /* ── Brand palette ── */
  --color-ink:             #050517;   /* Ink Black — results panel bg, headings, nav, footer */
  --color-ink-light:       #12122a;   /* Card surfaces on dark backgrounds */
  --color-ink-surface:     #1a1a34;   /* Elevated surfaces on dark backgrounds */
  --color-paprika:         #CF5C36;   /* Spicy Paprika — primary CTA, active states, focus rings, links */
  --color-paprika-hover:   #B84E2D;   /* Paprika darkened for hover states */
  --color-paprika-glow:    rgba(207,92,54,0.15); /* Focus ring glow */
  --color-apricot:         #EFC88B;   /* Apricot Cream — secondary accent, labels on dark bg */
  --color-custard:         #F4E3B2;   /* Vanilla Custard — table hover, info callouts */
  --color-grey:            #D3D5D7;   /* Alabaster Grey — borders, disabled states, muted text on dark */
  --color-grey-light:      #EAEBED;   /* Input borders, dividers */
  --color-off-white:       #FAFAF8;   /* Page background */
  --color-white:           #FFFFFF;   /* Input panel background, card surfaces */

  /* ── Semantic text ── */
  --text-primary:          #1a1a2e;
  --text-secondary:        #6B6B7B;
  --text-muted:            #9B9BAB;

  /* ── TOU period colors (used in timeline, badges, tips) ── */
  --color-green:           #2D8F5C;   /* Off-Peak */
  --color-green-bg:        #E8F5EE;
  --color-green-border:    #B8DFC8;
  --color-amber:           #B87B2B;   /* Part-Peak */
  --color-amber-bg:        #FDF3E0;
  --color-amber-border:    #E8CFA0;
  --color-red:             #C0392B;   /* Peak */
  --color-red-bg:          #FDECEB;
  --color-red-border:      #E8B4AF;
}
```

**Tailwind config extension** — add brand colors to `tailwind.config.js` so they can be used as `bg-ink`, `text-paprika`, `border-grey-light`, etc.:

```javascript
// tailwind.config.js — colors section
colors: {
  ink:       { DEFAULT: '#050517', light: '#12122a', surface: '#1a1a34' },
  paprika:   { DEFAULT: '#CF5C36', hover: '#B84E2D' },
  apricot:   '#EFC88B',
  custard:   '#F4E3B2',
  grey:      { DEFAULT: '#D3D5D7', light: '#EAEBED' },
  'off-white': '#FAFAF8',
}
```

#### 5.2 Typography

- **Display font:** `'Space Grotesk'` — geometric, modern, automotive feel. Used for hero numbers (the rate `$0.41/kWh`, cost estimates `$22.40`), the app title ("Volt & Ember"), and top-level section headers in the Results Monolith. Treated as editorial elements — large scale contrasts make data feel authoritative.
- **Body font:** `'Inter'` — neutral, highly legible. Used for all labels, hints, form elements, body copy, and data labels. Handles the heavy lifting of information-dense sections.
- **Never use Space Grotesk for body text, hints, or buttons.** Display font is reserved for big, glanceable numbers and structural headers.

Load both fonts via Google Fonts in `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

Tailwind config:
```javascript
fontFamily: {
  display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
  sans:    ['"Inter"', 'system-ui', 'sans-serif'],
}
```

Usage pattern:
```jsx
{/* Hero number — display (Space Grotesk) */}
<span className="font-display text-5xl tracking-tight">$0.41</span>

{/* Section header in Results Monolith — display, smaller */}
<h2 className="font-display text-2xl font-bold text-white">$22.40</h2>

{/* Everything else — sans/Inter (default, no class needed) */}
<label className="text-sm font-semibold">Current charge</label>
```

#### 5.3 Layout — Input Laboratory + Results Monolith

The app uses a **split-panel layout** with two named zones:

```
┌──────────────────────────────────────────────────────────┐
│  Top Bar (sticky, dark: --color-ink)  "Volt & Ember"     │
├─────────────────────────────────┬────────────────────────┤
│  INPUT LABORATORY (left)        │  RESULTS MONOLITH      │
│  Background: --color-white      │  Background: --color-  │
│  Scrolls normally               │  ink                   │
│                                 │  position: sticky      │
│  ┌─────────────┬─────────────┐  │  top: topbar height    │
│  │ LOCATION &  │ CONFIGURA-  │  │                        │
│  │ UTILITY     │ TION        │  │  • Current Energy Rate │
│  │ • CityPicker│ • Rate Plan │  │  • Hero rate number    │
│  │ • Provider  │ • Vehicle   │  │  • Countdown           │
│  │   toggle    │   search    │  │  • Cost cards (80/100) │
│  └─────────────┴─────────────┘  │  • Cost Distribution   │
│  • Current Charge % slider      │    donut               │
│  • Today's Rate Schedule        │  • FLIP FOR BREAKDOWN  │
│    (Timeline 24h bar)           │    button (sticky)     │
│  • Charging tip                 │                        │
├─────────────────────────────────┴────────────────────────┤
│  Footer (full-width)                                     │
└──────────────────────────────────────────────────────────┘
```

**Layout rules:**
- Desktop: `grid-template-columns: 1fr 380px` with `max-width: 1120px` centered.
- The Results Monolith is `position: sticky; top: [topbar height]; height: calc(100vh - [topbar height]); overflow-y: auto;` — stays visible as user scrolls the Input Laboratory.
- **Mobile (< 860px):** Stack vertically — Input Laboratory first, Results Monolith below. Monolith becomes static (not sticky). Grid collapses to single column.
- Input Laboratory: white background. Results Monolith: Ink Black background with white/grey/apricot text.
- **No border between panels** — the color contrast between white and Ink Black creates the visual separation. Do not add a `border` or `divide` utility here.
- Input Laboratory sub-grid: Two equal columns on desktop — "Location & Utility" | "Configuration" — that collapse to single column on mobile. Sections are separated by background shifts, not borders.

#### 5.4 Component-to-Panel Mapping

Every React component belongs to exactly one zone. The Results Monolith has two render states: **Summary view** (default) and **Cost Facts view** (toggled by "FLIP FOR BREAKDOWN").

| Component          | Zone / Section              | Notes                                               |
|--------------------|-----------------------------|-----------------------------------------------------|
| `CityPicker`       | Input Lab — Location & Utility | City or zip search input with search icon. Filled input style, no visible border. |
| `ProviderSelector` | Input Lab — Location & Utility | Toggle-button group: "PG&E Bundled" / "3CE (CCA)". Active = paprika bg. |
| `PlanSelector`     | Input Lab — Configuration   | `<select>` with optgroups. Form-hint text below explains selected plan. |
| Vehicle select     | Input Lab — Configuration   | Part of `Calculator.jsx`. Vehicle search input + custom kWh fallback. |
| Charge slider      | Input Lab — (full width)    | Thick track + large tactile thumb. Large `font-display` percentage display above. |
| Season toggle      | Input Lab — (full width)    | Toggle-button group for Summer/Winter preview. Default to current season. |
| `Timeline`         | Input Lab — (full width)    | "Today's Rate Schedule" 24-hour segmented bar with current-time marker + legend. |
| `ChargingTip`      | Input Lab — (full width)    | Color-coded tip box at bottom of Input Laboratory. |
| `RateDisplay`      | Results Monolith — Summary  | "Current Energy Rate" label, period badge, hero rate number (`font-display text-5xl`), countdown. |
| Cost cards         | Results Monolith — Summary  | "CHARGE TO 80%" and "CHARGE TO 100%" dark cards with `font-display` cost values. |
| Donut chart        | Results Monolith — Summary  | "COST DISTRIBUTION" section. SVG stroke-dasharray donut. Two segments: Delivery % (paprika) + Generation % (apricot). Legend shows percentages, not dollar values. |
| "FLIP FOR BREAKDOWN" button | Results Monolith — Summary | Full-width paprika pill button, sticky at bottom. Toggles `showCostFacts` state in App. |
| Cost Facts view    | Results Monolith — Cost Facts | Alternate render state (not a separate component). Nutrition-label style. Shows PG&E Delivery total + Generation total + combined rate for the 80% charge scenario. "BACK TO SUMMARY" button returns. Detailed line items (Transmission, Distribution, etc.) deferred to a future planning tool. |
| `Footer`           | Below both                  | Full-width. Same content as current Footer. |

#### 5.5 Four UX Principles

These are not suggestions — they are **rules** enforced during development and code review, just like "always pass planConfig" or "test edge cases explicitly."

**Principle 1: Instant feedback.** Every input change (dropdown, slider, toggle) must immediately update the results panel. No "Calculate" button. No loading spinners for local computation. `useState` + derived values, not async flows.

**Principle 2: Progressive disclosure.** The default Summary view shows only what a first-time visitor needs: vehicle, charge level, plan, and the resulting cost. Advanced bill details (itemized PG&E delivery line items — Transmission, Distribution, Public Purpose Programs, Nuclear Decommissioning, Wildfire Fund, CTC — plus 3CE Generation and Taxes & Fees) live behind the "FLIP FOR BREAKDOWN" button. Tapping it replaces the Summary view with the Cost Facts view; "BACK TO SUMMARY" returns to Summary. Always accessible, never shown by default. Test: a user who has never seen a PG&E bill should understand the Summary view.

**Principle 3: One hero number.** The current per-kWh rate (e.g., `$0.41/kWh`) is the single most visually prominent element on the page — `font-display text-5xl` on the dark Results Monolith. Everything else (donut chart, cost cards, timeline) exists to explain and contextualize that one number. Do not compete with it visually.

**Principle 4: Contextual education.** Every input field has a brief, plain-English `.form-hint` below it. Not a tooltip, not a modal — inline text visible at a glance. Examples:
- Plan selector: "For customers with an EV, battery storage, or heat pump. Whole-house metering."
- Provider toggle: "Most Buellton residents are served by 3CE for generation."
- Charge slider: No hint needed — the large percentage display is self-explanatory.

#### 5.6 Component Styling Patterns

**Form inputs (Input Laboratory):**
- Labels: `text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]` (floating above the field)
- Input/Select: Filled style — `bg-grey-light/40 rounded-[0.25rem] px-3 py-2 text-sm` — no visible border at rest
- Focus state: `outline-none ring-1 ring-paprika/20 bg-white transition-colors` — ghost ring only
- Hints: `text-xs text-[var(--text-muted)] mt-1` below the input

**Toggle buttons (provider, season):**
- A flex row of buttons inside a `rounded-lg overflow-hidden bg-grey-light/40` container (no hard border)
- Active button: `bg-paprika text-white font-semibold`
- Inactive button: `bg-transparent text-[var(--text-secondary)]`, hover `bg-white/60`

**Section organization (Input Laboratory):**
- Section title labels: `text-[11px] uppercase tracking-widest text-paprika font-semibold mb-3`
- Sections separated by background shift (e.g., `bg-grey-light/30` card wrapping a sub-group) — no `<hr>` dividers

**Results Monolith cards (Summary view):**
- Background: `bg-ink-light`
- Border: `border border-white/[0.06] rounded-xl` (very subtle — this is acceptable; it's not structural sectioning)
- Header: `text-xs uppercase tracking-wide text-grey`
- Value: `font-display text-2xl font-bold text-white`
- Detail: `text-xs text-[var(--text-muted)]`

**Rate badge (Results Monolith):**
- Pill shape: `rounded-full px-3 py-1`
- Contains a small pulsing dot + period label
- Off-peak: green dot + green text on green/20 bg
- Part-peak: apricot dot + apricot text on apricot/20 bg
- Peak: red dot + red text on red/25 bg

**Donut chart (Results Monolith — COST DISTRIBUTION):**
- SVG path with `stroke-dasharray` — two segments only. No charting library needed.
- Segment 1: Paprika (`#CF5C36`) — PG&E Delivery percentage.
- Segment 2: Apricot (`#EFC88B`) — Generation percentage.
- Circle uses `r=15.9155` so circumference ≈ 100, making `stroke-dasharray="${pct}, 100"` directly map to percentages.
- Center label: `"100%"` in `font-display text-lg font-bold`.
- Legend to the right: colored dots + labels + percentage values (no dollar values in legend).

**FLIP FOR BREAKDOWN button (Results Monolith — sticky bottom):**
- Full-width, `bg-paprika hover:bg-paprika-hover rounded-xl py-3`
- Text: `font-display text-sm uppercase tracking-widest text-white`
- Sticky at the bottom of the Results Monolith: `sticky bottom-0`
- On click: toggles `showCostFacts` state (managed in App.jsx)

**Cost Facts view (Results Monolith — alternate state):**
- Same dark `bg-ink` background
- Title: `font-display text-2xl font-bold text-white` ("COST FACTS")
- Sub-header metadata: `text-xs text-grey` (season, kWh delivered, date)
- Section headers (`PG&E DELIVERY`, `3CE GENERATION`, `TAXES & FEES`): `text-xs uppercase tracking-widest text-grey mt-4 mb-1`
- Line items: `flex justify-between text-sm text-white py-0.5`
- Total row: `font-display text-lg font-bold text-white border-t border-white/10 pt-2 mt-2`
- "BACK TO SUMMARY" button: same full-width paprika pill style as FLIP button

**Charging tip (Input Laboratory):**
- `rounded-xl px-4 py-3 text-sm` — no explicit border (use bg color for definition)
- Off-peak: `bg-[var(--color-green-bg)] text-[#1a5e3a]`
- Part-peak: `bg-[var(--color-amber-bg)] text-[#7a5614]`
- Peak: `bg-[var(--color-red-bg)] text-[#8a2720]`

#### 5.7 Mobile Adaptations

- **Breakpoint:** `860px` (use `@media (max-width: 860px)` or Tailwind `max-md:`)
- Below breakpoint: single-column stack. Input Laboratory content first, Results Monolith below as a static block.
- Results Monolith becomes `position: static`, full-width, same dark `bg-ink` background.
- Hero rate font size reduces from `text-5xl` to `text-4xl`.
- Donut chart + legend stack vertically (centered).
- **Mobile sticky header:** A dark bar (`bg-ink`) stays pinned below the nav bar showing total estimated cost (`font-display text-2xl`) + SESSION kWh. SESSION = kWh needed to charge to 80% from the current slider position.
- **Bottom tab bar:** Three tabs sticky at the bottom of the screen — `Calculator | History | Account` — `bg-ink text-xs` with a paprika underline on the active tab. History and Account are stubs in v1 (show empty state).
- "FLIP FOR BREAKDOWN" works identically on mobile — full-width button taps to Cost Facts view within the Results Monolith block.

### 6. Code Quality Rules

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

- **TOU boundaries come from `planConfig.touSchedules`, not hardcoded constants.** The engine is data-driven: `getScheduleForDay(date, planConfig)` returns the correct block array for the plan and day type. Don't reintroduce hardcoded hour constants — read from the schedule blocks instead.

### 7. Git Practices

- **Commit after each green test.** Small, frequent commits.
- **Commit message format:** `feat: add rate engine getCurrentPeriod function`
  - Prefixes: `feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`
- **One feature per branch** if working on multiple stories
- **Never commit failing tests** to main

### 8. Claude Code Guidance

#### Prefer General Tools

Claude Code works best with bash and file editing — general tools it already knows well. Do not add custom tool wrappers, orchestration scripts, or scaffolding that pre-decides what Claude should do. Trust Claude to compose `read file → run tests → edit → run tests` into the right sequence for each task. This project's stack (Vite, Vitest, React, Tailwind) is deliberately mainstream — no exotic tooling.

#### Filter Output, Don't Flood Context

When running tests or builds, pipe output through filters so only relevant information enters the context window:

```bash
# Good: show only failures and summary
npm test -- --run 2>&1 | tail -30

# Good: show only failing test names
npm test -- --run 2>&1 | grep -E "FAIL|✗|Error"

# Bad: dump entire verbose test output into context
npm test -- --run --reporter=verbose
```

The same applies to build output, linting, and any command that produces large output. Filter to what matters for the current task.

#### Action Boundaries

**Always pause and confirm before:**
- Modifying `ratePlans.json` — rate data changes must be validated against tariff PDFs before committing. A wrong rate silently breaks every cost calculation.
- Changing season month ranges — these are plan-specific and easy to cross-contaminate (EV-B uses May–Oct, others use Jun–Sep).
- Touching the `pgeDelivery` / `pgeGeneration` / `cce` schema structure — the v2.0 three-field separation was a deliberate bug-prevention decision. Collapsing or renaming these fields reintroduces the class of bugs v2.0 was designed to eliminate.
- Deleting or renaming test files — tests are the project's safety net.

**Proceed without asking:**
- Adding or editing test files (more tests = better)
- Refactoring component internals without changing props or external behavior
- Updating README, comments, or CLAUDE.md documentation
- Adding new CSS custom properties to the palette (as long as they follow the naming convention in section 5.1)
- Creating new components in `src/components/` that follow existing patterns

#### Maintenance: Prune This File Over Time

CLAUDE.md should **shrink** as Claude gets smarter, not grow. After completing a batch of stories, revisit and ask: *what can I stop telling Claude?* If Claude consistently follows a rule without being reminded, that rule is dead weight consuming context tokens. Remove it. The guidance that remains should be the stuff that's genuinely non-obvious — rate data quirks, plan-specific gotchas, and project-specific design decisions that can't be inferred from the code alone.

## Build Order (Recommended)

Follow this sequence. Each step builds on the previous.

1. **Project scaffolding** — Vite + React + Tailwind + Vitest setup
1. **Rate JSON config** — `ratePlans.json` (multi-plan registry with TOU schedules, rates, seasons, holidays) and `vehicles.json`
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
1. **Two-panel layout** — Implement the Input Laboratory + Results Monolith split-panel layout (section 5.3), moving existing components into their designated zones
1. **Donut chart** — Rate component breakdown visualization (section 5.6)
1. **Rate breakdown table** — Collapsible per-period detail (section 5.6)
1. **Brand theming** — Apply full color palette, typography, and styling patterns (sections 5.1–5.2, 5.6)
1. **Final polish** — Responsive tweaks, mobile stacking, accessibility audit, performance check

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

1. **Always pass `planConfig` to engine functions.** `getCurrentPeriod`, `getSeason`, `getRate`, `getNextRateChange`, `getDaySchedule`, `calcChargeSummary` — all require `planConfig` as a parameter. Calling them without it will throw.
1. **Part-peak has TWO windows on EV2-A and E-ELEC.** 3–4 PM and 9 PM–midnight. EV-B weekday also has two part-peak windows (7 AM–2 PM and 9–11 PM). EV-B weekend has **no** part-peak at all — guard against `planConfig.rates[season].partPeak` being absent.
1. **EV-B has weekday/weekend TOU distinction.** EV2-A and E-ELEC rates are the same every day; EV-B is not. `getScheduleForDay` handles this via `planConfig.weekdayVariant`. Holidays use the weekend schedule for EV-B.
1. **EV-B summer season starts in May, not June.** EV-B summer = months 5–10 (May–October). EV2-A/E-ELEC summer = months 6–9 (June–September). Season logic is data-driven — read from `planConfig.seasons.summer.months`, never hardcode.
1. **Browser timezone ≠ Pacific Time.** Always convert. A user visiting from the East Coast should still see Pacific Time rates.
1. **Multi-hour charging spans rate periods.** A charge starting at 2 PM (EV2-A) spans off-peak (2–3 PM), part-peak (3–4 PM), peak (4–9 PM), and potentially part-peak again. The cost calculator walks through each period.
1. **Rates are for CCA (3CE) customers, not PG&E bundled customers.** We use PG&E delivery + 3CE generation. The bundled totals on the tariff sheet are for non-CCA customers.
1. **The PCIA vintage matters.** Buellton's 3CE enrollment vintage is 2021, so the PCIA is $0.05264/kWh. Different vintages have different PCIA rates.
1. **Charging to 80% vs 100%.** Show both options. Many EV owners charge to 80% for battery longevity.
1. **Colors must come from the palette.** Never introduce a hex value that isn't defined in the CSS custom properties (section 5.1). If you need a new shade, add it to the palette first with a semantic name.
1. **Display font is only for hero numbers and structural headers.** `Space Grotesk` is used exclusively for large, glanceable numeric values (rate per kWh, cost estimates) and top-level section headers in the Results Monolith. All other text — labels, hints, buttons, body copy, data labels — uses `Inter`. Mixing Space Grotesk into body text breaks the editorial hierarchy.
1. **Results Monolith is always dark.** The right panel always uses `--color-ink` background with light text. Never render white-background cards or light-themed components inside it. Use `--color-ink-light` for elevated card surfaces within the dark panel.
1. **No 1px borders for structural separation.** Use background color shifts or tonal transitions to define sections within the Input Laboratory. A `border border-grey-light` on an interactive element (toggle group, focused input) is fine; using it to draw a dividing line between two layout sections is not.