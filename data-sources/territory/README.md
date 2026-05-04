# Territory Source Research

Last reviewed: 2026-04-19

## Research conclusion

The best available public source for PG&E/SCE/CCA service-area geography is the California Energy Commission's Electric Load Serving Entities geospatial data. It answers the boundary question directly; it does not provide a ZIP-to-service-area table.

Pinned local snapshots:

| Snapshot | Source | Filter | Features | SHA-256 |
|---|---|---:|---:|---|
| `raw/cec-lse-iou-pou-pge-sce.geojson` | CEC Electric Load Serving Entities (IOU & POU) | `Acronym in ('PG&E','SCE')` | 2 | `3069e651b7ce2b63ea15d5641e276f6e41280153c7706f9805bfe6898536a79d` |
| `raw/cec-lse-other-cca.geojson` | CEC Electric Load Serving Entities (Other) | `Type='CCA'` | 25 | `c1cfc16a19b78f74d61fa4ea6f670c263cd07c77a7bf69ab20f7f910cbfcc8c7` |
| `raw/zcta-ca-2024.geojson` | Census TIGERweb ZCTA layer | CA ZIP prefixes + CA bbox | 1802 | `fa398174c901fe64650a1692a9792bc1102e065ebb6194a59f2947ea3eb25b7c` |

The source manifest records the exact ArcGIS REST query URLs, byte counts, feature counts, capture date, and source metadata.

## Source fit

### Primary utility territory source

CEC Electric Load Serving Entities (IOU & POU):

- Landing page: https://lab.data.ca.gov/dataset/electric-load-serving-entities-iou-pou
- ArcGIS layer: https://services3.arcgis.com/bWPjFyq029ChCGur/arcgis/rest/services/ElectricLoadServingEntities_IOU_POU/FeatureServer/0
- Relevant fields: `Acronym`, `Utility`, `Type`, `URL`
- Relevant features: `PG&E` and `SCE`

Use this to decide whether a ZIP intersects PG&E or SCE territory. The CEC page says boundaries are approximate and absolute territory questions should be confirmed with the load serving entity, so boundary ZIPs should remain conservative and flow through `multiUtilityZips.json` when overlap is material.

### Primary CCA territory source

CEC Electric Load Serving Entities (Other):

- Landing page: https://lab.data.ca.gov/dataset/electric-load-serving-entities-other
- ArcGIS layer: https://services3.arcgis.com/bWPjFyq029ChCGur/arcgis/rest/services/ElectricLoadServingEntities_Other/FeatureServer/0
- Relevant fields: `Acronym`, `Utility`, `Type`, `URL`
- Relevant filter: `Type='CCA'`

Use this to classify CCA service areas inside PG&E/SCE delivery territory. The CEC page attributes CCA information to CalCCA and warns that not all entities may be represented.

### Regulatory and utility cross-checks

- CPUC CCA Regulatory Information: https://www.cpuc.ca.gov/consumer-support/consumer-programs-and-services/electrical-energy-and-energy-efficiency/community-choice-aggregation-and-direct-access-/cca-regulatory-information
- CEC LSE list: https://www.energy.ca.gov/data-reports/energy-almanac/california-electricity-data/electric-load-serving-entities-lses
- PG&E CCA page: https://www.pge.com/en/account/alternate-energy-providers/community-choice-aggregation.html
- SCE CCA page: https://www.sce.com/customer-service-center/community-choice-aggregation

Use these only as roster and jurisdiction cross-checks. They are not a substitute for machine-readable boundary geometry.

## ZIP conversion policy

There is no authoritative public USPS ZIP boundary dataset in this repo. The committed overlay source is U.S. Census TIGERweb ZCTA geometry:

- Source: https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/7
- Caveat: ZCTAs are approximate area representations of USPS ZIP Code service areas.

For runtime ZIP mapping, derive candidates by overlaying ZCTA polygons against:

1. PG&E/SCE CEC utility polygons.
2. CEC CCA polygons.
3. Rate-backed service areas in `src/data/serviceAreas.json`.

Only write a ZIP directly to `pgeTerritory.json` or `sceTerritory.json` when one utility and one rate-backed service area clearly dominate. If a ZIP intersects both PG&E and SCE, or intersects multiple CCA areas in a way that could affect a residential customer, write it to `multiUtilityZips.json` or leave it unresolved until manually verified.

## Overlay candidate workflow

`npm run territory:overlay` consumes the pinned CEC snapshots plus the pinned ZCTA snapshot and emits `overlay-candidates.json`. This is a reviewed candidate file, not runtime JSON. It includes intersection area percentages and flags for:

- PG&E/SCE split ZIPs.
- Multiple CCA overlaps inside one utility territory.
- CCA polygons that do not have rate-backed service-area IDs yet.
- ZIPs covered by a utility polygon but excluded because the relevant CCA rates are missing.

The review lifecycle is:

1. Run `npm run territory:pin-zcta` only when intentionally refreshing the pinned Census snapshot.
2. Run `npm run territory:overlay` to refresh ZIP candidates.
3. Edit only each candidate's `review` block.
4. Run `npm run territory:promote` to copy reviewed `assign`, `multiUtility`, and `exclude` decisions into `verified-zips.json`.
5. Keep `bootstrapFromRuntime` enabled until reviewed ZIPs are sufficient and `npm run territory:build && npm run territory:check && npm run territory:validate` confirms generated runtime JSON matches reviewed outputs.
