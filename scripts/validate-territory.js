#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { loadValidationInputs, validateTerritoryData } from './territory-utils.js';
import { UTILITY_CONFIG } from './utility-config.js';

export function validateTerritoryFromFiles() {
  return validateTerritoryData(loadValidationInputs());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = validateTerritoryFromFiles();

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

  const utilityCounts = Object.entries(result.stats)
    .filter(([key]) => key.endsWith('ZipCount') && key !== 'multiUtilityZipCount')
    .map(([key, count]) => {
      const utilityId = key.replace(/ZipCount$/, '');
      return `${count} ${UTILITY_CONFIG[utilityId]?.label ?? utilityId.toUpperCase()} ZIPs`;
    })
    .join(', ');

  console.log(
    `Territory validation passed: ${utilityCounts}, ${result.stats.multiUtilityZipCount} multi-utility ZIPs, ${result.stats.serviceAreaCount} service areas.`
  );
}
