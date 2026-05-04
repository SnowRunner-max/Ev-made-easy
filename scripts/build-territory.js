#!/usr/bin/env node
import fs from 'node:fs';
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

const checkOnly = process.argv.includes('--check');
const verifiedZips = loadVerifiedZips();
const manifest = readJson(PATHS.sourceManifest);
const generated = buildTerritoryData({
  verifiedZips,
  manualOverrides: loadManualOverrides(),
});

if (verifiedZips.bootstrapFromRuntime) {
  const current = loadCurrentTerritoryData();
  generated.pgeTerritory._note = current.pgeTerritory._note;
  generated.sceTerritory._note = current.sceTerritory._note;
  generated.multiUtilityZips._note = current.multiUtilityZips._note;
}

const validation = validateTerritoryData({
  pgeTerritory: generated.pgeTerritory,
  sceTerritory: generated.sceTerritory,
  multiUtilityZips: generated.multiUtilityZips,
  serviceAreas: readJson(PATHS.serviceAreas),
  ratePlanFiles: {
    pge: readJson(PATHS.pgeRatePlans),
    sce: readJson(PATHS.sceRatePlans),
  },
  rateRegistryIds: loadRateRegistryIds(),
  manifest,
});

if (!validation.ok) {
  console.error('Generated territory data failed validation:');
  for (const error of validation.errors) {
    console.error(`- ${error.message}`);
  }
  process.exit(1);
}

const outputs = [
  [PATHS.pgeTerritory, generated.pgeTerritory],
  [PATHS.sceTerritory, generated.sceTerritory],
  [PATHS.multiUtilityZips, generated.multiUtilityZips],
  [PATHS.buildReport, makeBuildReport({ generated, validation, manifest })],
];

if (checkOnly) {
  const mismatches = outputs
    .filter(([filePath]) => filePath !== PATHS.buildReport)
    .filter(([filePath, value]) => formatJson(readJson(filePath)) !== formatJson(value))
    .map(([filePath]) => filePath);

  if (mismatches.length > 0) {
    console.error('Generated territory output differs from checked-in files:');
    for (const filePath of mismatches) {
      console.error(`- ${filePath}`);
    }
    console.error('Run npm run territory:build and review the generated JSON.');
    process.exit(1);
  }

  console.log('Territory generated output matches checked-in runtime JSON.');
  process.exit(0);
}

if (verifiedZips.bootstrapFromRuntime) {
  fs.writeFileSync(PATHS.buildReport, formatJson(makeBuildReport({ generated, validation, manifest })));
  console.log('Territory build report generated. Runtime JSON was not rewritten because source snapshots are bootstrapped from current runtime artifacts.');
  process.exit(0);
}

for (const [filePath, value] of outputs) {
  fs.writeFileSync(filePath, formatJson(value));
}

console.log('Territory files generated successfully.');
