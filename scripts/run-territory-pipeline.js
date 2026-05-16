#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { PATHS } from './territory-utils.js';
import { pinZctaSnapshot } from './pin-zcta.js';
import { validateSources } from './validate-sources.js';
import { writeOverlayCandidates } from './overlay-territory.js';
import { autoReviewCandidatesFromFiles } from './auto-review-candidates.js';
import { resolveReviewQueueFromFiles } from './resolve-review-queue.js';
import { applyReviewQueueFromFiles } from './apply-review-queue.js';
import { promoteReviewedCandidatesFromFiles } from './promote-territory-candidates.js';
import { buildTerritoryFromFiles } from './build-territory.js';
import { validateTerritoryFromFiles } from './validate-territory.js';
import { UTILITY_CONFIG, UTILITY_IDS } from './utility-config.js';

function banner(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}`);
}

function parseArgs(argv) {
  const utility = (argv.find(a => a.startsWith('--utility=')) ?? '--utility=all').slice('--utility='.length);
  return {
    refreshSources: argv.includes('--refresh-sources'),
    strict: argv.includes('--strict'),
    check: argv.includes('--check'),
    skipBuild: argv.includes('--skip-build'),
    utility,
  };
}

export async function runTerritoryPipeline({
  refreshSources = false,
  strict = false,
  check = false,
  skipBuild = false,
  utility = 'all',
} = {}) {
  // Step 1 (optional): Pin ZCTA snapshot
  if (refreshSources) {
    banner('Step 1: Pin ZCTA Snapshot');
    await pinZctaSnapshot();
  }

  // Step 2: Validate sources
  banner('Step 2: Validate Sources');
  const sourcesResult = validateSources();
  if (!sourcesResult.ok) {
    for (const error of sourcesResult.errors) {
      console.error(`- ${error}`);
    }
    throw new Error('Source validation failed.');
  }
  console.log(
    `Sources OK: ${sourcesResult.stats.rateFileCount} rate files, ${sourcesResult.stats.territoryFileCount} territory files.`
  );

  // Step 3: Generate overlay candidates
  banner('Step 3: Generate Overlay Candidates');
  writeOverlayCandidates();

  // Step 4: Auto-review candidates
  banner('Step 4: Auto-Review Candidates');
  autoReviewCandidatesFromFiles();

  // Step 5: City-name resolution
  banner('Step 5: Resolve Review Queue');
  const { stats: resolveStats } = resolveReviewQueueFromFiles();
  const nullActionZips = resolveStats.remainingNullAction ?? [];

  // Step 6: Check remaining null-action entries
  banner('Step 6: Check Review Queue');
  if (nullActionZips.length > 0) {
    if (strict) {
      console.error(`${nullActionZips.length} review-queue entries remain with null action:`);
      for (const zip of nullActionZips) {
        console.error(`  ${zip}`);
      }
      throw new Error(`--strict: ${nullActionZips.length} unresolved review-queue entries.`);
    }
    console.warn(`Warning: ${nullActionZips.length} review-queue entries remain with null action (continuing without --strict):`);
    for (const zip of nullActionZips) {
      console.warn(`  ${zip}`);
    }
  } else {
    console.log('All review-queue entries resolved.');
  }

  // Step 7: Apply review queue decisions to candidates
  banner('Step 7: Apply Review Queue');
  applyReviewQueueFromFiles();

  // Step 8: Promote reviewed candidates to verified-zips.json
  banner('Step 8: Promote Reviewed Candidates');
  promoteReviewedCandidatesFromFiles();

  if (skipBuild) {
    console.log('\nStopping after promote (--skip-build).');
    return { ok: true, skippedBuild: true, nullActionZips };
  }

  // Step 9: Build runtime territory JSON
  banner('Step 9: Build Territory');
  const buildResult = buildTerritoryFromFiles({ check });
  if (check) {
    if (!buildResult.ok) {
      console.error('Generated territory output differs from checked-in files:');
      for (const filePath of buildResult.driftedPaths) {
        console.error(`- ${filePath}`);
      }
      console.error(`Run npm run territory:build and commit the regenerated JSON.`);
      throw new Error('Territory check failed: runtime JSON differs from committed files.');
    }
    console.log('Territory generated output matches checked-in runtime JSON.');
  } else if (buildResult.bootstrapped) {
    console.log('Territory build report generated (bootstrapped from runtime artifacts; runtime JSON not rewritten).');
  } else {
    console.log('Territory files generated successfully.');
  }

  // Step 10: Validate territory
  banner('Step 10: Validate Territory');
  const validationResult = validateTerritoryFromFiles();
  for (const warning of validationResult.warnings) {
    console.warn(`Warning: ${warning.message}`);
  }
  if (!validationResult.ok) {
    for (const error of validationResult.errors) {
      console.error(`- ${error.message}`);
    }
    throw new Error('Territory validation failed.');
  }

  // Step 11: Summary
  const { stats } = validationResult;
  console.log('\n══════════════ Territory Pipeline Summary ══════════════');
  for (const utilityId of UTILITY_IDS) {
    if (utility !== utilityId && utility !== 'all') continue;
    const config = UTILITY_CONFIG[utilityId];
    console.log(`  ${config.label} ZIPs:       ${stats[config.statsKey] ?? 0}`);
  }
  console.log(`  Multi-utility:   ${stats.multiUtilityZipCount}`);
  console.log(`  Service areas:   ${stats.serviceAreaCount}`);
  if (nullActionZips.length > 0) {
    console.log(`  Unresolved queue entries (${nullActionZips.length}):`);
    for (const zip of nullActionZips) {
      console.log(`    ${zip}`);
    }
  }
  if (validationResult.warnings.length > 0) {
    console.log(`  Warnings:        ${validationResult.warnings.length}`);
  }
  console.log('═══════════════════════════════════════════════════════');

  return { ok: true, skippedBuild: false, stats, nullActionZips };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  runTerritoryPipeline(args).catch(error => {
    console.error(`\nPipeline failed: ${error.message}`);
    process.exit(1);
  });
}
