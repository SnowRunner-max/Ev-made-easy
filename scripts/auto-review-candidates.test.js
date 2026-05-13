import { describe, expect, it } from 'vitest';
import { autoReviewCandidates, computeAutoSuggest } from './auto-review-candidates.js';

const SOURCE_HASHES = {
  'cec-iou-pou': 'utility-hash',
  'cec-other-lse': 'cca-hash',
  'census-zcta-2024': 'zcta-hash',
};

function candidate(overrides = {}) {
  return {
    sourceHashes: SOURCE_HASHES,
    geometrySignature: 'sig',
    dominantUtility: null,
    utilityAreaPct: { pge: 0, sce: 0 },
    flags: {
      split_utility_zip: false,
      multiple_cca_overlap: false,
      unsupported_cca_polygon: false,
      excluded_missing_cca_rates: false,
    },
    ccaIntersections: [],
    suggestedAction: 'no-coverage',
    suggestedServiceAreaId: null,
    suggestedMultiUtilityCandidates: null,
    suggestedReason: 'No PG&E or SCE utility polygon materially intersects this ZCTA.',
    review: { status: 'unreviewed', serviceAreaId: null, multiUtilityCandidates: null, reason: null, source: null, reviewDate: null, stale: false },
    ...overrides,
  };
}

function overlayCandidates(entries) {
  return { sourceHashes: SOURCE_HASHES, candidates: Object.fromEntries(entries) };
}

