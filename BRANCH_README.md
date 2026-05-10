# Branch: expand-zipcodes

## What this branch does

Expands the ZIP-code coverage of PG&E and SCE territory from a small seed set to a
comprehensive California dataset, driven by CEC geospatial boundary data and Census ZCTA
geometries. It adds the full automation pipeline that takes raw geospatial data all the way
to validated runtime JSON.

### New scripts (all committed, all tested)

| Script | npm command | Purpose |
|---|---|---|
| `scripts/overlay-territory.js` | `territory:overlay` | Intersects CEC utility + CCA polygons with Census ZCTAs → 1,802 candidates |
| `scripts/auto-review-candidates.js` | `territory:auto-review` | Auto-assigns 1,656 candidates from geometry alone; queues the other 146 |
| `scripts/resolve-review-queue.js` | `territory:resolve-queue` | Resolves the 146 ambiguous queue entries using city-name lookup (`zipcodes` package) |
| `scripts/apply-review-queue.js` | `territory:apply-queue` | Writes finalized queue decisions back into `overlay-candidates.json` |
| `scripts/promote-territory-candidates.js` | `territory:promote` | Promotes reviewed candidates into `verified-zips.json` |
| `scripts/build-territory.js` | `territory:build` | Builds `src/data/pge/sceTerritory.json` from `verified-zips.json` |
| `scripts/validate-territory.js` | `territory:validate` | Validates the runtime JSON against all service area and rate-plan rules |

### City-name resolution rules

`resolve-review-queue.js` contains a hardcoded `CITY_CCA_RULES` map covering every CCA in
the supported service area registry. Rules were verified against CPUC filings and confirmed
against city-of-enrollment records for boundary cases (Carpinteria → 3CE, Calistoga → MCE).
Two resolution paths:

- **Path A** (21 entries): null action from multiple rate-backed CCAs → city name picks the
  correct one (e.g., all San José ZIPs → SJCE even when SVCE polygon covers more area)
- **Path B** (34 entries): geometry suggested bundled rate (`pge-only`/`sce-only`) → city
  name confirms the specific CCA when the two agree
- **Path C** (18 entries): no-coverage low-confidence → city name upgrades to assign when
  the city is unambiguously in a CCA

---

## Current state of the branch

All pipeline work is done and committed. The data files are in an **intermediate** state:

| File | State |
|---|---|
| `data-sources/territory/overlay-candidates.json` | All 1,802 candidates have `review` blocks filled |
| `data-sources/territory/review-queue.json` | All 146 entries resolved; all decisions applied |
| `data-sources/territory/verified-zips.json` | 855 PGE + 473 SCE + multi/exclude entries; **`bootstrapFromRuntime: true`** |
| `src/data/pgeTerritory.json` | **OLD data** — 679 ZIPs (not yet rebuilt) |
| `src/data/sceTerritory.json` | **OLD data** — 315 ZIPs (not yet rebuilt) |

The `bootstrapFromRuntime: true` flag in `verified-zips.json` is a safety gate. While it
is `true`, `territory:build` ignores the `pge`/`sce`/`multiUtility` sections of
`verified-zips.json` and rebuilds from the existing runtime files instead. This is why the
app still sees the old 679/315 ZIP counts even though the promotion ran successfully.

---

## Exact next steps (in order)

### Step 1 — Unlock the build

Edit `data-sources/territory/verified-zips.json`, line 2 (near the top):

```json
"bootstrapFromRuntime": false
```

This is the only manual edit required. It tells `territory:build` to use the promoted data.

### Step 2 — Rebuild the runtime JSON

```bash
npm run territory:build
```

Expected output:
```
Territory files generated successfully.
```

This rewrites `src/data/pgeTerritory.json`, `src/data/sceTerritory.json`, and
`src/data/multiUtilityZips.json` from the verified-zips data.

### Step 3 — Validate

```bash
npm run territory:validate
```

Expected output (counts will be higher than before):
```
Territory validation passed: X PG&E ZIPs, Y SCE ZIPs, Z multi-utility ZIPs, 17 service areas.
```

There should be no errors. Warnings about low ZIP counts on small service areas
(`sce-3ce-sb`, `pge-kccp-mon`, etc.) are expected and not blocking.

### Step 4 — Run the full test suite

```bash
npm run test:ci
```

Expected: all 279 tests pass.

### Step 5 — Commit

Stage and commit these files:

```bash
git add data-sources/territory/verified-zips.json \
        src/data/pgeTerritory.json \
        src/data/sceTerritory.json \
        src/data/multiUtilityZips.json \
        data-sources/territory/build-report.json
git commit -m "territory: unlock bootstrap gate and publish expanded ZIP coverage"
```

### Step 6 — Open PR to main

```bash
gh pr create --base main --title "Expand ZIP coverage: automated CEC/ZCTA pipeline"
```

---

## How to re-run the pipeline if sources change

The pipeline is fully reproducible. If CEC releases new LSE boundary data or the Census
updates ZCTA boundaries, re-run in order:

```bash
# 1. Regenerate candidates from updated geospatial sources
npm run territory:overlay

# 2. Auto-review: fills most entries from geometry alone
npm run territory:auto-review

# 3. City-name resolution: resolves ambiguous entries
npm run territory:resolve-queue

# 4. Review any remaining null-action entries in:
#    data-sources/territory/review-queue.json
#    (edit decision.action and decision.serviceAreaId for each)

# 5. Apply decisions back to overlay candidates
npm run territory:apply-queue

# 6. Promote to verified-zips
npm run territory:promote

# 7. Build + validate
npm run territory:build
npm run territory:validate
npm run test:ci
```

Typical outcomes from a fresh run against the current CEC data:
- ~1,656 auto-approved from geometry
- ~73 resolved by city-name lookup
- ~73 already-correct (high-confidence no-coverage or specific CCA)
- 0 remaining null-action entries requiring manual decisions

---

## Key data files (do not hand-edit)

| File | How it is written | Safe to commit? |
|---|---|---|
| `data-sources/territory/overlay-candidates.json` | `territory:overlay`, `territory:auto-review`, `territory:apply-queue` | Yes — source of truth for the review state |
| `data-sources/territory/review-queue.json` | `territory:auto-review`, `territory:resolve-queue` | Yes — documents the decisions made |
| `data-sources/territory/verified-zips.json` | `territory:promote` | Yes — the canonical verified ZIP registry |
| `src/data/pgeTerritory.json` | `territory:build` | Yes — generated artifact, safe to commit |
| `src/data/sceTerritory.json` | `territory:build` | Yes — generated artifact, safe to commit |
| `src/data/multiUtilityZips.json` | `territory:build` | Yes — generated artifact, safe to commit |
