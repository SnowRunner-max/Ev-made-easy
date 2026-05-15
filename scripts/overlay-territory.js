#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  area,
  bbox,
  featureCollection,
  flattenEach,
  intersect,
} from '@turf/turf';
import {
  PATHS,
  fileSha256,
  formatJson,
  loadRateRegistryIds,
  readJson,
  sortObjectByKey,
} from './territory-utils.js';
import { UTILITY_CONFIG, UTILITY_IDS, getUtilityByLabel } from './utility-config.js';

export const THRESHOLDS = {
  utilDominant: 0.50,
  multiUtil: 0.05,
  ccaDominant: 0.50,
  multiCCA: 0.20,
  ccaNoiseFloor: 0.01,
};

const DEFAULT_REVIEW = {
  status: 'unreviewed',
  serviceAreaId: null,
  multiUtilityCandidates: null,
  reason: null,
  source: null,
  reviewDate: null,
  stale: false,
};

function round(value, decimals = 4) {
  return Number(value.toFixed(decimals));
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(sortObjectByKey(value))).digest('hex');
}

function getZcta(feature) {
  return String(feature?.properties?.ZCTA5CE20 ?? feature?.properties?.GEOID20 ?? '').padStart(5, '0');
}

function bboxesOverlap(a, b) {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

function intersectTwo(a, b) {
  return intersect(featureCollection([a, b]));
}

function flattenIndexedFeatures(features, parentFactory) {
  const indexed = [];
  for (const feature of features) {
    flattenEach(feature, flatFeature => {
      indexed.push({
        feature: flatFeature,
        bbox: bbox(flatFeature),
        parent: parentFactory(feature),
      });
    });
  }
  return indexed;
}

function sumIntersectionArea(baseFeature, baseBbox, indexedPolygons) {
  let total = 0;
  for (const indexed of indexedPolygons) {
    if (!bboxesOverlap(baseBbox, indexed.bbox)) continue;
    const clipped = intersectTwo(baseFeature, indexed.feature);
    if (clipped) {
      total += area(clipped);
    }
  }
  return total;
}

function sumCcaIntersectionAreas(baseFeature, baseBbox, indexedCcaPolygons) {
  const byAcronym = new Map();

  for (const indexed of indexedCcaPolygons) {
    if (!bboxesOverlap(baseBbox, indexed.bbox)) continue;
    const clipped = intersectTwo(baseFeature, indexed.feature);
    if (!clipped) continue;

    const existing = byAcronym.get(indexed.parent.acronym) ?? {
      ...indexed.parent,
      areaSqM: 0,
    };
    existing.areaSqM += area(clipped);
    byAcronym.set(indexed.parent.acronym, existing);
  }

  return [...byAcronym.values()];
}

function utilityKey(utility) {
  return getUtilityByLabel(utility)?.id ?? null;
}

function getDominantUtility(utilityIntersections) {
  const best = utilityIntersections.reduce(
    (currentBest, intersection) => (
      intersection.percentRaw > currentBest.percentRaw ? intersection : currentBest
    ),
    { percentRaw: -1, utility: null }
  );
  return best.percentRaw >= THRESHOLDS.utilDominant ? best.utility : null;
}

function resolveCcaBacking({ acronym, dominantUtility, ccaServiceAreaMap }) {
  const supported = ccaServiceAreaMap.supported?.[acronym] ?? null;
  const unbacked = ccaServiceAreaMap.unbacked?.[acronym] ?? null;
  const serviceAreaIds = supported?.serviceAreaIds ?? {};
  const dominantKey = dominantUtility ? utilityKey(dominantUtility) : null;
  const serviceAreaId = dominantKey ? serviceAreaIds[dominantKey] ?? null : null;

  if (serviceAreaId) {
    return {
      ccaId: supported.ccaId,
      serviceAreaId,
      serviceAreaIds,
      rateBacked: true,
      backingStatus: 'rate_backed',
      backingReason: null,
    };
  }

  if (supported) {
    return {
      ccaId: supported.ccaId,
      serviceAreaId: null,
      serviceAreaIds,
      rateBacked: false,
      backingStatus: 'mapped_other_utility',
      backingReason: 'CCA is mapped, but not for the dominant utility territory.',
    };
  }

  return {
    ccaId: null,
    serviceAreaId: null,
    serviceAreaIds: {},
    rateBacked: false,
    backingStatus: unbacked ? 'unbacked' : 'unknown',
    backingReason: unbacked?.reason ?? 'CEC CCA acronym is not mapped to a rate-backed service area.',
  };
}

function buildCcaIntersections({ rawCcaAreas, zctaAreaSqM, dominantUtility, ccaServiceAreaMap }) {
  return rawCcaAreas
    .map(raw => {
      const percentOfZcta = Math.min(1, raw.areaSqM / zctaAreaSqM);
      const backing = resolveCcaBacking({
        acronym: raw.acronym,
        dominantUtility,
        ccaServiceAreaMap,
      });

      return {
        acronym: raw.acronym,
        name: raw.name,
        areaSqKm: round(raw.areaSqM / 1_000_000),
        percentOfZcta: round(percentOfZcta),
        isDominant: percentOfZcta >= THRESHOLDS.ccaDominant,
        ccaId: backing.ccaId,
        serviceAreaId: backing.serviceAreaId,
        serviceAreaIds: backing.serviceAreaIds,
        rateBacked: backing.rateBacked,
        backingStatus: backing.backingStatus,
        backingReason: backing.backingReason,
      };
    })
    .filter(intersection => intersection.percentOfZcta >= THRESHOLDS.ccaNoiseFloor)
    .sort((a, b) => b.percentOfZcta - a.percentOfZcta || a.acronym.localeCompare(b.acronym));
}

function getSuggestedServiceAreaForUtility(utility, ccaIntersections) {
  const key = utilityKey(utility);
  const dominantCca = ccaIntersections.find(
    cca => cca.serviceAreaIds?.[key] && cca.percentOfZcta >= THRESHOLDS.ccaDominant
  );
  return dominantCca?.serviceAreaIds[key] ?? UTILITY_CONFIG[key]?.directServiceAreaId;
}

function buildSuggestedResolution({ utilityIntersections, dominantUtility, flags, ccaIntersections }) {
  const utilityPresent = utilityIntersections.some(intersection => intersection.percentRaw >= THRESHOLDS.multiUtil);
  const topCca = ccaIntersections[0] ?? null;
  const utilityList = utilityIntersections.map(intersection => intersection.utility).join(' or ');

  if (!utilityPresent) {
    return {
      action: 'no-coverage',
      serviceAreaId: null,
      multiUtilityCandidates: null,
      reason: `No ${utilityList} utility polygon materially intersects this ZCTA.`,
    };
  }

  if (flags.split_utility_zip) {
    const multiUtilityCandidates = utilityIntersections
      .filter(intersection => intersection.percentRaw >= THRESHOLDS.multiUtil)
      .map(intersection => getSuggestedServiceAreaForUtility(intersection.utility, ccaIntersections))
      .filter(Boolean);

    return {
      action: 'multiUtility',
      serviceAreaId: null,
      multiUtilityCandidates: [...new Set(multiUtilityCandidates)].sort(),
      reason: 'Multiple supported utilities materially intersect this ZCTA.',
    };
  }

  if (!dominantUtility) {
    return {
      action: 'review',
      serviceAreaId: null,
      multiUtilityCandidates: null,
      reason: 'No utility reaches the dominant-area threshold.',
    };
  }

  if (!topCca) {
    return {
      action: 'assign',
      serviceAreaId: UTILITY_CONFIG[utilityKey(dominantUtility)]?.directServiceAreaId,
      multiUtilityCandidates: null,
      reason: 'Dominant utility territory has no material CCA polygon intersection.',
    };
  }

  if (flags.multiple_cca_overlap) {
    return {
      action: 'review',
      serviceAreaId: null,
      multiUtilityCandidates: null,
      reason: 'Multiple CCA polygons materially overlap inside the dominant utility territory.',
    };
  }

  if (topCca.percentOfZcta >= THRESHOLDS.ccaDominant && topCca.rateBacked) {
    return {
      action: 'assign',
      serviceAreaId: topCca.serviceAreaId,
      multiUtilityCandidates: null,
      reason: 'Dominant CCA polygon is mapped to a rate-backed service area.',
    };
  }

  if (topCca.percentOfZcta >= THRESHOLDS.ccaDominant && !topCca.rateBacked) {
    return {
      action: 'exclude',
      serviceAreaId: null,
      multiUtilityCandidates: null,
      reason: topCca.backingReason,
    };
  }

  return {
    action: 'review',
    serviceAreaId: null,
    multiUtilityCandidates: null,
    reason: 'Top CCA polygon does not reach the dominant-area threshold.',
  };
}

function buildReview({ existingCandidate, geometrySignature, sourceHashes }) {
  const existingReview = existingCandidate?.review ?? null;
  const existingStatus = existingReview?.status ?? 'unreviewed';
  const sourceHashesMatch = stableHash(existingCandidate?.sourceHashes ?? {}) === stableHash(sourceHashes);
  const signatureMatches = existingCandidate?.geometrySignature === geometrySignature;

  if (existingReview && sourceHashesMatch && signatureMatches) {
    return {
      ...DEFAULT_REVIEW,
      ...existingReview,
      stale: false,
    };
  }

  if (existingReview && existingStatus !== 'unreviewed') {
    return {
      ...DEFAULT_REVIEW,
      ...existingReview,
      stale: true,
    };
  }

  return { ...DEFAULT_REVIEW };
}

function buildCandidate({
  zctaFeature,
  utilityPolygonsById,
  ccaPolygons,
  ccaServiceAreaMap,
  sourceHashes,
  existingCandidate,
}) {
  const zcta = getZcta(zctaFeature);
  const zctaBbox = bbox(zctaFeature);
  const zctaAreaSqM = area(zctaFeature);
  const utilityIntersections = UTILITY_IDS.map(utilityId => {
    const utility = UTILITY_CONFIG[utilityId];
    const areaSqM = sumIntersectionArea(zctaFeature, zctaBbox, utilityPolygonsById[utilityId] ?? []);
    const percentRaw = Math.min(1, areaSqM / zctaAreaSqM);
    return {
      utility: utility.label,
      areaSqKm: round(areaSqM / 1_000_000),
      percentOfZcta: round(percentRaw),
      percentRaw,
      isMaterial: percentRaw >= THRESHOLDS.multiUtil,
      isDominant: false,
    };
  });
  const dominantUtility = getDominantUtility(utilityIntersections);
  for (const intersection of utilityIntersections) {
    intersection.isDominant = intersection.utility === dominantUtility;
  }

  const rawCcaAreas = sumCcaIntersectionAreas(zctaFeature, zctaBbox, ccaPolygons);
  const ccaIntersections = buildCcaIntersections({
    rawCcaAreas,
    zctaAreaSqM,
    dominantUtility,
    ccaServiceAreaMap,
  });

  const flags = {
    split_utility_zip: utilityIntersections.filter(intersection => intersection.percentRaw >= THRESHOLDS.multiUtil).length > 1,
    multiple_cca_overlap: ccaIntersections.filter(cca => cca.percentOfZcta >= THRESHOLDS.multiCCA).length > 1,
    unsupported_cca_polygon: ccaIntersections.some(cca => !cca.rateBacked),
    excluded_missing_cca_rates: false,
  };
  const topCca = ccaIntersections[0] ?? null;
  flags.excluded_missing_cca_rates = Boolean(
    dominantUtility &&
      topCca &&
      topCca.percentOfZcta >= THRESHOLDS.ccaDominant &&
      !topCca.rateBacked
  );

  const suggestedResolution = buildSuggestedResolution({
    utilityIntersections,
    dominantUtility,
    flags,
    ccaIntersections,
  });

  const geometrySignature = stableHash({
    zctaAreaSqKm: round(zctaAreaSqM / 1_000_000),
    utilityIntersections,
    ccaIntersections,
    suggestedResolution,
  });
  const utilityAreaPct = Object.fromEntries(
    UTILITY_IDS.map(utilityId => {
      const utility = UTILITY_CONFIG[utilityId];
      return [
        utilityId,
        utilityIntersections.find(intersection => intersection.utility === utility.label)?.percentOfZcta ?? 0,
      ];
    })
  );

  return {
    zcta,
    zctaAreaSqKm: round(zctaAreaSqM / 1_000_000),
    sourceHashes,
    geometrySignature,
    utilityAreaPct,
    dominantUtility,
    utilityIntersections: utilityIntersections.map(({ percentRaw, ...intersection }) => intersection),
    ccaIntersections,
    flags,
    suggestedAction: suggestedResolution.action,
    suggestedServiceAreaId: suggestedResolution.serviceAreaId,
    suggestedMultiUtilityCandidates: suggestedResolution.multiUtilityCandidates,
    suggestedReason: suggestedResolution.reason,
    review: buildReview({ existingCandidate, geometrySignature, sourceHashes }),
  };
}

function getStats(candidates) {
  const stats = {
    zctaCount: candidates.length,
    suggestedAssignCount: 0,
    suggestedMultiUtilityCount: 0,
    suggestedReviewCount: 0,
    suggestedExcludeCount: 0,
    noCoverageCount: 0,
    staleReviewCount: 0,
    preservedReviewCount: 0,
  };

  for (const candidate of candidates) {
    if (candidate.suggestedAction === 'assign') stats.suggestedAssignCount += 1;
    if (candidate.suggestedAction === 'multiUtility') stats.suggestedMultiUtilityCount += 1;
    if (candidate.suggestedAction === 'review') stats.suggestedReviewCount += 1;
    if (candidate.suggestedAction === 'exclude') stats.suggestedExcludeCount += 1;
    if (candidate.suggestedAction === 'no-coverage') stats.noCoverageCount += 1;
    if (candidate.review?.stale) stats.staleReviewCount += 1;
    if (candidate.review?.status !== 'unreviewed' && !candidate.review?.stale) stats.preservedReviewCount += 1;
  }

  return stats;
}

function validateCcaMap({ ccaFeatures = null, ccaGeojson = null, ccaServiceAreaMap, serviceAreas, rateRegistryIds }) {
  const warnings = [];
  const errors = [];
  const supported = ccaServiceAreaMap.supported ?? {};
  const unbacked = ccaServiceAreaMap.unbacked ?? {};
  const serviceAreaMap = serviceAreas.serviceAreas ?? serviceAreas;
  const features = ccaFeatures ?? ccaGeojson?.features ?? [];

  for (const feature of features) {
    const acronym = feature.properties?.Acronym;
    if (!supported[acronym] && !unbacked[acronym]) {
      warnings.push(`CEC CCA acronym ${acronym} is not listed in cca-service-area-map.json`);
    }
  }

  for (const [acronym, entry] of Object.entries(supported)) {
    for (const serviceAreaId of Object.values(entry.serviceAreaIds ?? {})) {
      if (!serviceAreaMap[serviceAreaId]) {
        errors.push(`CCA ${acronym} maps to unknown service area ${serviceAreaId}`);
      }
      if (!rateRegistryIds.has(serviceAreaId)) {
        errors.push(`CCA ${acronym} maps to service area ${serviceAreaId}, but it is missing from RATE_PLAN_REGISTRY`);
      }
    }
  }

  return { errors, warnings };
}

export function buildOverlayCandidates({
  zctaGeojson,
  utilityGeojson,
  ccaGeojson,
  ccaServiceAreaMap,
  sourceHashes,
  existingCandidates = null,
}) {
  const utilityFeaturesById = Object.fromEntries(
    UTILITY_IDS.map(utilityId => {
      const utility = UTILITY_CONFIG[utilityId];
      return [
        utilityId,
        utilityGeojson.features.filter(feature => feature.properties?.Acronym === utility.label),
      ];
    })
  );
  const ccaFeatures = ccaGeojson.features.filter(feature => feature.properties?.Type === 'CCA');

  const utilityPolygonsById = Object.fromEntries(
    UTILITY_IDS.map(utilityId => {
      const utility = UTILITY_CONFIG[utilityId];
      return [
        utilityId,
        flattenIndexedFeatures(utilityFeaturesById[utilityId], () => ({ utility: utility.label })),
      ];
    })
  );
  const ccaPolygons = flattenIndexedFeatures(ccaFeatures, feature => ({
    acronym: feature.properties?.Acronym,
    name: feature.properties?.Utility,
  }));

  const candidateEntries = zctaGeojson.features
    .map(zctaFeature => {
      const zcta = getZcta(zctaFeature);
      return [
        zcta,
        buildCandidate({
          zctaFeature,
          utilityPolygonsById,
          ccaPolygons,
          ccaServiceAreaMap,
          sourceHashes,
          existingCandidate: existingCandidates?.candidates?.[zcta],
        }),
      ];
    })
    .sort(([a], [b]) => a.localeCompare(b));

  const candidates = Object.fromEntries(candidateEntries);
  return {
    generatedAt: new Date().toISOString(),
    sourceHashes,
    thresholds: THRESHOLDS,
    stats: getStats(Object.values(candidates)),
    candidates,
  };
}

function pinnedSource(manifest, id) {
  const source = (manifest.sources ?? []).find(entry => entry.id === id);
  if (!source || source.status !== 'pinned' || !source.localPath || !source.sha256) {
    throw new Error(`Missing pinned territory source ${id}. Run the required pinning step before overlay generation.`);
  }

  const filePath = path.join(PATHS.repoRoot, source.localPath);
  const actualSha = fileSha256(filePath);
  if (actualSha !== source.sha256) {
    throw new Error(`Hash mismatch for ${source.localPath}; expected ${source.sha256}, got ${actualSha}.`);
  }

  return { source, filePath, sha256: actualSha };
}

export function loadOverlayInputs() {
  const manifest = readJson(PATHS.sourceManifest);
  const utilitySource = pinnedSource(manifest, 'cec-iou-pou');
  const ccaSource = pinnedSource(manifest, 'cec-other-lse');
  const zctaSource = pinnedSource(manifest, 'census-zcta-2024');

  return {
    zctaGeojson: readJson(zctaSource.filePath),
    utilityGeojson: readJson(utilitySource.filePath),
    ccaGeojson: readJson(ccaSource.filePath),
    ccaServiceAreaMap: readJson(PATHS.ccaServiceAreaMap),
    serviceAreas: readJson(PATHS.serviceAreas),
    rateRegistryIds: loadRateRegistryIds(),
    existingCandidates: fs.existsSync(PATHS.overlayCandidates) ? readJson(PATHS.overlayCandidates) : null,
    sourceHashes: {
      'cec-iou-pou': utilitySource.sha256,
      'cec-other-lse': ccaSource.sha256,
      'census-zcta-2024': zctaSource.sha256,
    },
  };
}

export function buildOverlayCandidatesFromFiles() {
  const inputs = loadOverlayInputs();
  const mapValidation = validateCcaMap(inputs);

  for (const warning of mapValidation.warnings) {
    console.warn(`Warning: ${warning}`);
  }

  if (mapValidation.errors.length > 0) {
    throw new Error(`CCA service-area map failed validation:\n- ${mapValidation.errors.join('\n- ')}`);
  }

  return buildOverlayCandidates(inputs);
}

export function writeOverlayCandidates() {
  const output = buildOverlayCandidatesFromFiles();
  fs.writeFileSync(PATHS.overlayCandidates, formatJson(output));
  console.log(`Wrote ${output.stats.zctaCount} overlay candidates to ${path.relative(PATHS.repoRoot, PATHS.overlayCandidates)}.`);
  console.log(
    `Suggestions: ${output.stats.suggestedAssignCount} assign, ${output.stats.suggestedMultiUtilityCount} multi-utility, ${output.stats.suggestedReviewCount} review, ${output.stats.suggestedExcludeCount} exclude, ${output.stats.noCoverageCount} no-coverage.`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    writeOverlayCandidates();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
