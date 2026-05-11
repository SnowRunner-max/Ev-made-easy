import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateSources } from './validate-sources.js';

let tempRoot = null;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function buildFixture({ territoryShaOverride = null } = {}) {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'territory-sources-'));
  fs.mkdirSync(path.join(tempRoot, 'sources'), { recursive: true });
  fs.mkdirSync(path.join(tempRoot, 'data-sources/territory/raw'), { recursive: true });

  const rateSource = 'rate source';
  const territorySource = 'territory source';
  fs.writeFileSync(path.join(tempRoot, 'sources/rate.txt'), rateSource);
  fs.writeFileSync(path.join(tempRoot, 'data-sources/territory/raw/zcta.geojson'), territorySource);

  const catalogPath = path.join(tempRoot, 'data-sources/source-catalog.json');
  const manifestPath = path.join(tempRoot, 'data-sources/territory/source-manifest.json');

  writeJson(catalogPath, {
    groups: [
      {
        id: 'fixture-rates',
        files: [
          {
            path: 'sources/rate.txt',
            sha256: sha256(rateSource),
          },
        ],
      },
    ],
  });

  writeJson(manifestPath, {
    sources: [
      {
        id: 'fixture-zcta',
        status: 'pinned',
        localPath: 'data-sources/territory/raw/zcta.geojson',
        sha256: territoryShaOverride ?? sha256(territorySource),
      },
    ],
  });

  return { catalogPath, manifestPath };
}

afterEach(() => {
  if (tempRoot) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    tempRoot = null;
  }
});

describe('source validation', () => {
  it('validates pinned rate and territory source hashes', () => {
    const paths = buildFixture();
    const result = validateSources(paths);

    expect(result.ok).toBe(true);
    expect(result.stats.rateFileCount).toBe(1);
    expect(result.stats.territoryFileCount).toBe(1);
  });

  it('reports territory source hash mismatches', () => {
    const paths = buildFixture({ territoryShaOverride: 'wrong-hash' });
    const result = validateSources(paths);

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('Hash mismatch for data-sources/territory/raw/zcta.geojson');
  });
});
