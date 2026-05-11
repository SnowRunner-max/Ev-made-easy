#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PATHS, formatJson, readJson } from './territory-utils.js';

const TODAY = new Date().toISOString().slice(0, 10);

// ZIPs with utility coverage below this threshold and no dominant utility suggest no-coverage.
const LOW_COVERAGE_THRESHOLD = 0.20;

const BUNDLED = { 'PG&E': 'pge-only', SCE: 'sce-only' };

// Heuristic suggestion for a candidate whose suggestedAction === 'review'.
// Returns { action, serviceAreaId, multiUtilityCandidates, reason, confidence }.
// action may be null when no confident suggestion is available.
export function computeAutoSuggest(candidate) {
  const { dominantUtility, flags, ccaIntersections, pgeAreaPct, sceAreaPct } = candidate;
  const utilPct = Math.max(pgeAreaPct, sceAreaPct);
  const bundledId = dominantUtility ? BUNDLED[dominantUtility] : null;
  const backedCcas = (ccaIntersections ?? []).filter(c => c.rateBacked && c.serviceAreaId);
  const topCca = (ccaIntersections ?? [])[0] ?? null;

  if (!dominantUtility) {
    return {
      action: 'no-coverage',
      serviceAreaId: null,
      multiUtilityCandidates: null,
      reason: `Utility coverage ${Math.round(utilPct * 100)}% does not reach the 50% dominant threshold`,
      confidence: utilPct < LOW_COVERAGE_THRESHOLD ? 'high' : 'low',
    };
  }

  // Utility dominant, unsupported CCA only (no multi-CCA complication).
  if (flags.unsupported_cca_polygon && !flags.multiple_cca_overlap) {
    return {
      action: 'assign',
      serviceAreaId: bundledId,
      multiUtilityCandidates: null,
      reason: 'CCA polygon present but not rate-backed; using bundled utility service area',
      confidence: 'high',
    };
  }

  // Utility dominant, multiple CCAs overlap.
  if (flags.multiple_cca_overlap) {
    if (backedCcas.length === 0) {
      return {
        action: 'assign',
        serviceAreaId: bundledId,
        multiUtilityCandidates: null,
        reason: 'Multiple CCA polygons overlap, none rate-backed; using bundled utility service area',
        confidence: 'medium',
      };
    }
    if (backedCcas.length === 1) {
      return {
        action: 'assign',
        serviceAreaId: backedCcas[0].serviceAreaId,
        multiUtilityCandidates: null,
        reason: `Multiple CCA overlap; ${backedCcas[0].acronym} is the only rate-backed CCA (${Math.round((backedCcas[0].percentOfZcta ?? 0) * 100)}%)`,
        confidence: 'medium',
      };
    }
    return {
      action: null,
      serviceAreaId: null,
      multiUtilityCandidates: null,
      reason: `Multiple rate-backed CCAs overlap: ${backedCcas.map(c => c.acronym).join(', ')} — choose the dominant one or use multi-utility`,
      confidence: 'low',
    };
  }

  // Utility dominant, top CCA is rate-backed but below the 50% coverage threshold.
  // Conservative default: bundled utility rather than incorrectly CCA-classifying the majority of the ZCTA.
  if (topCca?.rateBacked) {
    return {
      action: 'assign',
      serviceAreaId: bundledId,
      multiUtilityCandidates: null,
      reason: `${topCca.acronym} covers only ${Math.round((topCca.percentOfZcta ?? 0) * 100)}% of ZCTA (below 50% threshold); using bundled utility as conservative default`,
      confidence: 'medium',
    };
  }

  return {
    action: null,
    serviceAreaId: null,
    multiUtilityCandidates: null,
    reason: 'No automated suggestion available',
    confidence: 'low',
  };
}

function buildAutoReview(candidate, reviewDate) {
  const { suggestedAction, suggestedServiceAreaId, suggestedMultiUtilityCandidates, suggestedReason } = candidate;

  if (suggestedAction === 'no-coverage') {
    return {
      status: 'no-coverage',
      serviceAreaId: null,
      multiUtilityCandidates: null,
      reason: suggestedReason,
      source: 'auto-review:no-coverage',
      reviewDate,
      stale: false,
    };
  }

  if (suggestedAction === 'exclude') {
    return {
      status: 'exclude',
      serviceAreaId: null,
      multiUtilityCandidates: null,
      reason: suggestedReason,
      source: 'auto-review:missing-cca-rates',
      reviewDate,
      stale: false,
    };
  }

  if (suggestedAction === 'multiUtility' && suggestedMultiUtilityCandidates) {
    return {
      status: 'multiUtility',
      serviceAreaId: null,
      multiUtilityCandidates: suggestedMultiUtilityCandidates,
      reason: suggestedReason,
      source: 'auto-review:split-utility',
      reviewDate,
      stale: false,
    };
  }

  if (suggestedAction === 'assign' && suggestedServiceAreaId) {
    return {
      status: 'assign',
      serviceAreaId: suggestedServiceAreaId,
      multiUtilityCandidates: null,
      reason: suggestedReason,
      source: 'auto-review:dominant-geometry',
      reviewDate,
      stale: false,
    };
  }

  return null;
}

