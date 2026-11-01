# AGENTS.md — EV Made Easy

Canonical repository and development guidance for EV Made Easy / MyEVRate.

## Project Purpose & Stack

Real-time home EV charging cost calculator covering five California utility territories: PG&E, SCE, SDG&E, TDPUD (Truckee), and Liberty Utilities (Tahoe). Supports multiple community-choice aggregation (CCA) generation providers per territory.

Client-side React 18 + Vite SPA with Tailwind CSS and Vitest + React Testing Library. No backend, router, or state management library. Live rates are calculated from the current Pacific Time and bundled tariff data, not fetched from a live utility API.

**Notion:** https://www.notion.so/32ae8e8770bf81b59c72e509ed5ebdfc

## Project Structure & Module Organization

Main code lives in `src/`:

- `src/App.jsx` resolves location → service area → rate-plan registry → effective plan config → engine/UI
- `src/components/` UI components with co-located tests such as `PlanSelector.test.jsx`
- `src/engine/` pure rate and cost logic in `rateEngine.js` and `costCalculator.js`, with co-located `.test.js` coverage
- `src/hooks/` reusable hooks, including `useCurrentRate.js`, `useCountdown.js`, and `useLocationLookup.js`
- `src/data/` rate plans, territory lookups, service-area registries, and vehicle data
- `src/constants/periodColors.js` single source of truth for TOU period labels, colors, and ordering
- `src/utils/` shared utilities such as Pacific Time helpers

Runtime data files:

- `src/data/ratePlans.json` PG&E delivery, generation, CCA rates, and TOU schedules
- `src/data/sceRatePlans.json`, `src/data/sdgeRatePlans.json`, `src/data/tdpudRatePlans.json`, and `src/data/libertyRatePlans.json` corresponding utility rate data using the same schema
- `src/data/serviceAreas.json` service-area registry: utility ID, CCA(s), and default plan/provider
- `src/data/pgeTerritory.json`, `src/data/sceTerritory.json`, `src/data/sdgeTerritory.json`, `src/data/tdpudTerritory.json`, and `src/data/libertyTerritory.json` ZIP-to-service-area lookups
- `src/data/multiUtilityZips.json` ZIPs spanning utility boundaries; triggers the `UtilityPicker` disambiguation flow
- `src/data/vehicles.json` EV model database
- `src/data/utilityRegistry.js` per-utility bundled provider ID, rate-plan and territory imports, and metadata keys
- `src/data/ratePlanRegistry.js` maps service-area IDs to utility rate data, derived from the utility registry
- `src/data/effectivePlanConfig.js` composes provider, CCA tier, and delivery/generation rates into the effective config used by the engine/UI

See `src/data/README.md` for the registry pattern, territory pipeline, and instructions for adding a utility.

Authoritative references live in `data-sources/pge_source/`, `data-sources/sce_source/`, `data-sources/sdge_source/`, `data-sources/tdpud_source/`, `data-sources/liberty_source/`, and `data-sources/cca_source/`. Design references live in `design_system/`. Build output goes to `dist/`.

## Build, Test, and Development Commands

- `npm run dev` starts the Vite dev server
- `npm run build` creates a production bundle in `dist/`
- `npm run preview` serves the production build locally
- `npm test` runs Vitest in watch mode
- `npm run test:ci` runs tests once for CI or pre-PR checks
- `npm run test:ui` opens the Vitest UI
- `npm run lint` runs ESLint on `src/`
- `npm run territory:validate` audits territory data, service areas, and provider/rate backing
- `npm run territory:check` verifies generated territory output matches checked-in runtime JSON
- `npm run sources:validate` verifies source artifacts against their catalogs and manifests

Use `npm run test:ci && npm run lint && npm run build` before opening a PR.

## Coding Style & Naming Conventions

Follow the existing React style: functional components, hooks, ES modules, and concise pure helpers. Use PascalCase for components (`RateDisplay.jsx`), camelCase for hooks and utilities (`useCurrentRate.js`, `pacificTime.js`), and co-locate tests beside the file they cover. Match the formatting style of the file you edit.

