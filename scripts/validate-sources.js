#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PATHS, fileSha256, readJson } from './territory-utils.js';

const repoRoot = PATHS.repoRoot;
const defaultCatalogPath = path.join(repoRoot, 'data-sources/source-catalog.json');
const defaultManifestPath = PATHS.sourceManifest;

export function validateSources({ catalogPath = defaultCatalogPath, manifestPath = defaultManifestPath } = {}) {
  const errors = [];
  let rateFileCount = 0;
  let territoryFileCount = 0;

  if (!fs.existsSync(catalogPath)) {
    errors.push('Missing data-sources/source-catalog.json. Run npm run sources:catalog.');
    return {
      ok: false,
      errors,
      stats: { rateFileCount, territoryFileCount },
    };
  }

  const catalog = readJson(catalogPath);
  const catalogRoot = path.resolve(path.dirname(catalogPath), '..');

  for (const group of catalog.groups ?? []) {
    for (const file of group.files ?? []) {
      rateFileCount += 1;
      const absolutePath = path.join(catalogRoot, file.path);
      if (!fs.existsSync(absolutePath)) {
        errors.push(`Missing source file: ${file.path}`);
        continue;
      }

      const sha256 = fileSha256(absolutePath);
      if (sha256 !== file.sha256) {
        errors.push(`Hash mismatch for ${file.path}`);
      }
    }
  }

  if (fs.existsSync(manifestPath)) {
    const manifest = readJson(manifestPath);
    const manifestRoot = path.resolve(path.dirname(manifestPath), '../..');
    for (const source of manifest.sources ?? []) {
      if (source.status !== 'pinned' || !source.localPath || !source.sha256) continue;

      territoryFileCount += 1;
      const absolutePath = path.join(manifestRoot, source.localPath);
      if (!fs.existsSync(absolutePath)) {
        errors.push(`Missing territory source file: ${source.localPath}`);
        continue;
      }

      const sha256 = fileSha256(absolutePath);
      if (sha256 !== source.sha256) {
        errors.push(`Hash mismatch for ${source.localPath}`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    stats: { rateFileCount, territoryFileCount },
  };
}

export function runSourceValidation() {
  const result = validateSources();

  if (!result.ok) {
    console.error('Source catalog validation failed:');
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `Source catalog validation passed: ${result.stats.rateFileCount} rate files and ${result.stats.territoryFileCount} territory files matched.`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSourceValidation();
}
