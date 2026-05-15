import { describe, expect, it } from 'vitest';
import { promoteReviewedCandidates } from './promote-territory-candidates.js';

const sourceHashes = {
  'cec-iou-pou': 'utility-hash',
  'cec-other-lse': 'cca-hash',
  'census-zcta-2024': 'zcta-hash',
};

const serviceAreas = {
  serviceAreas: {
    'pge-cpsf-sf': { utility: 'PG&E' },
    'pge-only': { utility: 'PG&E' },
    'sce-only': { utility: 'SCE' },
  },
};

const threeUtilityConfig = {
  pge: { id: 'pge', label: 'PG&E', verifiedKey: 'pge' },
  sce: { id: 'sce', label: 'SCE', verifiedKey: 'sce' },
  sdge: { id: 'sdge', label: 'SDG&E', verifiedKey: 'sdge' },
};

function candidate(review, overrides = {}) {
  return {
    sourceHashes,
    geometrySignature: 'geometry',
    review: {
      status: 'unreviewed',
      serviceAreaId: null,
      multiUtilityCandidates: null,
      reason: null,
      source: null,
      reviewDate: null,
      stale: false,
      ...review,
    },
    ...overrides,
  };
}

describe('reviewed territory candidate promotion', () => {
  it('promotes only reviewed, current candidates into verified-zips.json shape', () => {
    const overlayCandidates = {
      sourceHashes,
      candidates: {
        '90001': candidate({ status: 'assign', serviceAreaId: 'pge-cpsf-sf' }),
        '90002': candidate({ status: 'multiUtility', multiUtilityCandidates: ['sce-only', 'pge-only'] }),
        '90003': candidate({
          status: 'exclude',
          reason: 'Missing CCA rates',
          source: 'overlay review',
          reviewDate: '2026-04-19',
        }),
        '90004': candidate({ status: 'unreviewed' }),
        '90005': candidate({ status: 'assign', serviceAreaId: 'pge-only', stale: true }),
        '90006': candidate(
          { status: 'assign', serviceAreaId: 'pge-only' },
          { sourceHashes: { ...sourceHashes, 'census-zcta-2024': 'old-hash' } }
        ),
      },
    };

    const result = promoteReviewedCandidates({
      overlayCandidates,
      verifiedZips: {
        bootstrapFromRuntime: true,
        pge: { zips: {} },
        sce: { zips: {} },
        multiUtility: { zips: {} },
        excluded: { zips: {} },
      },
      serviceAreas,
    });

    expect(result.verifiedZips.bootstrapFromRuntime).toBe(true);
    expect(result.verifiedZips.pge.zips['90001']).toBe('pge-cpsf-sf');
    expect(result.verifiedZips.multiUtility.zips['90002']).toEqual(['pge-only', 'sce-only']);
    expect(result.verifiedZips.excluded.zips['90003']).toEqual({
      reason: 'Missing CCA rates',
      source: 'overlay review',
      reviewDate: '2026-04-19',
    });
    expect(result.verifiedZips.pge.zips['90005']).toBeUndefined();
    expect(result.verifiedZips.pge.zips['90006']).toBeUndefined();
    expect(result.stats.promotedCount).toBe(3);
    expect(result.stats.skippedCount).toBe(3);
  });

  it('promotes a reviewed third-utility service area through utility config', () => {
    const result = promoteReviewedCandidates({
      overlayCandidates: {
        sourceHashes,
        candidates: {
          '92101': candidate({ status: 'assign', serviceAreaId: 'sdge-sdcp-sd' }),
        },
      },
      verifiedZips: {
        pge: { zips: {} },
        sce: { zips: {} },
        sdge: { zips: {} },
        multiUtility: { zips: {} },
        excluded: { zips: {} },
      },
      serviceAreas: {
        serviceAreas: {
          'sdge-sdcp-sd': { utilityId: 'sdge', utility: 'SDG&E' },
        },
      },
      utilityConfig: threeUtilityConfig,
    });

    expect(result.verifiedZips.sdge.zips['92101']).toBe('sdge-sdcp-sd');
  });
});