Styling is primarily Tailwind utility classes plus shared tokens in `src/index.css`. Prefer existing CSS variables and avoid introducing one-off colors. Linting is enforced with `eslint.config.js`.

## Rate Data & Source of Truth

All five utility rate-plan JSON files are derived artifacts. When modifying any of them, validate every changed value against the documents in the corresponding `data-sources/*_source/` directory. If the JSON and a source document disagree, the source document wins. Record the effective date and cite the source workbook or tariff.

### PG&E Reference

Six supported PG&E plans: **EV2-A, E-ELEC, EV-B, E-TOU-C, E-TOU-D, E-1**.

Reference sources: PG&E Advice Letter 7846-E (effective March 1, 2026) and 3CE Rate Sheet v29 (effective February 15, 2026). Other utilities and CCAs have their own effective dates; consult their metadata and source documents.

### Schema v3.0

Raw TOU rates use separate parallel maps: `rates.delivery[season][period]`, `rates.generation[season][period]`, and `rates.totalBundled[season][period]`. For each matching rate cell, `delivery + generation = totalBundled` (±0.00001). This invariant applies to all five utility rate files. Non-TOU plans use tier/usage keys instead of season/period keys.

The `rates.ccaGeneration` map holds CCA generation charges keyed by CCA slug, such as `3ce` or `cpa`, with provider-specific tiers and a default tier. The effective config composes verified billing components for the engine. For PG&E + 3CE, stored delivery retains the bundled PCIA credit: remove that credit before adding selected generation, vintage PCIA, franchise fee and state surcharge. `src/data/pgeChargePolicy.js` documents the verified runtime policy; do not blindly apply its fees to other CCAs.

Never collapse delivery and generation into a single field: their separation prevents double-counting CCA rates, which was the v1 bug.

### PG&E Plan Quirks

- **EV2-A / E-ELEC**: Part-peak has two windows: 3–4 PM and 9 PM–midnight.
- **EV-B**: Weekday and weekend/holiday schedules differ. Summer is May–October, not June–September. `src/engine/schedulePolicy.js` applies the tariff's one-hour-later March/April and October/November shoulder windows without changing raw JSON. CCA generation alignment remains unverified. The daily meter charge is $0.04928/day; show it as a footnote, not in the per-kWh rate.
- **E-TOU-C / E-TOU-D**: Only two TOU periods; no part-peak.
- **E-1**: Tiered, not time-based. Require an explicit within/above-baseline assumption or remaining metered baseline kWh; unknown eligibility uses a warned above-baseline reference.
- **E-TOU-C baseline**: The -$0.08140/kWh credit requires explicit eligibility. Remaining-baseline session splitting is an incremental-energy assumption, not the tariff's proportional whole-bill TOU allocation.
- **Holidays**: EV-B uses the weekend schedule; E-TOU-D excludes holidays from weekday peak pricing. Follow each plan's day rules. Saturday/Sunday residential observation is not yet tariff-verified; the legacy observation assumption is retained consistently across years and must not be called a verified universal FERC policy.
- **Base Services Charge**: Approximately $0.79/day for income tier 3; footnote only, never in the per-kWh display.
- **PCIA vintage**: Read it from the account's bill, never infer it from Buellton or a ZIP. The supplied statement confirms 2021 ($0.05264/kWh) for that account only. Unknown vintage uses a visibly warned standard 2021 reference. Complete exempt-customer-group pricing is unsupported.
- **EV-A**: Eliminated November 30, 2025. EV-B is the correct separate-meter plan.

## Engine Rules

Rate and cost functions that depend on a plan must receive `planConfig`; always pass it. Never hardcode TOU hours: read from `planConfig.touPeriods`. Season boundaries are plan-specific: read `planConfig.seasons.summer.startMonth` and `endMonth`, and handle non-TOU plans with no seasons.

Time logic must always use Pacific Time (`America/Los_Angeles`), regardless of the browser's timezone.

