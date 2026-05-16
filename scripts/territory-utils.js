import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UTILITY_CONFIG, UTILITY_IDS } from './utility-config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

export const PATHS = {
  repoRoot: REPO_ROOT,
  pgeTerritory: path.join(REPO_ROOT, 'src/data/pgeTerritory.json'),
  sceTerritory: path.join(REPO_ROOT, 'src/data/sceTerritory.json'),
  tdpudTerritory: path.join(REPO_ROOT, 'src/data/tdpudTerritory.json'),
  libertyTerritory: path.join(REPO_ROOT, 'src/data/libertyTerritory.json'),
  sdgeTerritory: path.join(REPO_ROOT, 'src/data/sdgeTerritory.json'),
  multiUtilityZips: path.join(REPO_ROOT, 'src/data/multiUtilityZips.json'),
  serviceAreas: path.join(REPO_ROOT, 'src/data/serviceAreas.json'),
  pgeRatePlans: path.join(REPO_ROOT, 'src/data/ratePlans.json'),
  sceRatePlans: path.join(REPO_ROOT, 'src/data/sceRatePlans.json'),
  tdpudRatePlans: path.join(REPO_ROOT, 'src/data/tdpudRatePlans.json'),
  libertyRatePlans: path.join(REPO_ROOT, 'src/data/libertyRatePlans.json'),
  sdgeRatePlans: path.join(REPO_ROOT, 'src/data/sdgeRatePlans.json'),
  ratePlanRegistry: path.join(REPO_ROOT, 'src/data/ratePlanRegistry.js'),
  territorySources: path.join(REPO_ROOT, 'data-sources/territory'),
  verifiedZips: path.join(REPO_ROOT, 'data-sources/territory/verified-zips.json'),
  manualOverrides: path.join(REPO_ROOT, 'data-sources/territory/manual-overrides.json'),
  sourceManifest: path.join(REPO_ROOT, 'data-sources/territory/source-manifest.json'),
  buildReport: path.join(REPO_ROOT, 'data-sources/territory/build-report.json'),
  zctaRaw: path.join(REPO_ROOT, 'data-sources/territory/raw/zcta-ca-2024.geojson'),
  overlayCandidates: path.join(REPO_ROOT, 'data-sources/territory/overlay-candidates.json'),
  ccaServiceAreaMap: path.join(REPO_ROOT, 'data-sources/territory/cca-service-area-map.json'),
  reviewQueue: path.join(REPO_ROOT, 'data-sources/territory/review-queue.json'),
};

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function fileSha256(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function sortObjectByKey(value) {
  if (Array.isArray(value)) {
    return value.map(sortObjectByKey);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map(key => [key, sortObjectByKey(value[key])])
  );
}

export function formatJson(value) {
  return `${JSON.stringify(sortObjectByKey(value), null, 2)}\n`;
}

function utilityIds(utilityConfig) {
  return Object.keys(utilityConfig);
}

function findUtilityByLabel(utilityConfig, label) {
  return Object.values(utilityConfig).find(utility => utility.label === label) ?? null;
}

function findUtilityForServiceArea(utilityConfig, serviceArea) {
  if (!serviceArea) return null;
  return utilityConfig[serviceArea.utilityId] ?? findUtilityByLabel(utilityConfig, serviceArea.utility);
}

export function buildTerritoryData({ verifiedZips, manualOverrides = [], utilityConfig = UTILITY_CONFIG }) {
  const ids = utilityIds(utilityConfig);
  const utilityZips = Object.fromEntries(
    ids.map(utilityId => [
      utilityId,
      { ...(verifiedZips?.[utilityConfig[utilityId].verifiedKey]?.zips ?? {}) },
    ])
  );
  const multi = { ...(verifiedZips?.multiUtility?.zips ?? {}) };
  const excluded = { ...(verifiedZips?.excluded?.zips ?? {}) };
  const appliedOverrides = [];

  for (const override of manualOverrides) {
    if (!override?.zip || !override.action) continue;

    if (override.action === 'assign') {
      delete multi[override.zip];
      delete excluded[override.zip];
      const utility = findUtilityByLabel(utilityConfig, override.utility);
      if (utility) {
        for (const zips of Object.values(utilityZips)) {
          delete zips[override.zip];
        }
        utilityZips[utility.id][override.zip] = override.serviceAreaId;
      }
    }

    if (override.action === 'multiUtility') {
      multi[override.zip] = [...override.candidates].sort();
    }

    if (override.action === 'exclude') {
      for (const zips of Object.values(utilityZips)) {
        delete zips[override.zip];
      }
      delete multi[override.zip];
      excluded[override.zip] = {
        reason: override.reason,
        source: override.source,
      };
    }

    appliedOverrides.push({
      zip: override.zip,
      action: override.action,
      reason: override.reason,
      source: override.source,
    });
  }

  const generated = Object.fromEntries(
    ids.map(utilityId => {
      const utility = utilityConfig[utilityId];
      return [
        utility.generatedKey,
        {
          _note: utility.territoryNote,
          zips: utilityZips[utilityId],
        },
      ];
    })
  );

  return {
    ...generated,
    multiUtilityZips: {
      _note: 'ZIPs where a single code spans multiple utility territories. User must select their utility. Generated by scripts/build-territory.js.',
      zips: multi,
    },
    excluded,
    appliedOverrides,
  };
}

export function loadCurrentTerritoryData() {
  return {
    ...Object.fromEntries(
      UTILITY_IDS.map(utilityId => {
        const utility = UTILITY_CONFIG[utilityId];
        return [utility.generatedKey, readJson(PATHS[utility.territoryPathKey])];
      })
    ),
    multiUtilityZips: readJson(PATHS.multiUtilityZips),
  };
}

export function loadVerifiedZips() {
  const source = readJson(PATHS.verifiedZips);
  if (source.bootstrapFromRuntime) {
    const current = loadCurrentTerritoryData();
    return {
      ...source,
      ...Object.fromEntries(
        UTILITY_IDS.map(utilityId => {
          const utility = UTILITY_CONFIG[utilityId];
          return [utility.verifiedKey, { zips: current[utility.generatedKey].zips }];
        })
      ),
      multiUtility: { zips: current.multiUtilityZips.zips },
    };
  }
  return source;
}

export function loadManualOverrides() {
  return readJson(PATHS.manualOverrides).overrides ?? [];
}

export function loadRateRegistryIds(registryPath = PATHS.ratePlanRegistry) {
  if (registryPath === PATHS.ratePlanRegistry && fs.existsSync(PATHS.serviceAreas)) {
    const serviceAreas = readJson(PATHS.serviceAreas).serviceAreas ?? {};
    return new Set(Object.keys(serviceAreas));
  }
  const source = fs.readFileSync(registryPath, 'utf8');
  return new Set([...source.matchAll(/['"]([a-z0-9-]+)['"]\s*:/g)].map(match => match[1]));
}

function addIssue(issues, message, details = {}) {
  issues.push({ message, ...details });
}

function getRateDataForUtility(ratePlanFiles, utilityConfig) {
  return utilityConfig ? ratePlanFiles[utilityConfig.id] : null;
}

function providerExistsInAnyPlan(rateData, provider) {
  return Object.values(rateData.ratePlans ?? {}).some(plan => plan.rates?.ccaGeneration?.[provider]);
}

function providerExistsInPlan(rateData, planId, provider) {
  return Boolean(rateData.ratePlans?.[planId]?.rates?.ccaGeneration?.[provider]);
}

export function validateTerritoryData({
  pgeTerritory,
  sceTerritory,
  utilityTerritories = null,
  multiUtilityZips,
  serviceAreas,
  ratePlanFiles,
  rateRegistryIds,
  manifest = null,
  utilityConfig = UTILITY_CONFIG,
}) {
  const errors = [];
  const warnings = [];
  const knownServiceAreaIds = new Set(Object.keys(serviceAreas.serviceAreas ?? serviceAreas));
  const serviceAreaMap = serviceAreas.serviceAreas ?? serviceAreas;
  const territories = utilityTerritories ?? {
    pge: pgeTerritory,
    sce: sceTerritory,
  };
  const territoryEntries = Object.entries(territories).map(([utilityId, territory]) => ({
    utilityId,
    config: utilityConfig[utilityId],
    zips: territory?.zips ?? {},
  }));
  const multiZips = multiUtilityZips.zips ?? {};
  const usedServiceAreaIds = new Set();

  for (const { config, zips } of territoryEntries) {
    const label = config?.label ?? 'Unknown utility';
    for (const [zip, serviceAreaId] of Object.entries(zips)) {
      usedServiceAreaIds.add(serviceAreaId);
      if (!knownServiceAreaIds.has(serviceAreaId)) {
        addIssue(errors, `${label} ZIP ${zip} references unknown serviceAreaId ${serviceAreaId}`, { zip, serviceAreaId });
      }
    }
  }

  for (const [zip, candidates] of Object.entries(multiZips)) {
    if (!Array.isArray(candidates) || candidates.length < 2) {
      addIssue(errors, `Multi-utility ZIP ${zip} must list at least two candidates`, { zip });
      continue;
    }
    for (const serviceAreaId of candidates) {
      usedServiceAreaIds.add(serviceAreaId);
      if (!knownServiceAreaIds.has(serviceAreaId)) {
        addIssue(errors, `Multi-utility ZIP ${zip} references unknown serviceAreaId ${serviceAreaId}`, { zip, serviceAreaId });
      }
    }
  }

  for (let i = 0; i < territoryEntries.length; i += 1) {
    for (let j = i + 1; j < territoryEntries.length; j += 1) {
      const left = territoryEntries[i];
      const right = territoryEntries[j];
      for (const zip of Object.keys(left.zips)) {
        if (right.zips[zip] && !multiZips[zip]) {
          addIssue(
            errors,
            `ZIP ${zip} is assigned to both ${left.config?.label ?? left.utilityId} and ${right.config?.label ?? right.utilityId} but is missing from multiUtilityZips.json`,
            { zip, [`${left.utilityId}ServiceAreaId`]: left.zips[zip], [`${right.utilityId}ServiceAreaId`]: right.zips[zip] }
          );
        }
      }
    }
  }

  for (const [serviceAreaId, area] of Object.entries(serviceAreaMap)) {
    if (!rateRegistryIds.has(serviceAreaId)) {
      addIssue(errors, `Service area ${serviceAreaId} is missing from RATE_PLAN_REGISTRY`, { serviceAreaId });
    }

    const serviceAreaUtility = findUtilityForServiceArea(utilityConfig, area);
    if (!serviceAreaUtility) {
      addIssue(errors, `Service area ${serviceAreaId} uses unsupported utility ${area.utility}`, { serviceAreaId });
      continue;
    }

    const rateData = getRateDataForUtility(ratePlanFiles, serviceAreaUtility);
    if (!rateData?.ratePlans?.[area.defaultPlanId]) {
      addIssue(errors, `Service area ${serviceAreaId} default plan ${area.defaultPlanId} is missing from ${area.utility} rate data`, { serviceAreaId });
      continue;
    }

    if (area.defaultProvider !== serviceAreaUtility.bundledProviderId && !providerExistsInPlan(rateData, area.defaultPlanId, area.defaultProvider)) {
      addIssue(errors, `Service area ${serviceAreaId} default provider ${area.defaultProvider} is missing from default plan ${area.defaultPlanId}`, { serviceAreaId });
    }

    for (const cca of area.ccas ?? []) {
      if (!providerExistsInAnyPlan(rateData, cca)) {
        addIssue(errors, `Service area ${serviceAreaId} CCA ${cca} is not present in ${area.utility} rate data`, { serviceAreaId, cca });
      }
    }
  }

  const countsByServiceArea = {};
  for (const { zips } of territoryEntries) {
    for (const serviceAreaId of Object.values(zips)) {
      countsByServiceArea[serviceAreaId] = (countsByServiceArea[serviceAreaId] ?? 0) + 1;
    }
  }
  for (const [serviceAreaId, count] of Object.entries(countsByServiceArea)) {
    if (count > 0 && count < 5) {
      addIssue(warnings, `Service area ${serviceAreaId} has only ${count} ZIP entries; confirm this is intentional`, { serviceAreaId, count });
    }
  }

  if (manifest?.sourceMode?.includes('bootstrap')) {
    addIssue(
      warnings,
      'Territory ZIP outputs are bootstrapped from current runtime artifacts; overlay pinned CEC boundary snapshots with a reviewed ZIP/ZCTA source before broad coverage expansion'
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: {
      ...Object.fromEntries(
        territoryEntries.map(({ config, utilityId, zips }) => [
          config?.statsKey ?? `${utilityId}ZipCount`,
          Object.keys(zips).length,
        ])
      ),
      multiUtilityZipCount: Object.keys(multiZips).length,
      serviceAreaCount: knownServiceAreaIds.size,
      usedServiceAreaCount: usedServiceAreaIds.size,
    },
  };
}

export function loadValidationInputs() {
  const currentTerritoryData = loadCurrentTerritoryData();
  return {
    ...currentTerritoryData,
    utilityTerritories: Object.fromEntries(
      UTILITY_IDS.map(utilityId => {
        const utility = UTILITY_CONFIG[utilityId];
        return [utilityId, currentTerritoryData[utility.generatedKey]];
      })
    ),
    serviceAreas: readJson(PATHS.serviceAreas),
    ratePlanFiles: Object.fromEntries(
      UTILITY_IDS.map(utilityId => {
        const utility = UTILITY_CONFIG[utilityId];
        return [utilityId, readJson(PATHS[utility.ratePlansPathKey])];
      })
    ),
    rateRegistryIds: loadRateRegistryIds(),
    manifest: fs.existsSync(PATHS.sourceManifest) ? readJson(PATHS.sourceManifest) : null,
  };
}

export function makeBuildReport({ generated, validation, manifest }) {
  return {
    generatedAt: new Date().toISOString(),
    sourceMode: manifest?.sourceMode ?? 'unknown',
    sources: manifest?.sources ?? [],
    stats: {
      ...validation.stats,
      excludedZipCount: Object.keys(generated.excluded ?? {}).length,
      appliedOverrideCount: generated.appliedOverrides.length,
    },
    warnings: validation.warnings,
    appliedOverrides: generated.appliedOverrides,
  };
}
