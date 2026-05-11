#!/usr/bin/env node
import { loadValidationInputs, validateTerritoryData } from './territory-utils.js';

const result = validateTerritoryData(loadValidationInputs());

for (const warning of result.warnings) {
  console.warn(`Warning: ${warning.message}`);
}

if (!result.ok) {
  console.error('Territory validation failed:');
  for (const error of result.errors) {
    console.error(`- ${error.message}`);
  }
  process.exit(1);
}

console.log(
  `Territory validation passed: ${result.stats.pgeZipCount} PG&E ZIPs, ${result.stats.sceZipCount} SCE ZIPs, ${result.stats.multiUtilityZipCount} multi-utility ZIPs, ${result.stats.serviceAreaCount} service areas.`
);