Multi-hour charging spans multiple rate periods. Walk each integration boundary individually, require strictly forward progress, and integrate every component over the same segments. `getNextRateChange` skips equal-price boundaries and returns null when none is known; use `getNextIntegrationBoundary` for cost integration.

Battery energy is not metered energy. Session options accept wall-to-battery efficiency; the backward-compatible 100% default is explicitly disclosed. Charger kW is wall power. NEM2 exports, balances, non-bypassable reconciliation and annual settlement are not modeled: the UI offers an incremental grid-import estimate, not a bill.

## Testing Guidelines

Follow TDD: write a failing test first, implement the minimum code to pass, then refactor.

Vitest and React Testing Library are the standard tools. Test behavior, not implementation details. Name tests `*.test.js` for engine/utilities and `*.test.jsx` for React components. Co-locate tests with the code they cover.

- Add exhaustive engine boundary coverage for midnight, seasons, weekends, holidays, and Pacific Time/DST transitions.
- Mock time with `vi.setSystemTime()` when validating rate windows or countdown behavior; never mock engine functions.
- Do not use snapshot tests.

## UI/UX Rules

- **Layout**: Split panel with the light Input Laboratory on the left and ink-black Results Monolith on the right. Stack vertically at the mobile breakpoint (860px).
- **Color palette**: Use CSS custom properties in `src/index.css`, not one-off hex values. Key tokens are `--color-ink` (#050517), `--color-paprika` (#CF5C36), `--color-apricot` (#EFC88B), `--color-custard` (#F4E3B2), and `--color-offwhite` (#FAFAF8).
- **TOU colors**: Green for off-peak, amber for part-peak, and red for peak. Use `src/constants/periodColors.js` for period labels, colors, and ordering, including additional utility-specific periods.
- **Typography**: Use Space Grotesk for hero numbers and structural headers only. Use DM Sans or Inter for other interface text.
- **No 1px structural borders**: Separate sections with background-color shifts. Reserve borders for interactive elements such as focus rings and toggle groups.
- **Results Monolith is always dark**: Never render light-background cards inside it.
- **One hero number**: The current $/kWh rate is the single most prominent element.
- **Configuration is inline, not a sheet**: The Input Laboratory's two-column grid holds Location, Rate Plan, Generation Provider, Generation Tier, Vehicle, and Charger Speed. Show generation provider toggle buttons only when the plan supports CCA generation, and the tier selector only when the selected CCA has multiple tiers. Keep these controls directly editable; no modal or gear icon.
- **Persistent context**: The header shows the active location and plan, for example, "Plan EV2-A · PG&E + 3CE".

## Action Boundaries

**Pause and confirm before:**

- Modifying `src/data/ratePlans.json`; validate against tariff PDFs first
- Changing season month ranges
- Changing the rate schema structure (`delivery / generation / totalBundled / ccaGeneration`, formerly `pgeDelivery / pgeGeneration / cce`)
- Deleting or renaming test files

**Proceed without asking:**

- Adding or editing tests
- Refactoring internals without changing props or behavior
- Updating documentation, comments, and `AGENTS.md`
- Adding CSS custom properties following naming conventions
- Creating new components following existing patterns

## Commit & Pull Request Guidelines

Recent history favors short, imperative commits, often with prefixes like `feat:`, `refactor:`, and `docs:`. Keep that pattern where possible, for example: `feat: add SCE provider selector`.

PRs should include a brief summary, note any affected plans/providers, link the related issue if one exists, and attach screenshots for visible UI changes. If rate data changes, cite the source workbook or tariff used.

## Large Source Files

Bulky authoritative inputs are repo-managed with Git LFS rather than ordinary Git blobs. This includes tariff PDFs, source workbooks, and pinned territory GeoJSON snapshots declared in `.gitattributes`.

When investigating rates or territory inputs, inspect `data-sources/source-catalog.json`, `data-sources/territory/source-manifest.json`, and the related README files first. Open raw binaries or large GeoJSON only when the task specifically requires source verification or regeneration. Do not treat large source directories as routine context to bulk-read or index.
