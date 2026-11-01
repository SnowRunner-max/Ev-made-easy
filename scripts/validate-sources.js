#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PATHS, readJson } from './territory-utils.js';
import { sourceFingerprint } from './source-utils.js';

const repoRoot = PATHS.repoRoot;
const defaultCatalogPath = path.join(repoRoot, 'data-sources/source-catalog.json');
const defaultManifestPath = PATHS.sourceManifest;

export function validateSources({ catalogPath = defaultCatalogPath, manifestPath = defaultManifestPath } = {}) {
  const errors = [];
  let rateFileCount = 0;
  let territoryFileCount = 0;
  function validateFile(absolutePath, relativePath, expected, kind) {
    let actual;
    try {
      actual = sourceFingerprint(absolutePath, relativePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        errors.push(`Missing ${kind}source file: ${relativePath}`);
      } else if (error.code === 'UNHYDRATED_LFS_POINTER') {
        errors.push(error.message);
      } else {
        throw error;
      }
      return;
    }

    if (expected.bytes !== undefined && actual.bytes !== expected.bytes) {
      errors.push(`Size mismatch for ${relativePath}: expected ${expected.bytes} bytes, found ${actual.bytes}`);
    }
    if (actual.sha256 !== expected.sha256) {
      errors.push(`Hash mismatch for ${relativePath}`);
    }
  }

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
      validateFile(absolutePath, file.path, file, '');
    }
  }

  if (fs.existsSync(manifestPath)) {
    const manifest = readJson(manifestPath);
    const manifestRoot = path.resolve(path.dirname(manifestPath), '../..');
    for (const source of manifest.sources ?? []) {
      if (source.status !== 'pinned' || !source.localPath || !source.sha256) continue;

      territoryFileCount += 1;
      const absolutePath = path.join(manifestRoot, source.localPath);
      validateFile(absolutePath, source.localPath, source, 'territory ');
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
