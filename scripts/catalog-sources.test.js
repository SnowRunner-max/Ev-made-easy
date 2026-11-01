// @vitest-environment node
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const scriptsRoot = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = 'data-sources/pge_source/CCA_Generation_Rates.xlsx';
const hydratedDocument = Buffer.from('fixture workbook content');
let tempRoot = null;

function buildFixture() {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rate-source-catalog-'));
  fs.mkdirSync(path.join(tempRoot, 'scripts'));
  fs.writeFileSync(path.join(tempRoot, 'package.json'), '{"type":"module"}\n');
  for (const name of ['catalog-sources.js', 'source-utils.js']) {
    const scriptPath = path.join(scriptsRoot, name);
    if (fs.existsSync(scriptPath)) fs.copyFileSync(scriptPath, path.join(tempRoot, 'scripts', name));
  }
  for (const relativePath of [
    sourcePath,
    'data-sources/pge_source/res-inclu-tou-current.xlsx',
    'data-sources/sce_source/SCE_Combined_Rates.xlsx',
  ]) {
    fs.mkdirSync(path.dirname(path.join(tempRoot, relativePath)), { recursive: true });
    fs.writeFileSync(path.join(tempRoot, relativePath), hydratedDocument);
  }
  return path.join(tempRoot, 'data-sources/source-catalog.json');
}

function runCatalog() {
  return spawnSync(process.execPath, [path.join(tempRoot, 'scripts/catalog-sources.js')], {
    encoding: 'utf8',
  });
}

afterEach(() => {
  if (tempRoot) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    tempRoot = null;
  }
});

describe('source catalog generation', () => {
  it('fingerprints hydrated document bytes with their exact length and SHA256', () => {
    const outputPath = buildFixture();
    const result = runCatalog();

    expect(result.status, result.stderr).toBe(0);
    const catalog = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    const entry = catalog.groups.flatMap(group => group.files).find(file => file.path === sourcePath);
    expect(entry).toEqual({
      path: sourcePath,
      bytes: hydratedDocument.length,
      sha256: crypto.createHash('sha256').update(hydratedDocument).digest('hex'),
    });
  });

  it.each(['\n', '\r\n'])('refuses LFS pointer text without replacing an existing catalog (%j)', newline => {
    const outputPath = buildFixture();
    const existingCatalog = '{"preserve":"existing catalog"}\n';
    fs.writeFileSync(outputPath, existingCatalog);
    fs.writeFileSync(path.join(tempRoot, sourcePath), [
      'version https://git-lfs.github.com/spec/v1',
      `oid sha256:${'a'.repeat(64)}`,
      'size 123456',
      '',
    ].join(newline));

    const result = runCatalog();

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(`Unhydrated Git LFS pointer: ${sourcePath}`);
    expect(result.stderr).toContain('git lfs pull');
    expect(fs.readFileSync(outputPath, 'utf8')).toBe(existingCatalog);
  });

  it('does not replace an existing catalog when a required source is missing', () => {
    const outputPath = buildFixture();
    const existingCatalog = '{"preserve":"existing catalog"}\n';
    fs.writeFileSync(outputPath, existingCatalog);
    fs.unlinkSync(path.join(tempRoot, sourcePath));

    const result = runCatalog();

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('ENOENT');
    expect(result.stderr).not.toContain('Unhydrated');
    expect(fs.readFileSync(outputPath, 'utf8')).toBe(existingCatalog);
  });
});
