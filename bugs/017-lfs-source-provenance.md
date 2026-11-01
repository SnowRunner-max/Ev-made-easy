# ACC-017 — Source catalog fingerprints LFS pointers instead of source documents

- Status: Fixed — source fingerprints reject LFS pointers and validate hydrated content size and hash.
- Priority: P2; undermines confidence in source validation.
- Locations: `scripts/catalog-sources.js:51–60`, `scripts/validate-sources.js:27–41`, `data-sources/source-catalog.json`.

## Reproduction and evidence
Historical pre-fix reproduction. Only the 12 verified catalog byte/hash pairs were corrected after comparison to hydrated bytes and tracked LFS object identities/sizes. `scripts/catalog-sources.test.js` and `validate-sources.test.js` cover hydrated, pointer, missing, same-size-corrupt, truncated and independent-size cases. Failed generation preserves the existing catalog. `npm run sources:validate` passes all 41 rate and 3 territory inputs; no source binary or runtime rate was changed.

Run `node scripts/validate-sources.js` in the hydrated checkout. It reports **12 hash mismatches** in `data-sources/cca_source/raw_sources/`.

Example: `2026-January-Rate-Sheet-2024-Vintage.pdf`.

- Catalog records **132 bytes**.
- The hydrated PDF is **1,412,986 bytes**.
- The Git `HEAD` blob is an LFS pointer.
- The catalog SHA256 exactly matches the **pointer text's SHA256**, not the hydrated document's hash.

`catalog-sources.js` hashes whichever bytes exist at the path, without detecting unhydrated LFS pointers. Some catalog entries describe actual documents and others describe pointer files, so checkout hydration changes validation semantics.

## Expected behavior

A document catalog must identify source-document content consistently. A passing check on pointer text does not establish that a PDF/workbook was downloaded or verified.

## Acceptance criteria

- Detect unhydrated LFS pointers and report an actionable hydration requirement, or explicitly use validated LFS object identities/sizes with a documented trust model.
- Regenerate affected catalog entries only after confirming the intended source bytes.
- Distinguish missing source, unhydrated pointer, genuine changed document, and corrupt content.
- Tests cover hydrated files, pointers, missing files, and content changes; never suppress all hash mismatches to make CI green.
- Verify byte counts as well as digest identity where appropriate.
- Do not alter rates based only on a hash mismatch. Do not mistake a content hash match for proof of tariff interpretation or current applicability.
- This issue is independent of ACC-001: fixing provenance does not fix the monetary formula.