function buildQueueEntry(zip, candidate) {
  const autoSuggest = computeAutoSuggest(candidate);
  return {
    zip,
    suggestedReason: candidate.suggestedReason,
    dominantUtility: candidate.dominantUtility,
    utilityPct: { pge: candidate.pgeAreaPct, sce: candidate.sceAreaPct },
    flags: Object.fromEntries(Object.entries(candidate.flags ?? {}).filter(([, v]) => v)),
    ccaIntersections: (candidate.ccaIntersections ?? []).map(c => ({
      acronym: c.acronym,
      percentOfZcta: c.percentOfZcta,
      rateBacked: c.rateBacked,
      serviceAreaId: c.serviceAreaId,
    })),
    autoSuggest,
    decision: {
      action: autoSuggest.action,
      serviceAreaId: autoSuggest.serviceAreaId,
      multiUtilityCandidates: autoSuggest.multiUtilityCandidates,
      reason: autoSuggest.reason,
    },
  };
}

export function autoReviewCandidates({ overlayCandidates, reviewDate = TODAY }) {
  const updatedCandidates = {
    ...overlayCandidates,
    candidates: { ...overlayCandidates.candidates },
  };
  const queue = [];
  const stats = {
    total: 0,
    autoApproved: 0,
    queued: 0,
    skipped: 0,
    byAction: { assign: 0, multiUtility: 0, exclude: 0, 'no-coverage': 0 },
  };

  for (const [zip, candidate] of Object.entries(overlayCandidates.candidates ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    stats.total += 1;
    const existing = candidate.review ?? {};

    if (existing.status && existing.status !== 'unreviewed' && !existing.stale) {
      stats.skipped += 1;
      continue;
    }

    if (candidate.suggestedAction === 'review') {
      queue.push(buildQueueEntry(zip, candidate));
      stats.queued += 1;
      continue;
    }

    const autoReview = buildAutoReview(candidate, reviewDate);
    if (autoReview) {
      updatedCandidates.candidates[zip] = { ...candidate, review: autoReview };
      stats.autoApproved += 1;
      const key = autoReview.status;
      stats.byAction[key] = (stats.byAction[key] ?? 0) + 1;
    } else {
      queue.push(buildQueueEntry(zip, candidate));
      stats.queued += 1;
    }
  }

  const reviewQueue = {
    note: "Fill in each 'decision' field. Valid actions: assign, multiUtility, exclude, no-coverage. Leave action null to skip. Run 'npm run territory:apply-queue' to write decisions back, then 'npm run territory:promote'.",
    generatedAt: new Date().toISOString(),
    count: queue.length,
    queue,
  };

  return { updatedCandidates, reviewQueue, stats };
}

export function autoReviewCandidatesFromFiles() {
  if (!fs.existsSync(PATHS.overlayCandidates)) {
    throw new Error('Missing overlay candidates. Run npm run territory:overlay first.');
  }

  const overlayCandidates = readJson(PATHS.overlayCandidates);
  const { updatedCandidates, reviewQueue, stats } = autoReviewCandidates({ overlayCandidates });

  fs.writeFileSync(PATHS.overlayCandidates, formatJson(updatedCandidates));
  fs.writeFileSync(PATHS.reviewQueue, formatJson(reviewQueue));

  const { assign, multiUtility, exclude } = stats.byAction;
  const nc = stats.byAction['no-coverage'];
  console.log(
    `Auto-approved ${stats.autoApproved} candidates (${assign} assign, ${multiUtility} multi-utility, ${nc} no-coverage, ${exclude} exclude).`
  );
  console.log(
    `Queued ${stats.queued} for human review → ${path.relative(PATHS.repoRoot, PATHS.reviewQueue)}`
  );
  if (stats.skipped > 0) {
    console.log(`Skipped ${stats.skipped} already-reviewed candidates.`);
  }

  return { updatedCandidates, reviewQueue, stats };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    autoReviewCandidatesFromFiles();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
