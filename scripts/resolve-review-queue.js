#!/usr/bin/env node
import { createRequire } from 'module';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PATHS, formatJson, readJson } from './territory-utils.js';

const require = createRequire(import.meta.url);
const zipcodes = require('zipcodes');

const TODAY = new Date().toISOString().slice(0, 10);

// City-name → CCA service area, sourced from CPUC/CCA service territory filings.
// Keys are lowercase city names as returned by the `zipcodes` package.
// confidence: 'high' = unambiguous filing; 'medium' = boundary case, spot-check recommended.
export const CITY_CCA_RULES = new Map([
  // ── SCE territory ──────────────────────────────────────────────────────────

  // CPA (Clean Power Alliance) — LA + Ventura County member cities.
  // LA City joined July 2021; most other member cities predate that.
  ['los angeles',          { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['west hollywood',       { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['beverly hills',        { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['harbor city',          { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['canoga park',          { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['west hills',           { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['compton',              { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['gardena',              { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['huntington park',      { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['lawndale',             { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['palos verdes peninsula', { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['south gate',           { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['inglewood',            { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['la habra',             { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['lakewood',             { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['long beach',           { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['pasadena',             { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['la crescenta',         { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['duarte',               { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['la canada flintridge', { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['monrovia',             { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['covina',               { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['south el monte',       { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['glendora',             { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['la puente',            { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['monterey park',        { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['diamond bar',          { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['rosemead',             { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['san dimas',            { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['san gabriel',          { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['west covina',          { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],
  ['port hueneme',         { serviceAreaId: 'sce-cpa-la', utility: 'SCE', confidence: 'high' }],

  // 3CE (Central Coast Community Energy) SCE sub-territory — Santa Barbara County coastal.
  // Incorporated Carpinteria: all eligible customers enrolled in 3CE by default (CPUC filing).
  // Unincorporated areas outside city limits vary by address — this rule covers the city ZIP only.
  ['carpinteria',          { serviceAreaId: 'sce-3ce-sb', utility: 'SCE', confidence: 'high' }],

  // ── PGE territory ──────────────────────────────────────────────────────────

  // CleanPowerSF — City and County of San Francisco only.
  ['san francisco',        { serviceAreaId: 'pge-cpsf-sf', utility: 'PGE', confidence: 'high' }],

  // Ava Community Energy (formerly EBCE) — Alameda County.
  ['berkeley',             { serviceAreaId: 'pge-ava-eba', utility: 'PGE', confidence: 'high' }],
  ['oakland',              { serviceAreaId: 'pge-ava-eba', utility: 'PGE', confidence: 'high' }],
  ['livermore',            { serviceAreaId: 'pge-ava-eba', utility: 'PGE', confidence: 'high' }],
  ['pleasanton',           { serviceAreaId: 'pge-ava-eba', utility: 'PGE', confidence: 'high' }],

  // SVCE (Silicon Valley Clean Energy) — Santa Clara County (excluding San José city).
  ['palo alto',            { serviceAreaId: 'pge-svce-sv', utility: 'PGE', confidence: 'high' }],
  ['santa clara',          { serviceAreaId: 'pge-svce-sv', utility: 'PGE', confidence: 'high' }],
  ['los gatos',            { serviceAreaId: 'pge-svce-sv', utility: 'PGE', confidence: 'high' }],

  // SJCE (San José Clean Energy) — City of San José only.
  // Coyote is an unincorporated community within San José city limits.
  ['san jose',             { serviceAreaId: 'pge-sjce-scc', utility: 'PGE', confidence: 'high' }],
  ['coyote',               { serviceAreaId: 'pge-sjce-scc', utility: 'PGE', confidence: 'high' }],

  // 3CE PGE sub-territory — San Benito County.
  ['hollister',            { serviceAreaId: 'pge-3ce-sbco', utility: 'PGE', confidence: 'high' }],

  // VCE (Valley Clean Energy) — Yolo County + Dixon (Solano County).
  ['davis',                { serviceAreaId: 'pge-vce-yol', utility: 'PGE', confidence: 'high' }],
  ['dixon',                { serviceAreaId: 'pge-vce-yol', utility: 'PGE', confidence: 'high' }],
  ['winters',              { serviceAreaId: 'pge-vce-yol', utility: 'PGE', confidence: 'high' }],

  // RCEA (Redwood Coast Energy Authority) — Humboldt County.
  ['whitethorn',           { serviceAreaId: 'pge-rcea-hum', utility: 'PGE', confidence: 'high' }],

  // SCP (Sonoma Clean Power) — Sonoma + Mendocino counties.
  ['petaluma',             { serviceAreaId: 'pge-scp-son', utility: 'PGE', confidence: 'high' }],

  // MCE (Marin Clean Energy) — Marin County + Contra Costa expansions.
  // Hercules is a confirmed MCE member city in Contra Costa County.
  ['hercules',             { serviceAreaId: 'pge-mce-mar', utility: 'PGE', confidence: 'high' }],
  // Calistoga is in Napa County; MCE serves incorporated Calistoga by default (CPUC filing).
  // Geometry is 50/50 SCP vs MCE due to Sonoma/Napa county boundary running through the ZCTA.
  // Unincorporated Napa County areas nearby also generally MCE, but address-specific.
  ['calistoga',            { serviceAreaId: 'pge-mce-mar', utility: 'PGE', confidence: 'high' }],

  // Pioneer Community Energy — Placer County.
  ['roseville',            { serviceAreaId: 'pge-pioneer-pla', utility: 'PGE', confidence: 'high' }],
]);

// Returns the CCA rule for the city containing zip, or null if not found.
export function resolveByCity(zip) {
  const info = zipcodes.lookup(zip);
  if (!info?.city) return null;
  return CITY_CCA_RULES.get(info.city.toLowerCase()) ?? null;
}

const BUNDLED_IDS = new Set(['pge-only', 'sce-only']);

// Resolves a single queue entry using city-name lookup.
// Returns the entry unchanged if no resolution applies.
export function resolveQueueEntry(entry) {
  const rule = resolveByCity(entry.zip);
  const { action, confidence } = entry.autoSuggest;
  const topCca = (entry.ccaIntersections ?? [])[0] ?? null;

  // Path A — null action: multiple rate-backed CCAs, geometry can't choose.
  // City-name lookup is decisive: a resident in city X is definitively in that CCA.
  if (!action) {
    if (!rule) return entry;
    return {
      ...entry,
      decision: {
        action: 'assign',
        serviceAreaId: rule.serviceAreaId,
        multiUtilityCandidates: null,
        reason: `City-name resolution: ${zipcodes.lookup(entry.zip)?.city} is in ${rule.serviceAreaId} territory (confidence: ${rule.confidence})`,
      },
      _cityResolution: { path: 'A', confidence: rule.confidence, serviceAreaId: rule.serviceAreaId },
    };
  }

  // Path B — bundled assign, medium confidence: geometry suggests the utility's bundled rate
  // because the top CCA polygon didn't reach the 50% area threshold.
  // Upgrade to the specific CCA if city lookup confirms the same CCA.
  if (action === 'assign' && confidence === 'medium' && BUNDLED_IDS.has(entry.decision.serviceAreaId)) {
    if (!rule || !topCca?.serviceAreaId) return entry;
    if (rule.serviceAreaId === topCca.serviceAreaId) {
      return {
        ...entry,
        decision: {
          ...entry.decision,
          serviceAreaId: rule.serviceAreaId,
          reason: `City-name confirms top CCA: ${zipcodes.lookup(entry.zip)?.city} is in ${rule.serviceAreaId} territory`,
        },
        _cityResolution: { path: 'B', confidence: rule.confidence, serviceAreaId: rule.serviceAreaId },
      };
    }
    return entry;
  }

  // Path C — no-coverage, low confidence: utility polygon 20–50% with no dominant utility.
  // City lookup resolves these when the city has a definitive high-confidence CCA rule.
  if (action === 'no-coverage' && confidence === 'low') {
    if (!rule || rule.confidence !== 'high') return entry;
    return {
      ...entry,
      decision: {
        action: 'assign',
        serviceAreaId: rule.serviceAreaId,
        multiUtilityCandidates: null,
        reason: `City-name resolution overrides no-coverage: ${zipcodes.lookup(entry.zip)?.city} is in ${rule.serviceAreaId} territory`,
      },
      _cityResolution: { path: 'C', confidence: rule.confidence, serviceAreaId: rule.serviceAreaId },
    };
  }

  return entry;
}

export function resolveReviewQueue({ reviewQueue }) {
  const resolved = [];
  const unchanged = [];
  const stats = {
    total: reviewQueue.queue?.length ?? 0,
    resolved: 0,
    unchanged: 0,
    byPath: { A: 0, B: 0, C: 0 },
    byServiceArea: {},
    mediumConfidence: [],
    remainingNullAction: [],
  };

  for (const entry of reviewQueue.queue ?? []) {
    const updated = resolveQueueEntry(entry);
    if (updated._cityResolution) {
      const res = updated._cityResolution;
      stats.resolved += 1;
      stats.byPath[res.path] = (stats.byPath[res.path] ?? 0) + 1;
      stats.byServiceArea[res.serviceAreaId] = (stats.byServiceArea[res.serviceAreaId] ?? 0) + 1;
      if (res.confidence === 'medium') stats.mediumConfidence.push({ zip: entry.zip, serviceAreaId: res.serviceAreaId });
      resolved.push(updated);
    } else {
      stats.unchanged += 1;
      if (!entry.autoSuggest.action) stats.remainingNullAction.push(entry.zip);
      unchanged.push(updated);
    }
  }

  const updatedQueue = {
    ...reviewQueue,
    resolvedAt: new Date().toISOString(),
    queue: [...resolved, ...unchanged].sort((a, b) => a.zip.localeCompare(b.zip)),
  };

  return { updatedQueue, stats };
}

export function resolveReviewQueueFromFiles() {
  if (!fs.existsSync(PATHS.reviewQueue)) {
    throw new Error(
      `Missing review queue at ${path.relative(PATHS.repoRoot, PATHS.reviewQueue)}. Run npm run territory:auto-review first.`
    );
  }

  const reviewQueue = readJson(PATHS.reviewQueue);
  const { updatedQueue, stats } = resolveReviewQueue({ reviewQueue });

  fs.writeFileSync(PATHS.reviewQueue, formatJson(updatedQueue));

  console.log(`Resolved ${stats.resolved}/${stats.total} queue entries via city-name lookup.`);
  console.log(`  Path A (null action → assign): ${stats.byPath.A}`);
  console.log(`  Path B (bundled → CCA upgrade): ${stats.byPath.B}`);
  console.log(`  Path C (no-coverage → assign):  ${stats.byPath.C}`);

  if (stats.mediumConfidence.length > 0) {
    console.log(`\nMedium-confidence decisions (spot-check recommended):`);
    for (const { zip, serviceAreaId } of stats.mediumConfidence) {
      const city = zipcodes.lookup(zip)?.city ?? '?';
      console.log(`  ${zip} ${city} → ${serviceAreaId}`);
    }
  }

  if (stats.remainingNullAction.length > 0) {
    console.log(`\nRemaining null-action entries (${stats.remainingNullAction.length}) — need manual decision:`);
    for (const zip of stats.remainingNullAction) {
      const city = zipcodes.lookup(zip)?.city ?? '?';
      const entry = reviewQueue.queue.find(e => e.zip === zip);
      const ccas = (entry?.ccaIntersections ?? []).map(c => `${c.acronym}(${Math.round(c.percentOfZcta * 100)}%)`).join(', ');
      console.log(`  ${zip} ${city}: ${ccas}`);
    }
  }

  if (stats.unchanged > 0) {
    console.log(`\nUnchanged: ${stats.unchanged} entries (high-confidence or no city rule).`);
  }

  return { updatedQueue, stats };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    resolveReviewQueueFromFiles();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
