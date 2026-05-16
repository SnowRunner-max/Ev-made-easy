import { describe, expect, it } from 'vitest';
import { buildOverlayCandidates } from './overlay-territory.js';

const sourceHashes = {
  'cec-iou-pou': 'utility-hash',
  'cec-other-lse': 'cca-hash',
  'census-zcta-2024': 'zcta-hash',
};

const ccaServiceAreaMap = {
  supported: {
    CPA: {
      ccaId: 'cpa',
      serviceAreaIds: { sce: 'sce-cpa-la' },
    },
    SJCE: {
      ccaId: 'sjce',
      serviceAreaIds: { pge: 'pge-sjce-scc' },
    },
    'Peninsula Clean Ener': {
      ccaId: 'pce',
      serviceAreaIds: { pge: 'pge-pce-smc' },
    },
  },
  unbacked: {
    AVCE: { reason: 'No rate-backed service-area ID yet.' },
  },
};

function rectangle([minX, minY, maxX, maxY], properties = {}) {
  return {
    type: 'Feature',
    properties,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [minX, minY],
          [maxX, minY],
          [maxX, maxY],
          [minX, maxY],
          [minX, minY],
        ],
      ],
    },
  };
}

function collection(features) {
  return { type: 'FeatureCollection', features };
}

function build({ zctas, utilities, ccas, hashes = sourceHashes, existingCandidates = null }) {
  return buildOverlayCandidates({
    zctaGeojson: collection(zctas),
    utilityGeojson: collection(utilities),
    ccaGeojson: collection(ccas),
    ccaServiceAreaMap,
    sourceHashes: hashes,
    existingCandidates,
  });
}

describe('territory overlay candidate generation', () => {
  it('suggests PG&E-only and SCE CCA assignments for dominant utility ZIPs', () => {
    const result = build({
      zctas: [
        rectangle([0, 0, 1, 1], { ZCTA5CE20: '90001' }),
        rectangle([2, 0, 3, 1], { ZCTA5CE20: '90002' }),
      ],
      utilities: [
        rectangle([0, 0, 1, 1], { Acronym: 'PG&E' }),
        rectangle([2, 0, 3, 1], { Acronym: 'SCE' }),
      ],
      ccas: [
        rectangle([2, 0, 3, 1], { Acronym: 'CPA', Utility: 'Clean Power Alliance', Type: 'CCA' }),
      ],
    });

    expect(result.candidates['90001'].suggestedAction).toBe('assign');
    expect(result.candidates['90001'].suggestedServiceAreaId).toBe('pge-only');
    expect(result.candidates['90002'].suggestedAction).toBe('assign');
    expect(result.candidates['90002'].suggestedServiceAreaId).toBe('sce-cpa-la');
  });

  it('flags material PG&E/SCE split ZIPs as multi-utility candidates', () => {
    const result = build({
      zctas: [rectangle([0, 0, 1, 1], { ZCTA5CE20: '90003' })],
      utilities: [
        rectangle([0, 0, 0.6, 1], { Acronym: 'PG&E' }),
        rectangle([0.4, 0, 1, 1], { Acronym: 'SCE' }),
      ],
      ccas: [],
    });

    const candidate = result.candidates['90003'];
    expect(candidate.utilityAreaPct).toEqual({ pge: 0.6, sce: 0.6, tdpud: 0, liberty: 0, sdge: 0 });
    expect(candidate).not.toHaveProperty('pgeAreaPct');
    expect(candidate).not.toHaveProperty('sceAreaPct');
    expect(candidate.flags.split_utility_zip).toBe(true);
    expect(candidate.suggestedAction).toBe('multiUtility');
    expect(candidate.suggestedMultiUtilityCandidates).toEqual(['pge-only', 'sce-only']);
  });

  it('flags multiple CCA overlaps inside one utility territory for review', () => {
    const result = build({
      zctas: [rectangle([0, 0, 1, 1], { ZCTA5CE20: '90004' })],
      utilities: [rectangle([0, 0, 1, 1], { Acronym: 'PG&E' })],
      ccas: [
        rectangle([0, 0, 0.65, 1], { Acronym: 'SJCE', Utility: 'San Jose Clean Energy', Type: 'CCA' }),
        rectangle([0.55, 0, 1, 1], { Acronym: 'Peninsula Clean Ener', Utility: 'Peninsula Clean Energy', Type: 'CCA' }),
      ],
    });

    const candidate = result.candidates['90004'];
    expect(candidate.flags.multiple_cca_overlap).toBe(true);
    expect(candidate.suggestedAction).toBe('review');
  });

  it('flags unsupported CCA polygons and suggests exclusion when rates are missing', () => {
    const result = build({
      zctas: [rectangle([0, 0, 1, 1], { ZCTA5CE20: '90005' })],
      utilities: [rectangle([0, 0, 1, 1], { Acronym: 'SCE' })],
      ccas: [
        rectangle([0, 0, 1, 1], { Acronym: 'AVCE', Utility: 'Apple Valley Choice Energy', Type: 'CCA' }),
      ],
    });

    const candidate = result.candidates['90005'];
    expect(candidate.flags.unsupported_cca_polygon).toBe(true);
    expect(candidate.flags.excluded_missing_cca_rates).toBe(true);
    expect(candidate.suggestedAction).toBe('exclude');
  });

  it('preserves matching reviews and marks changed-source reviews stale', () => {
    const base = build({
      zctas: [rectangle([0, 0, 1, 1], { ZCTA5CE20: '90006' })],
      utilities: [rectangle([0, 0, 1, 1], { Acronym: 'PG&E' })],
      ccas: [],
    });
    base.candidates['90006'].review = {
      status: 'assign',
      serviceAreaId: 'pge-only',
      multiUtilityCandidates: null,
      reason: 'fixture review',
      source: 'test',
      reviewDate: '2026-04-19',
      stale: false,
    };

    const preserved = build({
      zctas: [rectangle([0, 0, 1, 1], { ZCTA5CE20: '90006' })],
      utilities: [rectangle([0, 0, 1, 1], { Acronym: 'PG&E' })],
      ccas: [],
      existingCandidates: base,
    });
    expect(preserved.candidates['90006'].review.status).toBe('assign');
    expect(preserved.candidates['90006'].review.stale).toBe(false);

    const stale = build({
      zctas: [rectangle([0, 0, 1, 1], { ZCTA5CE20: '90006' })],
      utilities: [rectangle([0, 0, 1, 1], { Acronym: 'PG&E' })],
      ccas: [],
      hashes: { ...sourceHashes, 'census-zcta-2024': 'changed-hash' },
      existingCandidates: base,
    });
    expect(stale.candidates['90006'].review.status).toBe('assign');
    expect(stale.candidates['90006'].review.stale).toBe(true);
  });
});
