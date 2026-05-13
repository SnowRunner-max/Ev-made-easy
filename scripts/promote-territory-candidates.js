#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PATHS, formatJson, readJson, sortObjectByKey } from './territory-utils.js';
import { UTILITY_CONFIG } from './utility-config.js';

const PROMOTABLE_STATUSES = new Set(['assign', 'multiUtility', 'exclude']);

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(sortObjectByKey(value))).digest('hex');
}

function configuredUtilityIds(utilityConfig) {
  return Object.keys(utilityConfig);
}

function getServiceAreaUtility(utilityConfig, serviceArea) {
  if (!serviceArea) return null;
  return utilityConfig[serviceArea.utilityId]
    ?? Object.values(utilityConfig).find(utility => utility.label === serviceArea.utility)
    ?? null;
}

function cloneVerifiedZips(verifiedZips, utilityConfig = UTILITY_CONFIG) {
  return {
    ...verifiedZips,
    ...Object.fromEntries(
      configuredUtilityIds(utilityConfig).map(utilityId => {
        const key = utilityConfig[utilityId].verifiedKey;
        return [key, { ...(verifiedZips[key] ?? {}), zips: { ...(verifiedZips[key]?.zips ?? {}) } }];
      })
    ),
    multiUtility: {
      ...(verifiedZips.multiUtility ?? {}),
      zips: { ...(verifiedZips.multiUtility?.zips ?? {}) },
    },
    excluded: {
      ...(verifiedZips.excluded ?? {}),
      zips: { ...(verifiedZips.excluded?.zips ?? {}) },
    },
  };
}

function removeZipEverywhere(verifiedZips, zip, utilityConfig = UTILITY_CONFIG) {
  for (const utilityId of configuredUtilityIds(utilityConfig)) {
    delete verifiedZips[utilityConfig[utilityId].verifiedKey].zips[zip];
  }
  delete verifiedZips.multiUtility.zips[zip];
  delete verifiedZips.excluded.zips[zip];
}

function skip(skipped, zip, reason) {
  skipped.push({ zip, reason });
}

function isCandidateSourceCurrent(candidate, overlayCandidates) {
  return stableHash(candidate.sourceHashes ?? {}) === stableHash(overlayCandidates.sourceHashes ?? {});
}

function validateServiceArea(serviceAreaMap, serviceAreaId) {
  return serviceAreaMap[serviceAreaId] ?? null;
}

export function promoteReviewedCandidates({ overlayCandidates, verifiedZips, serviceAreas, utilityConfig = UTILITY_CONFIG }) {
  const nextVerified = cloneVerifiedZips(verifiedZips, utilityConfig);
  const serviceAreaMap = serviceAreas.serviceAreas ?? serviceAreas;
  const promoted = [];
  const skipped = [];

  for (const [zip, candidate] of Object.entries(overlayCandidates.candidates ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    const review = candidate.review ?? {};
    const status = review.status ?? 'unreviewed';

    if (!PROMOTABLE_STATUSES.has(status)) {
      skip(skipped, zip, `review status ${status} is not promotable`);
      continue;
    }

    if (review.stale) {
      skip(skipped, zip, 'review is stale');
      continue;
    }

    if (!isCandidateSourceCurrent(candidate, overlayCandidates)) {
      skip(skipped, zip, 'candidate source hashes do not match overlay source hashes');
      continue;
    }

    if (status === 'assign') {
      const serviceAreaId = review.serviceAreaId;
      const serviceArea = validateServiceArea(serviceAreaMap, serviceAreaId);
      if (!serviceArea) {
        skip(skipped, zip, `assign review references unknown serviceAreaId ${serviceAreaId}`);
        continue;
      }

      removeZipEverywhere(nextVerified, zip, utilityConfig);
      const utility = getServiceAreaUtility(utilityConfig, serviceArea);
      if (!utility) {
        skip(skipped, zip, `assign review uses unsupported utility ${serviceArea.utility}`);
        continue;
      }
      nextVerified[utility.verifiedKey].zips[zip] = serviceAreaId;

      promoted.push({ zip, status, serviceAreaId });
      continue;
    }

    if (status === 'multiUtility') {
      const candidates = [...(review.multiUtilityCandidates ?? [])].sort();
      if (candidates.length < 2) {
        skip(skipped, zip, 'multiUtility review must include at least two candidates');
        continue;
      }

      const missing = candidates.filter(serviceAreaId => !validateServiceArea(serviceAreaMap, serviceAreaId));
      if (missing.length > 0) {
        skip(skipped, zip, `multiUtility review references unknown serviceAreaId(s): ${missing.join(', ')}`);
        continue;
      }

      removeZipEverywhere(nextVerified, zip, utilityConfig);
      nextVerified.multiUtility.zips[zip] = candidates;
      promoted.push({ zip, status, candidates });
      continue;
    }

    if (status === 'exclude') {
      if (!review.reason || !review.source) {
        skip(skipped, zip, 'exclude review must include reason and source');
        continue;
      }

      removeZipEverywhere(nextVerified, zip, utilityConfig);
      nextVerified.excluded.zips[zip] = {
        reason: review.reason,
        source: review.source,
        reviewDate: review.reviewDate,
      };
      promoted.push({ zip, status });
    }
  }

  return {
    verifiedZips: nextVerified,
    stats: {
      promotedCount: promoted.length,
      skippedCount: skipped.length,
      assignCount: promoted.filter(item => item.status === 'assign').length,
      multiUtilityCount: promoted.filter(item => item.status === 'multiUtility').length,
      excludeCount: promoted.filter(item => item.status === 'exclude').length,
    },
    promoted,
    skipped,
  };
}

export function promoteReviewedCandidatesFromFiles() {
  if (!fs.existsSync(PATHS.overlayCandidates)) {
    throw new Error(`Missing ${path.relative(PATHS.repoRoot, PATHS.overlayCandidates)}. Run npm run territory:overlay first.`);
  }

  const result = promoteReviewedCandidates({
    overlayCandidates: readJson(PATHS.overlayCandidates),
    verifiedZips: readJson(PATHS.verifiedZips),
    serviceAreas: readJson(PATHS.serviceAreas),
  });

  if (result.stats.promotedCount > 0) {
    fs.writeFileSync(PATHS.verifiedZips, formatJson(result.verifiedZips));
  }

  console.log(
    `Promoted ${result.stats.promotedCount} reviewed ZIP candidates to ${path.relative(PATHS.repoRoot, PATHS.verifiedZips)} (${result.stats.assignCount} assign, ${result.stats.multiUtilityCount} multi-utility, ${result.stats.excludeCount} exclude).`
  );
  if (result.stats.promotedCount === 0) {
    console.log('No reviewed candidates were promotable, so verified-zips.json was not rewritten.');
  }

  if (result.stats.skippedCount > 0) {
    console.log(`Skipped ${result.stats.skippedCount} non-promotable candidates.`);
  }

  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    promoteReviewedCandidatesFromFiles();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
