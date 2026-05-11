#!/usr/bin/env node
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PATHS, fileSha256, formatJson, readJson } from './territory-utils.js';

const TIGERWEB_ZCTA_LAYER_URL = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/7';
const TIGERWEB_ZCTA_URL = `${TIGERWEB_ZCTA_LAYER_URL}/query`;
const RESULT_RECORD_COUNT = 100;
const CA_ZCTA_PREFIX_MIN = '900';
const CA_ZCTA_PREFIX_MAX = '961';
const CA_BBOX = '-124.5,32.5,-114.1,42.1';
const GEOMETRY_PRECISION = 5;

function requestJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, response => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', chunk => {
          body += chunk;
        });
        response.on('end', () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`TIGERweb request failed with HTTP ${response.statusCode}`));
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(new Error(`TIGERweb returned invalid JSON: ${error.message}`));
          }
        });
      })
      .on('error', reject);
  });
}

function buildQueryUrl(resultOffset) {
  const url = new URL(TIGERWEB_ZCTA_URL);
  url.search = new URLSearchParams({
    where: "ZCTA5 >= '90000' AND ZCTA5 <= '96199'",
    geometry: CA_BBOX,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'ZCTA5,GEOID',
    returnGeometry: 'true',
    outSR: '4326',
    geometryPrecision: String(GEOMETRY_PRECISION),
    f: 'geojson',
    resultOffset: String(resultOffset),
    resultRecordCount: String(RESULT_RECORD_COUNT),
  }).toString();
  return url;
}

function getZcta(feature) {
  return String(feature?.properties?.ZCTA5 ?? feature?.properties?.GEOID ?? feature?.properties?.ZCTA5CE20 ?? '').padStart(5, '0');
}

function isCaliforniaZcta(feature) {
  const prefix = getZcta(feature).slice(0, 3);
  return prefix >= CA_ZCTA_PREFIX_MIN && prefix <= CA_ZCTA_PREFIX_MAX;
}

function normalizeZctaFeature(feature) {
  return {
    type: 'Feature',
    geometry: feature.geometry,
    properties: {
      ZCTA5CE20: getZcta(feature),
    },
  };
}

export async function fetchCaliforniaZctas() {
  const features = [];
  let resultOffset = 0;

  while (true) {
    const url = buildQueryUrl(resultOffset);
    const page = await requestJson(url);
    if (page.error) {
      throw new Error(`TIGERweb error: ${page.error.message ?? JSON.stringify(page.error)}`);
    }

    const pageFeatures = page.features ?? [];
    features.push(...pageFeatures);
    console.log(`Fetched ${pageFeatures.length} ZCTA features at offset ${resultOffset}.`);

    if (page.exceededTransferLimit !== true) {
      break;
    }

    resultOffset += RESULT_RECORD_COUNT;
  }

  const filtered = features.filter(isCaliforniaZcta).map(normalizeZctaFeature);
  console.log(`Filtered ZCTA features from ${features.length} to ${filtered.length}.`);

  return {
    type: 'FeatureCollection',
    features: filtered,
  };
}

function upsertZctaManifestEntry({ featureCount, bytes, sha256 }) {
  const manifest = readJson(PATHS.sourceManifest);
  const zctaEntry = {
    id: 'census-zcta-2024',
    name: 'U.S. Census Bureau TIGERweb ZIP Code Tabulation Areas (California, ACS 2024 service layer)',
    url: 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer',
    arcgisLayerUrl: TIGERWEB_ZCTA_LAYER_URL,
    queryUrl: `${TIGERWEB_ZCTA_URL}?where=ZCTA5%20%3E%3D%20%2790000%27%20AND%20ZCTA5%20%3C%3D%20%2796199%27&geometry=${encodeURIComponent(CA_BBOX)}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=ZCTA5%2CGEOID&returnGeometry=true&outSR=4326&geometryPrecision=${GEOMETRY_PRECISION}&f=geojson`,
    localPath: 'data-sources/territory/raw/zcta-ca-2024.geojson',
    capturedAt: new Date().toISOString(),
    featureCount,
    bytes,
    sha256,
    geometryPrecision: GEOMETRY_PRECISION,
    license: 'Public Domain (U.S. Government Work)',
    intendedUse: 'Pinned ZCTA polygon source for offline ZIP-to-utility/CCA overlay candidates. ZCTAs are approximate ZIP service area representations, not USPS delivery-route boundaries.',
    status: 'pinned',
  };

  const sources = manifest.sources ?? [];
  const index = sources.findIndex(source => source.id === 'census-zcta-2024' || source.id === 'census-zcta-2025');
  if (index >= 0) {
    sources[index] = zctaEntry;
  } else {
    sources.push(zctaEntry);
  }

  manifest.sources = sources;
  fs.writeFileSync(PATHS.sourceManifest, formatJson(manifest));
}

export async function pinZctaSnapshot() {
  const geojson = await fetchCaliforniaZctas();

  fs.mkdirSync(path.dirname(PATHS.zctaRaw), { recursive: true });
  fs.writeFileSync(PATHS.zctaRaw, `${JSON.stringify(geojson)}\n`);

  const stat = fs.statSync(PATHS.zctaRaw);
  const sha256 = fileSha256(PATHS.zctaRaw);
  upsertZctaManifestEntry({
    featureCount: geojson.features.length,
    bytes: stat.size,
    sha256,
  });

  console.log(`Pinned ${geojson.features.length} California ZCTA features to ${path.relative(PATHS.repoRoot, PATHS.zctaRaw)}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  pinZctaSnapshot().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}
