import { describe, expect, it } from 'vitest';
import { applyReviewQueue } from './apply-review-queue.js';

const SOURCE_HASHES = {
  'cec-iou-pou': 'utility-hash',
  'cec-other-lse': 'cca-hash',
  'census-zcta-2024': 'zcta-hash',
};

function baseCandidate(overrides = {}) {
  return {
    sourceHashes: SOURCE_HASHES,
    review: { status: 'unreviewed', serviceAreaId: null, multiUtilityCandidates: null, reason: null, source: null, reviewDate: null, stale: false },
    ...overrides,
  };
}

function overlayCandidates(entries) {
  return { sourceHashes: SOURCE_HASHES, candidates: Object.fromEntries(entries) };
}

function queue(entries) {
  return { queue: entries };
}

describe('applyReviewQueue', () => {
  it('applies assign decision and sets source to manual-review', () => {
    const candidates = overlayCandidates([['90220', baseCandidate()]]);
    const q = queue([{
      zip: '90220',
      decision: { action: 'assign', serviceAreaId: 'sce-only', multiUtilityCandidates: null, reason: 'Bundled utility, CPA below threshold' },
    }]);

    const { updatedCandidates, stats } = applyReviewQueue({ overlayCandidates: candidates, reviewQueue: q, reviewDate: '2026-05-04' });

    const review = updatedCandidates.candidates['90220'].review;
    expect(review.status).toBe('assign');
    expect(review.serviceAreaId).toBe('sce-only');
    expect(review.source).toBe('manual-review');
    expect(review.reviewDate).toBe('2026-05-04');
    expect(stats.applied).toBe(1);
    expect(stats.skipped).toBe(0);
  });

  it('applies multiUtility decision', () => {
    const candidates = overlayCandidates([['93117', baseCandidate()]]);
    const q = queue([{
      zip: '93117',
      decision: { action: 'multiUtility', serviceAreaId: null, multiUtilityCandidates: ['pge-3ce-sbco', 'sce-3ce-sb'], reason: 'Split territory' },
    }]);

    const { updatedCandidates, stats } = applyReviewQueue({ overlayCandidates: candidates, reviewQueue: q, reviewDate: '2026-05-04' });

    const review = updatedCandidates.candidates['93117'].review;
    expect(review.status).toBe('multiUtility');
    expect(review.multiUtilityCandidates).toEqual(['pge-3ce-sbco', 'sce-3ce-sb']);
    expect(stats.applied).toBe(1);
  });

  it('applies no-coverage decision', () => {
    const candidates = overlayCandidates([['90032', baseCandidate()]]);
    const q = queue([{
      zip: '90032',
      decision: { action: 'no-coverage', serviceAreaId: null, multiUtilityCandidates: null, reason: 'Below utility threshold' },
    }]);

    const { updatedCandidates, stats } = applyReviewQueue({ overlayCandidates: candidates, reviewQueue: q, reviewDate: '2026-05-04' });

    expect(updatedCandidates.candidates['90032'].review.status).toBe('no-coverage');
    expect(stats.applied).toBe(1);
  });

  it('skips entries with null action', () => {
    const candidates = overlayCandidates([['90002', baseCandidate()]]);
    const q = queue([{
      zip: '90002',
      decision: { action: null, serviceAreaId: null, multiUtilityCandidates: null, reason: null },
    }]);

    const { stats, skipped } = applyReviewQueue({ overlayCandidates: candidates, reviewQueue: q });

    expect(stats.applied).toBe(0);
    expect(stats.skipped).toBe(1);
    expect(skipped[0].zip).toBe('90002');
  });

  it('skips entries with invalid action', () => {
    const candidates = overlayCandidates([['90002', baseCandidate()]]);
    const q = queue([{
      zip: '90002',
      decision: { action: 'unknown-action', serviceAreaId: null, multiUtilityCandidates: null, reason: null },
    }]);

    const { stats } = applyReviewQueue({ overlayCandidates: candidates, reviewQueue: q });

    expect(stats.applied).toBe(0);
    expect(stats.skipped).toBe(1);
  });

  it('skips entries whose ZIP is not in overlay candidates', () => {
    const candidates = overlayCandidates([]);
    const q = queue([{
      zip: '99999',
      decision: { action: 'no-coverage', serviceAreaId: null, multiUtilityCandidates: null, reason: 'test' },
    }]);

    const { stats, skipped } = applyReviewQueue({ overlayCandidates: candidates, reviewQueue: q });

    expect(stats.applied).toBe(0);
    expect(stats.skipped).toBe(1);
    expect(skipped[0].reason).toMatch(/not found/);
  });

  it('does not mutate the original overlay candidates', () => {
    const candidates = overlayCandidates([['90220', baseCandidate()]]);
    const q = queue([{
      zip: '90220',
      decision: { action: 'assign', serviceAreaId: 'sce-only', multiUtilityCandidates: null, reason: 'test' },
    }]);

    const originalStatus = candidates.candidates['90220'].review.status;
    applyReviewQueue({ overlayCandidates: candidates, reviewQueue: q });
    expect(candidates.candidates['90220'].review.status).toBe(originalStatus);
  });

  it('handles an empty queue', () => {
    const candidates = overlayCandidates([['90001', baseCandidate()]]);
    const { stats } = applyReviewQueue({ overlayCandidates: candidates, reviewQueue: queue([]) });

    expect(stats.applied).toBe(0);
    expect(stats.skipped).toBe(0);
  });
});
