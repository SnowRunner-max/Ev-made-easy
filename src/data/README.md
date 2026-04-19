# src/data — Rate Registry Reference

This directory holds all runtime rate data consumed by the app. The app supports multiple delivery utilities (currently PG&E and SCE), each with multiple CCA generation providers.

---

## Files at a glance

| File | Purpose |
|---|---|
| `ratePlans.json` | PG&E delivery + CCA generation rates (schema v3.0) |
| `sceRatePlans.json` | SCE delivery + CCA generation rates (same schema) |
| `serviceAreas.json` | Service area registry: maps `serviceAreaId` → utility, CCAs, default plan |
| `pgeTerritory.json` | ZIP-to-`serviceAreaId` lookup for PG&E territory |
| `sceTerritory.json` | ZIP-to-`serviceAreaId` lookup for SCE territory |
| `multiUtilityZips.json` | ZIPs that span a PG&E/SCE boundary — triggers the UtilityPicker disambiguation flow |
| `vehicles.json` | EV model database (battery size, efficiency, etc.) |

---

## How a ZIP becomes a rate

1. **`useLocationLookup.js`** takes a ZIP and checks `pgeTerritory.json`, `sceTerritory.json`, and `multiUtilityZips.json` to resolve a `serviceAreaId` (e.g. `"pge-3ce-sbco"` or `"sce-cpa-la"`).
2. **`App.jsx / RATE_PLAN_REGISTRY`** maps each `serviceAreaId` to a rate data import:
   ```js
   const RATE_PLAN_REGISTRY = {
     'pge-3ce-sbco':  ratePlans,      // → ratePlans.json
     'sce-cpa-la':    sceRatePlans,   // → sceRatePlans.json
     // … one entry per service area
   };
   ```
3. **`serviceAreas.json`** provides the CCA list and default plan for the resolved area, which drives the provider selector and plan selector UI.
4. **`getEffectiveConfig`** in `App.jsx` combines delivery rates + CCA generation rates from the resolved rate file into a single `planConfig` passed to the rate engine.

---

## Adding a new utility (e.g. SDG&E)

1. **Create a rate data file** — `src/data/sdgeRatePlans.json` following the v3.0 schema in `PGE_README.md`. Every rate cell needs `delivery`, `generation`, and `totalBundled`; CCA rates go under `ccaGeneration`.

2. **Add a territory lookup** — `src/data/sdgeTerritory.json` mapping ZIP → `serviceAreaId`. Follow the shape of `pgeTerritory.json` or `sceTerritory.json`.

3. **Register service areas** — Add entries to `serviceAreas.json` for each SDG&E service area (one per distinct CCA or CCA-less zone). Each entry needs `utility`, `utilityLabel`, `defaultPlan`, and `ccas`.

4. **Wire up the registry** — In `App.jsx`, import the new rate file and add one entry per service area to `RATE_PLAN_REGISTRY`:
   ```js
   import sdgeRatePlans from './data/sdgeRatePlans.json';
   // …
   const RATE_PLAN_REGISTRY = {
     // existing entries …
     'sdge-ceg-sd': sdgeRatePlans,
   };
   ```

5. **Hook up the ZIP lookup** — In `useLocationLookup.js`, add a lookup step for `sdgeTerritory.json` alongside the existing PG&E and SCE lookups.

6. **Add tests** — At minimum: provider defaults for a representative ZIP, tier selector smoke test, and a cross-utility reset test (see existing SBCE tests in `App.test.jsx` for the pattern).

---

## Schema version

Both `ratePlans.json` and `sceRatePlans.json` use **schema v3.0** (field names: `delivery / generation / totalBundled / ccaGeneration`). The schema was bumped from v2.0 in the refactor documented in commit `2840d97`. See `PGE_README.md` and `SCE_README.md` for full field-level documentation.
