#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outputPath = path.join(repoRoot, 'data-sources/source-catalog.json');

const sourceGroups = [
  {
    id: 'pge-rate-workbooks',
    description: 'Authoritative PG&E delivery and PG&E-territory CCA generation workbooks.',
    paths: [
      'data-sources/pge_source/res-inclu-tou-current.xlsx',
      'data-sources/pge_source/CCA_Generation_Rates.xlsx',
    ],
  },
  {
    id: 'pge-cca-raw-sources',
    description: 'Raw PG&E-territory CCA rate PDFs, research notes, and verification reports.',
    roots: ['data-sources/cca_source/raw_sources'],
  },
  {
    id: 'sce-rate-workbooks',
    description: 'Authoritative SCE combined rates workbook and SCE residential raw source documents.',
    paths: ['data-sources/sce_source/SCE_Combined_Rates.xlsx'],
    roots: ['data-sources/sce_source/raw_sources'],
  },
];

function walkFiles(rootRelativePath) {
  const root = path.join(repoRoot, rootRelativePath);
  if (!fs.existsSync(root)) return [];

  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const relativePath = path.join(rootRelativePath, entry.name);
    if (entry.name === '.DS_Store') return [];
    if (entry.isDirectory()) return walkFiles(relativePath);
    if (!entry.isFile()) return [];
    return [relativePath];
  });
}

function hashFile(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const buffer = fs.readFileSync(absolutePath);
  const stat = fs.statSync(absolutePath);
  return {
    path: relativePath,
    bytes: stat.size,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
  };
}

const groups = sourceGroups.map(group => {
  const paths = [
    ...(group.paths ?? []),
    ...(group.roots ?? []).flatMap(walkFiles),
  ].sort();

  return {
    id: group.id,
    description: group.description,
    files: paths.map(hashFile),
  };
});

const catalog = {
  catalogVersion: 1,
  generatedBy: 'scripts/catalog-sources.js',
  note: 'Catalog of local authoritative rate source documents. Some source directories are gitignored because they contain large raw PDFs/workbooks; this catalog records their expected local paths and hashes.',
  groups,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);

console.log(`Cataloged ${groups.reduce((sum, group) => sum + group.files.length, 0)} source files in ${path.relative(repoRoot, outputPath)}.`);
