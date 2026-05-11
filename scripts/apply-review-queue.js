#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PATHS, formatJson, readJson } from './territory-utils.js';

const TODAY = new Date().toISOString().slice(0, 10);
const VALID_ACTIONS = new Set(['assign', 'multiUtility', 'exclude', 'no-coverage']);

export function applyReviewQueue({ overlayCandidates, reviewQueue, reviewDate = TODAY }) {
  const updatedCandidates = {
    ...overlayCandidates,
    candidates: { ...overlayCandidates.candidates },
  };
  const applied = [];
  const skipped = [];

  for (const entry of reviewQueue.queue ?? []) {
    const { zip, decision } = entry;

    if (!decision?.action || !VALID_ACTIONS.has(decision.action)) {
      skipped.push({ zip, reason: `decision.action is ${JSON.stringify(decision?.action ?? null)} — skipped` });
      continue;
    }

    const candidate = overlayCandidates.candidates?.[zip];
    if (!candidate) {
      skipped.push({ zip, reason: 'ZIP not found in overlay candidates' });
      continue;
    }

    updatedCandidates.candidates[zip] = {
      ...candidate,
      review: {
        status: decision.action,
        serviceAreaId: decision.serviceAreaId ?? null,
        multiUtilityCandidates: decision.multiUtilityCandidates ?? null,
        reason: decision.reason ?? null,
        source: 'manual-review',
        reviewDate,
        stale: false,
      },
    };
    applied.push({ zip, action: decision.action });
  }

  return {
    updatedCandidates,
    stats: { applied: applied.length, skipped: skipped.length },
    applied,
    skipped,
  };
}

export function applyReviewQueueFromFiles() {
  if (!fs.existsSync(PATHS.reviewQueue)) {
    throw new Error(
      `Missing review queue at ${path.relative(PATHS.repoRoot, PATHS.reviewQueue)}. Run npm run territory:auto-review first.`
    );
  }
  if (!fs.existsSync(PATHS.overlayCandidates)) {
    throw new Error('Missing overlay candidates. Run npm run territory:overlay first.');
  }

  const result = applyReviewQueue({
    overlayCandidates: readJson(PATHS.overlayCandidates),
    reviewQueue: readJson(PATHS.reviewQueue),
  });

  if (result.stats.applied > 0) {
    fs.writeFileSync(PATHS.overlayCandidates, formatJson(result.updatedCandidates));
    console.log(
      `Applied ${result.stats.applied} queue decisions to ${path.relative(PATHS.repoRoot, PATHS.overlayCandidates)}.`
    );
  } else {
    console.log('No decisions to apply (all actions were null or invalid).');
  }

  if (result.stats.skipped > 0) {
    console.log(`Skipped ${result.stats.skipped}:`);
    for (const { zip, reason } of result.skipped) {
      console.log(`  ${zip}: ${reason}`);
    }
  }

  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    applyReviewQueueFromFiles();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
