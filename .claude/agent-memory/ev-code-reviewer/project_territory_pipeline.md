---
name: Territory Pipeline Architecture
description: Build-time territory pipeline added in expand-zipcodes branch — provenance rules for ZIP additions
type: project
---

The territory pipeline lives in `data-sources/territory/` and `scripts/`. It is build-time only — not in the app bundle. Key files: `verified-zips.json` (source of truth), `overlay-candidates.json`, `review-queue.json`, `manual-overrides.json`. Scripts: `promote-territory-candidates.js`, `apply-review-queue.js`.

**Rule:** Any new ZIP added to `src/data/multiUtilityZips.json`, `src/data/pgeTerritory.json`, or `src/data/sceTerritory.json` must have a traceable path through the pipeline — specifically, it must appear in `verified-zips.json` and have been promoted by one of the pipeline scripts, not edited by hand.

**Why:** `multiUtilityZips.json` drives the UtilityPicker UI. A wrong manual entry silently assigns the wrong utility and wrong rate plan to users.

**How to apply:** In future reviews, when a ZIP is added to any territory/routing JSON, ask for the pipeline audit trail before approving.

Added: `@turf/turf` is a devDependency (correct — build-time only, not in app bundle).
`cca_source/` is gitignored, creating a process gap: CCA-derived `ccaGeneration` rate values cannot be audited from version control. If `ccaGeneration` cells change in a future PR, require either committed source sheets or `_source` annotations in the JSON.
