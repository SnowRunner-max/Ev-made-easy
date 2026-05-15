#!/usr/bin/env node
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import {
  PATHS,
  buildTerritoryData,
  formatJson,
  loadManualOverrides,
  loadCurrentTerritoryData,
  loadVerifiedZips,
  readJson,
  validateTerritoryData,
  loadRateRegistryIds,
  makeBuildReport,
} from './territory-utils.js';
import { UTILITY_CONFIG, UTILITY_IDS } from './utility-config.js';

export function buildTerritoryFromFiles({ check = false } = {}) {
  const verifiedZips = loadVerifiedZips();
  const manifest = readJson(PATHS.sourceManifest);
  const generated = buildTerritoryData({
    verifiedZips,
    manualOverrides: loadManualOverrides(),
  });

  if (verifiedZips.bootstrapFromRuntime) {
    const current = loadCurrentTerritoryData();
    for (const utilityId of UTILITY_IDS) {
      const key = UTILITY_CONFIG[utilityId].generatedKey;
      generated[key]._note = current[key]._note;
    }
    generated.multiUtilityZips._note = current.multiUtilityZips._note;
  }

  const validation = validateTerritoryData({
    utilityTerritories: Object.fromEntries(
      UTILITY_IDS.map(utilityId => {
        const utility = UTILITY_CONFIG[utilityId];
        return [utilityId, generated[utility.generatedKey]];
      })
    ),
    multiUtilityZips: generated.multiUtilityZips,
    serviceAreas: readJson(PATHS.serviceAreas),
    ratePlanFiles: Object.fromEntries(
      UTILITY_IDS.map(utilityId => {
        const utility = UTILITY_CONFIG[utilityId];
        return [utilityId, readJson(PATHS[utility.ratePlansPathKey])];
      })
    ),
    rateRegistryIds: loadRateRegistryIds(),
    manifest,
  });

  if (!validation.ok) {
    throw new Error(
      `Generated territory data failed validation:\n${validation.errors.map(e => `- ${e.message}`).join('\n')}`
    );
  }

  const outputs = [
    ...UTILITY_IDS.map(utilityId => {
      const utility = UTILITY_CONFIG[utilityId];
      return [PATHS[utility.territoryPathKey], generated[utility.generatedKey]];
    }),
    [PATHS.multiUtilityZips, generated.multiUtilityZips],
    [PATHS.buildReport, makeBuildReport({ generated, validation, manifest })],
  ];

  if (check) {
    const driftedPaths = outputs
      .filter(([filePath]) => filePath !== PATHS.buildReport)
      .filter(([filePath, value]) => formatJson(readJson(filePath)) !== formatJson(value))
      .map(([filePath]) => filePath);

    return {
      ok: driftedPaths.length === 0,
      checkMode: true,
      driftedPaths,
      written: [],
      bootstrapped: false,
      warnings: validation.warnings,
    };
  }

  if (verifiedZips.bootstrapFromRuntime) {
    fs.writeFileSync(PATHS.buildReport, formatJson(makeBuildReport({ generated, validation, manifest })));
    return {
      ok: true,
      checkMode: false,
      driftedPaths: [],
      written: [PATHS.buildReport],
      bootstrapped: true,
      warnings: validation.warnings,
    };
  }

  for (const [filePath, value] of outputs) {
    fs.writeFileSync(filePath, formatJson(value));
  }

  return {
    ok: true,
    checkMode: false,
    driftedPaths: [],
    written: outputs.map(([p]) => p),
    bootstrapped: false,
    warnings: validation.warnings,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const check = process.argv.includes('--check');
  try {
    const result = buildTerritoryFromFiles({ check });
    if (result.checkMode) {
      if (!result.ok) {
        console.error('Generated territory output differs from checked-in files:');
        for (const filePath of result.driftedPaths) {
          console.error(`- ${filePath}`);
        }
        console.error('Run npm run territory:build and review the generated JSON.');
        process.exit(1);
      }
      console.log('Territory generated output matches checked-in runtime JSON.');
    } else if (result.bootstrapped) {
      console.log('Territory build report generated. Runtime JSON was not rewritten because source snapshots are bootstrapped from current runtime artifacts.');
    } else {
      console.log('Territory files generated successfully.');
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