describe('autoReviewCandidates', () => {
  it('auto-approves no-coverage candidates', () => {
    const input = overlayCandidates([['90001', candidate({ suggestedAction: 'no-coverage' })]]);
    const { updatedCandidates, stats } = autoReviewCandidates({ input, overlayCandidates: input, reviewDate: '2026-05-04' });

    const review = updatedCandidates.candidates['90001'].review;
    expect(review.status).toBe('no-coverage');
    expect(review.source).toBe('auto-review:no-coverage');
    expect(review.reviewDate).toBe('2026-05-04');
    expect(stats.autoApproved).toBe(1);
    expect(stats.queued).toBe(0);
  });

  it('auto-approves exclude candidates', () => {
    const input = overlayCandidates([[
      '90002',
      candidate({
        suggestedAction: 'exclude',
        suggestedReason: 'CEC CCA acronym is not mapped to a rate-backed service area.',
        flags: { split_utility_zip: false, multiple_cca_overlap: false, unsupported_cca_polygon: false, excluded_missing_cca_rates: true },
      }),
    ]]);
    const { updatedCandidates, stats } = autoReviewCandidates({ overlayCandidates: input, reviewDate: '2026-05-04' });

    const review = updatedCandidates.candidates['90002'].review;
    expect(review.status).toBe('exclude');
    expect(review.source).toBe('auto-review:missing-cca-rates');
    expect(review.reason).toBe('CEC CCA acronym is not mapped to a rate-backed service area.');
    expect(stats.autoApproved).toBe(1);
    expect(stats.byAction.exclude).toBe(1);
  });

  it('auto-approves multiUtility candidates', () => {
    const input = overlayCandidates([[
      '93117',
      candidate({
        suggestedAction: 'multiUtility',
        suggestedMultiUtilityCandidates: ['pge-3ce-sbco', 'sce-3ce-sb'],
        suggestedReason: 'Both PG&E and SCE materially intersect this ZCTA.',
        flags: { split_utility_zip: true, multiple_cca_overlap: false, unsupported_cca_polygon: false, excluded_missing_cca_rates: false },
      }),
    ]]);
    const { updatedCandidates, stats } = autoReviewCandidates({ overlayCandidates: input, reviewDate: '2026-05-04' });

    const review = updatedCandidates.candidates['93117'].review;
    expect(review.status).toBe('multiUtility');
    expect(review.multiUtilityCandidates).toEqual(['pge-3ce-sbco', 'sce-3ce-sb']);
    expect(review.source).toBe('auto-review:split-utility');
    expect(stats.byAction.multiUtility).toBe(1);
  });

  it('auto-approves assign candidates without flags', () => {
    const input = overlayCandidates([[
      '94102',
      candidate({
        dominantUtility: 'PG&E',
        utilityAreaPct: { pge: 1.0, sce: 0 },
        suggestedAction: 'assign',
        suggestedServiceAreaId: 'pge-cpsf-sf',
        suggestedReason: 'Dominant CCA polygon is mapped to a rate-backed service area.',
      }),
    ]]);
    const { updatedCandidates, stats } = autoReviewCandidates({ overlayCandidates: input, reviewDate: '2026-05-04' });

    const review = updatedCandidates.candidates['94102'].review;
    expect(review.status).toBe('assign');
    expect(review.serviceAreaId).toBe('pge-cpsf-sf');
    expect(review.source).toBe('auto-review:dominant-geometry');
    expect(stats.byAction.assign).toBe(1);
  });

  it('auto-approves assign candidates with only unsupported_cca_polygon flag', () => {
    const input = overlayCandidates([[
      '90601',
      candidate({
        dominantUtility: 'SCE',
        utilityAreaPct: { pge: 0, sce: 1.0 },
        suggestedAction: 'assign',
        suggestedServiceAreaId: 'sce-cpa-la',
        suggestedReason: 'Dominant CCA polygon is mapped to a rate-backed service area.',
        flags: { split_utility_zip: false, multiple_cca_overlap: false, unsupported_cca_polygon: true, excluded_missing_cca_rates: false },
      }),
    ]]);
    const { updatedCandidates, stats } = autoReviewCandidates({ overlayCandidates: input, reviewDate: '2026-05-04' });

    expect(updatedCandidates.candidates['90601'].review.status).toBe('assign');
    expect(stats.autoApproved).toBe(1);
  });

  it('queues review-action candidates', () => {
    const input = overlayCandidates([[
      '90220',
      candidate({
        dominantUtility: 'SCE',
        utilityAreaPct: { pge: 0, sce: 1.0 },
        suggestedAction: 'review',
        suggestedReason: 'Top CCA polygon does not reach the dominant-area threshold.',
        ccaIntersections: [{ acronym: 'CPA', percentOfZcta: 0.28, rateBacked: true, serviceAreaId: 'sce-cpa-la' }],
      }),
    ]]);
    const { updatedCandidates, reviewQueue, stats } = autoReviewCandidates({ overlayCandidates: input, reviewDate: '2026-05-04' });

    expect(updatedCandidates.candidates['90220'].review.status).toBe('unreviewed');
    expect(reviewQueue.queue).toHaveLength(1);
    expect(reviewQueue.queue[0].zip).toBe('90220');
    expect(reviewQueue.queue[0].utilityPct).toEqual({ pge: 0, sce: 1 });
    expect(stats.queued).toBe(1);
    expect(stats.autoApproved).toBe(0);
  });

  it('skips candidates with existing non-stale reviews', () => {
    const input = overlayCandidates([[
      '90001',
      candidate({
        review: { status: 'assign', serviceAreaId: 'sce-cpa-la', multiUtilityCandidates: null, reason: 'manual', source: 'human', reviewDate: '2026-01-01', stale: false },
      }),
    ]]);
    const { stats } = autoReviewCandidates({ overlayCandidates: input, reviewDate: '2026-05-04' });

    expect(stats.skipped).toBe(1);
    expect(stats.autoApproved).toBe(0);
  });

  it('re-reviews stale candidates', () => {
    const input = overlayCandidates([[
      '90001',
      candidate({
        suggestedAction: 'no-coverage',
        review: { status: 'assign', serviceAreaId: 'sce-cpa-la', multiUtilityCandidates: null, reason: 'old', source: 'human', reviewDate: '2025-01-01', stale: true },
      }),
    ]]);
    const { updatedCandidates, stats } = autoReviewCandidates({ overlayCandidates: input, reviewDate: '2026-05-04' });

    expect(updatedCandidates.candidates['90001'].review.status).toBe('no-coverage');
    expect(stats.autoApproved).toBe(1);
    expect(stats.skipped).toBe(0);
  });

  it('counts stats correctly across mixed candidates', () => {
    const input = overlayCandidates([
      ['90001', candidate({ suggestedAction: 'no-coverage' })],
      ['90002', candidate({ suggestedAction: 'no-coverage' })],
      ['90003', candidate({ dominantUtility: 'SCE', utilityAreaPct: { pge: 0, sce: 1.0 }, suggestedAction: 'assign', suggestedServiceAreaId: 'sce-only', suggestedReason: 'Direct SCE.' })],
      ['90004', candidate({ dominantUtility: 'SCE', utilityAreaPct: { pge: 0, sce: 1.0 }, suggestedAction: 'review', suggestedReason: 'Top CCA polygon does not reach the dominant-area threshold.', ccaIntersections: [] })],
    ]);
    const { stats } = autoReviewCandidates({ overlayCandidates: input, reviewDate: '2026-05-04' });

    expect(stats.total).toBe(4);
    expect(stats.autoApproved).toBe(3);
    expect(stats.queued).toBe(1);
    expect(stats.byAction['no-coverage']).toBe(2);
    expect(stats.byAction.assign).toBe(1);
  });
});

