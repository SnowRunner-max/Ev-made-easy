# src/data — Rate Registry Reference

This directory holds all runtime rate data consumed by the app. The app supports multiple delivery utilities, each with optional CCA generation providers.

---

## Files at a glance

| File | Purpose |
|---|---|
| `ratePlans.json` | PG&E delivery + CCA generation rates (schema v3.0) |
| `sceRatePlans.json` | SCE delivery + CCA generation rates (same schema) |
| `serviceAreas.json` | Service area registry: maps `serviceAreaId` → utility, CCAs, default plan |
| `pgeTerritory.json` | ZIP-to-`serviceAreaId` lookup for PG&E territory |
| `sceTerritory.json` | ZIP-to-`serviceAreaId` lookup for SCE territory |
| `multiUtilityZips.json` | ZIPs that span a supported utility boundary — triggers the UtilityPicker disambiguation flow |
| `vehicles.json` | EV model database (battery size, efficiency, etc.) |
| `utilityRegistry.js` | Runtime utility registry: bundled provider IDs, rate-plan imports, territory imports, metadata keys |
| `effectivePlanConfig.js` | Shared helper for provider options, CCA tiers, and delivery/generation rate composition |

---

## How a ZIP becomes a rate

1. **`useLocationLookup.js`** takes a ZIP and checks `pgeTerritory.json`, `sceTerritory.json`, and `multiUtilityZips.json` to resolve a `serviceAreaId` (e.g. `"pge-3ce-sbco"` or `"sce-cpa-la"`).
2. **`utilityRegistry.js / RATE_PLAN_REGISTRY`** maps each service area's `utilityId` to a rate data import:
   ```js
   serviceAreas['pge-3ce-sbco'].utilityId // "pge" -> ratePlans.json
   serviceAreas['sce-cpa-la'].utilityId   // "sce" -> sceRatePlans.json
   ```
3. **`serviceAreas.json`** provides `utilityId`, CCA list, default plan, and default provider for the resolved area.
4. **`effectivePlanConfig.js`** combines delivery rates + CCA generation rates from the resolved rate file into a single `planConfig` passed to the rate engine and UI.

---

## Adding a new utility (e.g. SDG&E)

1. **Create a rate data file** — `src/data/sdgeRatePlans.json` following the v3.0 schema in `PGE_README.md`. Every rate cell needs `delivery`, `generation`, and `totalBundled`; CCA rates go under `ccaGeneration`.

2. **Add a territory lookup** — `src/data/sdgeTerritory.json` mapping ZIP → `serviceAreaId`. Follow the shape of `pgeTerritory.json` or `sceTerritory.json`.

3. **Register the utility** — Add an `sdge` entry to `utilityRegistry.js` with the SDG&E bundled provider ID, direct service-area ID, rate-plan import, territory import, and metadata keys.

4. **Register service areas** — Add entries to `serviceAreas.json` for each SDG&E service area (one per distinct CCA or CCA-less zone). Each entry needs `utilityId`, `utility`, `defaultPlanId`, `defaultProvider`, and `ccas`.

5. **Hook up the ZIP lookup** — Once `sdge` is in `utilityRegistry.js`, `useLocationLookup.js` automatically checks the SDG&E territory in registry order.

6. **Add tests** — At minimum: provider defaults for a representative ZIP, tier selector smoke test, and a cross-utility reset test (see existing SBCE tests in `App.test.jsx` for the pattern).

---

## Schema version

Both `ratePlans.json` and `sceRatePlans.json` use **schema v3.0** (field names: `delivery / generation / totalBundled / ccaGeneration`). The schema was bumped from v2.0 in the refactor documented in commit `2840d97`. See `PGE_README.md` and `SCE_README.md` for full field-level documentation.

---

## Territory data pipeline

Territory JSON files are runtime artifacts, but they are checked in so the client app stays fast and static. The lookup contract is unchanged: `useLocationLookup.js` reads `pgeTerritory.json`, `sceTerritory.json`, and `multiUtilityZips.json` and resolves a ZIP to a `serviceAreaId` only when the utility territory and supported rate data are verified.

### Commands

| Command | Purpose |
|---|---|
| `npm run territory:validate` | Audits checked-in territory JSON, service-area registry entries, provider defaults, CCA rate backing, and rate registry wiring |
| `npm run territory:build` | Regenerates territory JSON from committed source snapshots and documented overrides |
| `npm run territory:check` | Verifies generated territory output matches checked-in runtime JSON |
| `npm run territory:pin-zcta` | Downloads and pins the California Census TIGERweb ZCTA snapshot for offline overlay work |
| `npm run territory:overlay` | Builds reviewed ZIP candidates from pinned CEC utility/CCA polygons and the pinned ZCTA snapshot |
| `npm run territory:promote` | Promotes only reviewed overlay candidates into `verified-zips.json` |
| `npm run sources:catalog` | Refreshes the local raw-source file catalog and SHA-256 hashes |
| `npm run sources:validate` | Verifies local rate source files and pinned territory raw sources still match their catalogs/manifests |

### Source governance

Committed source metadata lives in `data-sources/territory/`:

- `source-manifest.json` records the pinned or intended authoritative sources, including the CEC PG&E/SCE and CCA boundary snapshots.
- `../source-catalog.json` records the local PG&E, CCA, and SCE raw rate source files available for rate-backed coverage work.
- `overlay-candidates.json` records offline ZCTA overlay suggestions plus human review state. It is not runtime data.
- `cca-service-area-map.json` maps exact CEC CCA acronyms to internal rate-backed service-area IDs and records known unbacked CCA polygons.
- `verified-zips.json` is the current generator source. It is still bootstrapped from checked-in runtime artifacts until the pinned CEC boundary snapshots are overlaid with a reviewed ZIP/ZCTA source.
- `manual-overrides.json` documents edge cases where ZIP-level geography is ambiguous or a conservative multi-utility flow is required.
- `build-report.json` is generated locally by `npm run territory:build` and is intended for PR notes rather than source control.

Large raw source artifacts are tracked through Git LFS, not ordinary Git blobs. The repo keeps manifests, catalogs, review artifacts, and runtime JSON in normal Git, while tariff PDFs, source workbooks, and pinned territory GeoJSON snapshots stay available at their existing paths through LFS hydration.

For routine inspection, read the source catalog, source manifest, and README files first. Open large raw files only when a task requires tariff verification, source refresh, or territory regeneration.

Source priority for future expansion:

1. Utility territory from pinned California Energy Commission IOU/POU boundary data, cross-checked against PG&E/SCE service-area pages.
2. CCA territory from pinned CEC/CalCCA boundary data, cross-checked against utility CCA pages.
3. `zipcodes` metadata only for ZIP normalization, city/state labels, and California ZIP enumeration.
4. Manual overrides only when documented with a source and review date.

Accuracy policy: unsupported is better than wrong. A PG&E/SCE ZIP whose CCA/default provider or rates are not verified must remain unresolved rather than falling back to bundled service or a nearby service area.
