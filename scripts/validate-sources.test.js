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
            bytes: Buffer.byteLength(rateSource),
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
        bytes: Buffer.byteLength(territorySource),
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

  it.each([
    ['sources/rate.txt', 'rate'],
    ['data-sources/territory/raw/zcta.geojson', 'territory'],
  ])('rejects an unhydrated pointer at %s before checking its digest or size', (relativePath, kind) => {
    const paths = buildFixture();
    const pointer = `version https://git-lfs.github.com/spec/v1\noid sha256:${'a'.repeat(64)}\nsize 123456\n`;
    fs.writeFileSync(path.join(tempRoot, relativePath), pointer);

    // Even a catalog incorrectly fingerprinting pointer text must not pass.
    const metadataPath = kind === 'rate' ? paths.catalogPath : paths.manifestPath;
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    const entry = kind === 'rate' ? metadata.groups[0].files[0] : metadata.sources[0];
    entry.sha256 = sha256(pointer);
    entry.bytes = Buffer.byteLength(pointer);
    writeJson(metadataPath, metadata);

    const result = validateSources(paths);

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain(`Unhydrated Git LFS pointer: ${relativePath}`);
    expect(result.errors[0]).toContain('git lfs pull');
    expect(result.errors[0]).not.toMatch(/Hash mismatch|Size mismatch|Missing/);
  });

  it('reports missing sources separately from unhydrated pointers', () => {
    const paths = buildFixture();
    fs.unlinkSync(path.join(tempRoot, 'sources/rate.txt'));
    fs.unlinkSync(path.join(tempRoot, 'data-sources/territory/raw/zcta.geojson'));

    expect(validateSources(paths).errors).toEqual([
      'Missing source file: sources/rate.txt',
      'Missing territory source file: data-sources/territory/raw/zcta.geojson',
    ]);
  });

  it('detects changed content even when the byte count is unchanged', () => {
    const paths = buildFixture();
    fs.writeFileSync(path.join(tempRoot, 'sources/rate.txt'), 'fake source');

    const result = validateSources(paths);

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Hash mismatch for sources/rate.txt');
  });

  it('reports both size and digest mismatches for truncated content', () => {
    const paths = buildFixture();
    fs.writeFileSync(path.join(tempRoot, 'sources/rate.txt'), 'rate');

    const result = validateSources(paths);

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors.join('\n')).toContain('Size mismatch for sources/rate.txt: expected 11 bytes, found 4');
    expect(result.errors.join('\n')).toContain('Hash mismatch for sources/rate.txt');
  });

  it.each([
    ['rate', 'sources/rate.txt'],
    ['territory', 'data-sources/territory/raw/zcta.geojson'],
  ])('checks %s byte counts independently of digest identity', (kind, relativePath) => {
    const paths = buildFixture();
    const metadataPath = kind === 'rate' ? paths.catalogPath : paths.manifestPath;
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    const entry = kind === 'rate' ? metadata.groups[0].files[0] : metadata.sources[0];
    const actualBytes = entry.bytes;
    entry.bytes += 1;
    writeJson(metadataPath, metadata);

    const result = validateSources(paths);

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      `Size mismatch for ${relativePath}: expected ${actualBytes + 1} bytes, found ${actualBytes}`,
    ]);
  });
});