describe('computeAutoSuggest', () => {
  it('suggests no-coverage with high confidence when utility coverage is very low', () => {
    const result = computeAutoSuggest({
      dominantUtility: null,
      utilityAreaPct: { pge: 0.05, sce: 0.10 },
      flags: { split_utility_zip: false, multiple_cca_overlap: false, unsupported_cca_polygon: false, excluded_missing_cca_rates: false },
      ccaIntersections: [],
    });
    expect(result.action).toBe('no-coverage');
    expect(result.confidence).toBe('high');
  });

  it('uses dynamic utilityAreaPct before legacy PG&E/SCE percent fields', () => {
    const result = computeAutoSuggest({
      dominantUtility: null,
      utilityAreaPct: { pge: 0.01, sce: 0.12 },
      pgeAreaPct: 1.0,
      sceAreaPct: 1.0,
      flags: { split_utility_zip: false, multiple_cca_overlap: false, unsupported_cca_polygon: false, excluded_missing_cca_rates: false },
      ccaIntersections: [],
    });
    expect(result.action).toBe('no-coverage');
    expect(result.confidence).toBe('high');
    expect(result.reason).toContain('12%');
  });

  it('suggests no-coverage with low confidence when utility coverage is moderate but below threshold', () => {
    const result = computeAutoSuggest({
      dominantUtility: null,
      utilityAreaPct: { pge: 0.0, sce: 0.46 },
      flags: { split_utility_zip: false, multiple_cca_overlap: false, unsupported_cca_polygon: false, excluded_missing_cca_rates: false },
      ccaIntersections: [],
    });
    expect(result.action).toBe('no-coverage');
    expect(result.confidence).toBe('low');
  });

  it('suggests bundled utility with high confidence when CCA is unsupported and no multi-CCA overlap', () => {
    const result = computeAutoSuggest({
      dominantUtility: 'SCE',
      utilityAreaPct: { pge: 0.0, sce: 1.0 },
      flags: { split_utility_zip: false, multiple_cca_overlap: false, unsupported_cca_polygon: true, excluded_missing_cca_rates: false },
      ccaIntersections: [{ acronym: 'AVCE', percentOfZcta: 0.80, rateBacked: false, serviceAreaId: null }],
    });
    expect(result.action).toBe('assign');
    expect(result.serviceAreaId).toBe('sce-only');
    expect(result.confidence).toBe('high');
  });

  it('suggests bundled utility with medium confidence when top CCA is rate-backed but below threshold', () => {
    const result = computeAutoSuggest({
      dominantUtility: 'SCE',
      utilityAreaPct: { pge: 0.0, sce: 1.0 },
      flags: { split_utility_zip: false, multiple_cca_overlap: false, unsupported_cca_polygon: false, excluded_missing_cca_rates: false },
      ccaIntersections: [{ acronym: 'CPA', percentOfZcta: 0.28, rateBacked: true, serviceAreaId: 'sce-cpa-la' }],
    });
    expect(result.action).toBe('assign');
    expect(result.serviceAreaId).toBe('sce-only');
    expect(result.confidence).toBe('medium');
    expect(result.reason).toMatch(/CPA/);
    expect(result.reason).toMatch(/28%/);
  });

  it('suggests bundled utility for multiple CCAs with none rate-backed', () => {
    const result = computeAutoSuggest({
      dominantUtility: 'PG&E',
      utilityAreaPct: { pge: 1.0, sce: 0.0 },
      flags: { split_utility_zip: false, multiple_cca_overlap: true, unsupported_cca_polygon: true, excluded_missing_cca_rates: false },
      ccaIntersections: [
        { acronym: 'AVCE', percentOfZcta: 0.60, rateBacked: false, serviceAreaId: null },
        { acronym: 'DCE', percentOfZcta: 0.30, rateBacked: false, serviceAreaId: null },
      ],
    });
    expect(result.action).toBe('assign');
    expect(result.serviceAreaId).toBe('pge-only');
    expect(result.confidence).toBe('medium');
  });

  it('suggests the single rate-backed CCA when multiple CCAs overlap but only one has rates', () => {
    const result = computeAutoSuggest({
      dominantUtility: 'SCE',
      utilityAreaPct: { pge: 0.0, sce: 1.0 },
      flags: { split_utility_zip: false, multiple_cca_overlap: true, unsupported_cca_polygon: true, excluded_missing_cca_rates: false },
      ccaIntersections: [
        { acronym: 'CPA', percentOfZcta: 0.55, rateBacked: true, serviceAreaId: 'sce-cpa-la' },
        { acronym: 'AVCE', percentOfZcta: 0.25, rateBacked: false, serviceAreaId: null },
      ],
    });
    expect(result.action).toBe('assign');
    expect(result.serviceAreaId).toBe('sce-cpa-la');
    expect(result.confidence).toBe('medium');
  });

  it('returns null action when multiple rate-backed CCAs overlap', () => {
    const result = computeAutoSuggest({
      dominantUtility: 'SCE',
      utilityAreaPct: { pge: 0.0, sce: 1.0 },
      flags: { split_utility_zip: false, multiple_cca_overlap: true, unsupported_cca_polygon: false, excluded_missing_cca_rates: false },
      ccaIntersections: [
        { acronym: 'CPA', percentOfZcta: 0.55, rateBacked: true, serviceAreaId: 'sce-cpa-la' },
        { acronym: 'SBCE', percentOfZcta: 0.30, rateBacked: true, serviceAreaId: 'sce-sbce-sb' },
      ],
    });
    expect(result.action).toBeNull();
    expect(result.confidence).toBe('low');
    expect(result.reason).toMatch(/CPA/);
    expect(result.reason).toMatch(/SBCE/);
  });
});
