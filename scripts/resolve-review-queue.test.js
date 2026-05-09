import { describe, expect, it } from 'vitest';
import { CITY_CCA_RULES, resolveByCity, resolveQueueEntry, resolveReviewQueue } from './resolve-review-queue.js';

// ── CITY_CCA_RULES sanity checks ─────────────────────────────────────────────

describe('CITY_CCA_RULES', () => {
  it('contains CPA rule for los angeles', () => {
    const rule = CITY_CCA_RULES.get('los angeles');
    expect(rule?.serviceAreaId).toBe('sce-cpa-la');
    expect(rule?.confidence).toBe('high');
  });

  it('contains SJCE rule for san jose', () => {
    const rule = CITY_CCA_RULES.get('san jose');
    expect(rule?.serviceAreaId).toBe('pge-sjce-scc');
  });

  it('contains high-confidence rule for calistoga', () => {
    const rule = CITY_CCA_RULES.get('calistoga');
    expect(rule?.serviceAreaId).toBe('pge-mce-mar');
    expect(rule?.confidence).toBe('high');
  });

  it('contains high-confidence rule for carpinteria', () => {
    const rule = CITY_CCA_RULES.get('carpinteria');
    expect(rule?.serviceAreaId).toBe('sce-3ce-sb');
    expect(rule?.confidence).toBe('high');
  });
});

// ── resolveByCity ─────────────────────────────────────────────────────────────

describe('resolveByCity', () => {
  it('returns CPA rule for 90002 (Los Angeles)', () => {
    const rule = resolveByCity('90002');
    expect(rule?.serviceAreaId).toBe('sce-cpa-la');
  });

  it('returns SJCE rule for 95119 (San Jose)', () => {
    const rule = resolveByCity('95119');
    expect(rule?.serviceAreaId).toBe('pge-sjce-scc');
  });

  it('returns Ava rule for 94707 (Berkeley)', () => {
    const rule = resolveByCity('94707');
    expect(rule?.serviceAreaId).toBe('pge-ava-eba');
  });

  it('returns null for a ZIP with no city rule (remote PGE area)', () => {
    const rule = resolveByCity('96009'); // Bieber — no CCA
    expect(rule).toBeNull();
  });

  it('returns null for an unrecognized ZIP', () => {
    const rule = resolveByCity('00000');
    expect(rule).toBeNull();
  });
});

// ── resolveQueueEntry ─────────────────────────────────────────────────────────

function makeEntry(overrides = {}) {
  return {
    zip: '90002',
    dominantUtility: null,
    utilityPct: { pge: 0, sce: 0.34 },
    flags: { unsupported_cca_polygon: true },
    ccaIntersections: [],
    suggestedReason: 'test',
    autoSuggest: { action: 'no-coverage', confidence: 'low', serviceAreaId: null, multiUtilityCandidates: null, reason: 'test' },
    decision: { action: 'no-coverage', serviceAreaId: null, multiUtilityCandidates: null, reason: 'test' },
    ...overrides,
  };
}

describe('resolveQueueEntry — Path A (null action)', () => {
  it('assigns high-confidence city rule when action is null', () => {
    // 94550 Livermore: Ava vs SVCE — city rule says Ava
    const entry = makeEntry({
      zip: '94550',
      dominantUtility: 'PG&E',
      utilityPct: { pge: 1, sce: 0 },
      flags: { multiple_cca_overlap: true },
      ccaIntersections: [
        { acronym: 'Ava', percentOfZcta: 0.61, rateBacked: true, serviceAreaId: 'pge-ava-eba' },
        { acronym: 'SVCE', percentOfZcta: 0.39, rateBacked: true, serviceAreaId: 'pge-svce-sv' },
      ],
      autoSuggest: { action: null, confidence: 'low', serviceAreaId: null, multiUtilityCandidates: null, reason: 'Multiple rate-backed CCAs overlap' },
      decision: { action: null, serviceAreaId: null, multiUtilityCandidates: null, reason: 'Multiple rate-backed CCAs overlap' },
    });

    const result = resolveQueueEntry(entry);
    expect(result.decision.action).toBe('assign');
    expect(result.decision.serviceAreaId).toBe('pge-ava-eba');
    expect(result._cityResolution?.path).toBe('A');
  });

  it('assigns SJCE for San Jose ZIPs even when SVCE polygon dominates', () => {
    // 95120 San Jose: SVCE 65% / SJCE 37% — city name resolves to SJCE
    const entry = makeEntry({
      zip: '95120',
      dominantUtility: 'PG&E',
      utilityPct: { pge: 1, sce: 0 },
      flags: { multiple_cca_overlap: true },
      ccaIntersections: [
        { acronym: 'SVCE', percentOfZcta: 0.65, rateBacked: true, serviceAreaId: 'pge-svce-sv' },
        { acronym: 'SJCE', percentOfZcta: 0.37, rateBacked: true, serviceAreaId: 'pge-sjce-scc' },
      ],
      autoSuggest: { action: null, confidence: 'low', serviceAreaId: null, multiUtilityCandidates: null, reason: 'Multiple rate-backed CCAs overlap' },
      decision: { action: null, serviceAreaId: null, multiUtilityCandidates: null, reason: 'Multiple rate-backed CCAs overlap' },
    });

    const result = resolveQueueEntry(entry);
    expect(result.decision.action).toBe('assign');
    expect(result.decision.serviceAreaId).toBe('pge-sjce-scc');
    expect(result._cityResolution?.confidence).toBe('high');
  });

  it('resolves calistoga (SCP vs MCE boundary) to pge-mce-mar with high confidence', () => {
    const entry = makeEntry({
      zip: '94515',
      dominantUtility: 'PG&E',
      utilityPct: { pge: 1, sce: 0 },
      flags: { multiple_cca_overlap: true },
      ccaIntersections: [
        { acronym: 'SCP', percentOfZcta: 0.50, rateBacked: true, serviceAreaId: 'pge-scp-son' },
        { acronym: 'MCE', percentOfZcta: 0.49, rateBacked: true, serviceAreaId: 'pge-mce-mar' },
      ],
      autoSuggest: { action: null, confidence: 'low', serviceAreaId: null, multiUtilityCandidates: null, reason: 'Multiple rate-backed CCAs overlap' },
      decision: { action: null, serviceAreaId: null, multiUtilityCandidates: null, reason: 'Multiple rate-backed CCAs overlap' },
    });

    const result = resolveQueueEntry(entry);
    expect(result.decision.action).toBe('assign');
    expect(result.decision.serviceAreaId).toBe('pge-mce-mar');
    expect(result._cityResolution?.confidence).toBe('high');
  });

  it('leaves null-action entry unchanged when city has no rule', () => {
    const entry = makeEntry({
      zip: '96009', // Bieber — no CCA
      autoSuggest: { action: null, confidence: 'low', serviceAreaId: null, multiUtilityCandidates: null, reason: 'test' },
      decision: { action: null, serviceAreaId: null, multiUtilityCandidates: null, reason: 'test' },
    });

    const result = resolveQueueEntry(entry);
    expect(result.decision.action).toBeNull();
    expect(result._cityResolution).toBeUndefined();
  });
});

describe('resolveQueueEntry — Path B (bundled → CCA upgrade)', () => {
  it('upgrades sce-only to sce-cpa-la when city confirms top CCA', () => {
    // 90220 Compton: decided=sce-only, topCCA=CPA(sce-cpa-la,28%)
    const entry = makeEntry({
      zip: '90220',
      dominantUtility: 'SCE',
      utilityPct: { pge: 0, sce: 1 },
      flags: {},
      ccaIntersections: [{ acronym: 'CPA', percentOfZcta: 0.28, rateBacked: true, serviceAreaId: 'sce-cpa-la' }],
      autoSuggest: { action: 'assign', confidence: 'medium', serviceAreaId: 'sce-only', multiUtilityCandidates: null, reason: 'top CCA below threshold' },
      decision: { action: 'assign', serviceAreaId: 'sce-only', multiUtilityCandidates: null, reason: 'top CCA below threshold' },
    });

    const result = resolveQueueEntry(entry);
    expect(result.decision.serviceAreaId).toBe('sce-cpa-la');
    expect(result._cityResolution?.path).toBe('B');
  });

  it('does not upgrade when city rule differs from top CCA', () => {
    // A hypothetical ZIP in Santa Clara city where topCCA is SJCE (not SVCE)
    const entry = makeEntry({
      zip: '95050',
      dominantUtility: 'PG&E',
      utilityPct: { pge: 1, sce: 0 },
      flags: {},
      ccaIntersections: [{ acronym: 'SJCE', percentOfZcta: 0.02, rateBacked: true, serviceAreaId: 'pge-sjce-scc' }],
      autoSuggest: { action: 'assign', confidence: 'medium', serviceAreaId: 'pge-only', multiUtilityCandidates: null, reason: 'top CCA below threshold' },
      decision: { action: 'assign', serviceAreaId: 'pge-only', multiUtilityCandidates: null, reason: 'top CCA below threshold' },
    });

    // City=Santa Clara → pge-svce-sv, but topCCA=pge-sjce-scc → conflict → no change
    const result = resolveQueueEntry(entry);
    expect(result.decision.serviceAreaId).toBe('pge-only');
    expect(result._cityResolution).toBeUndefined();
  });

  it('does not upgrade when no city rule exists', () => {
    const entry = makeEntry({
      zip: '93210', // Coalinga — no CCA rule
      dominantUtility: 'PG&E',
      utilityPct: { pge: 1, sce: 0 },
      flags: {},
      ccaIntersections: [{ acronym: 'CCCE', percentOfZcta: 0.10, rateBacked: true, serviceAreaId: 'pge-3ce-sbco' }],
      autoSuggest: { action: 'assign', confidence: 'medium', serviceAreaId: 'pge-only', multiUtilityCandidates: null, reason: 'top CCA below threshold' },
      decision: { action: 'assign', serviceAreaId: 'pge-only', multiUtilityCandidates: null, reason: 'top CCA below threshold' },
    });

    const result = resolveQueueEntry(entry);
    expect(result.decision.serviceAreaId).toBe('pge-only');
    expect(result._cityResolution).toBeUndefined();
  });

  it('does not touch entries already assigned a specific CCA', () => {
    // Lancaster entries already have sce-cpa-la — no re-processing needed
    const entry = makeEntry({
      zip: '93534',
      dominantUtility: 'SCE',
      utilityPct: { pge: 0, sce: 1 },
      flags: { multiple_cca_overlap: true, unsupported_cca_polygon: true },
      ccaIntersections: [{ acronym: 'CPA', percentOfZcta: 1, rateBacked: true, serviceAreaId: 'sce-cpa-la' }],
      autoSuggest: { action: 'assign', confidence: 'medium', serviceAreaId: 'sce-cpa-la', multiUtilityCandidates: null, reason: 'only rate-backed CCA' },
      decision: { action: 'assign', serviceAreaId: 'sce-cpa-la', multiUtilityCandidates: null, reason: 'only rate-backed CCA' },
    });

    const result = resolveQueueEntry(entry);
    // decision.serviceAreaId is not bundled → Path B doesn't apply → unchanged
    expect(result.decision.serviceAreaId).toBe('sce-cpa-la');
    expect(result._cityResolution).toBeUndefined();
  });
});

describe('resolveQueueEntry — Path C (no-coverage low → assign)', () => {
  it('upgrades LA ZIP from no-coverage to sce-cpa-la', () => {
    // 90043 Los Angeles: sce=31%, no-coverage/low
    const entry = makeEntry({
      zip: '90043',
      autoSuggest: { action: 'no-coverage', confidence: 'low', serviceAreaId: null, multiUtilityCandidates: null, reason: 'Utility coverage 31%' },
      decision: { action: 'no-coverage', serviceAreaId: null, multiUtilityCandidates: null, reason: 'Utility coverage 31%' },
    });

    const result = resolveQueueEntry(entry);
    expect(result.decision.action).toBe('assign');
    expect(result.decision.serviceAreaId).toBe('sce-cpa-la');
    expect(result._cityResolution?.path).toBe('C');
  });

  it('upgrades San Francisco ZIP from no-coverage to pge-cpsf-sf', () => {
    const entry = makeEntry({
      zip: '94105',
      utilityPct: { pge: 0.47, sce: 0 },
      ccaIntersections: [{ acronym: 'CPSF', percentOfZcta: 0.47, rateBacked: false, serviceAreaId: null }],
      autoSuggest: { action: 'no-coverage', confidence: 'low', serviceAreaId: null, multiUtilityCandidates: null, reason: 'Utility coverage 47%' },
      decision: { action: 'no-coverage', serviceAreaId: null, multiUtilityCandidates: null, reason: 'Utility coverage 47%' },
    });

    const result = resolveQueueEntry(entry);
    expect(result.decision.action).toBe('assign');
    expect(result.decision.serviceAreaId).toBe('pge-cpsf-sf');
  });

  it('does not upgrade no-coverage/low entries when city rule is absent', () => {
    // Bieber (Lassen County) — no CCA rule, no upgrade
    const entry = makeEntry({
      zip: '96009',
      autoSuggest: { action: 'no-coverage', confidence: 'low', serviceAreaId: null, multiUtilityCandidates: null, reason: 'test' },
      decision: { action: 'no-coverage', serviceAreaId: null, multiUtilityCandidates: null, reason: 'test' },
    });

    const result = resolveQueueEntry(entry);
    expect(result.decision.action).toBe('no-coverage');
    expect(result._cityResolution).toBeUndefined();
  });

  it('does not upgrade remote areas with no CCA rule', () => {
    const entry = makeEntry({
      zip: '96009', // Bieber — no CCA
      autoSuggest: { action: 'no-coverage', confidence: 'low', serviceAreaId: null, multiUtilityCandidates: null, reason: 'test' },
      decision: { action: 'no-coverage', serviceAreaId: null, multiUtilityCandidates: null, reason: 'test' },
    });

    const result = resolveQueueEntry(entry);
    expect(result.decision.action).toBe('no-coverage');
    expect(result._cityResolution).toBeUndefined();
  });

  it('does not touch high-confidence no-coverage entries', () => {
    // Avalon (Catalina Island): 90704, no CCA. Should stay no-coverage.
    const entry = makeEntry({
      zip: '90704',
      utilityPct: { pge: 0, sce: 0.25 },
      autoSuggest: { action: 'no-coverage', confidence: 'high', serviceAreaId: null, multiUtilityCandidates: null, reason: 'test' },
      decision: { action: 'no-coverage', serviceAreaId: null, multiUtilityCandidates: null, reason: 'test' },
    });

    const result = resolveQueueEntry(entry);
    expect(result.decision.action).toBe('no-coverage');
    expect(result._cityResolution).toBeUndefined();
  });
});

// ── resolveReviewQueue stats ──────────────────────────────────────────────────

describe('resolveReviewQueue', () => {
  it('counts resolved and unchanged entries', () => {
    const queue = {
      queue: [
        // Resolved via Path C
        makeEntry({
          zip: '90002',
          autoSuggest: { action: 'no-coverage', confidence: 'low', serviceAreaId: null, multiUtilityCandidates: null, reason: 'test' },
          decision: { action: 'no-coverage', serviceAreaId: null, multiUtilityCandidates: null, reason: 'test' },
        }),
        // Unchanged (high confidence no-coverage, Bieber has no rule)
        makeEntry({
          zip: '96009',
          autoSuggest: { action: 'no-coverage', confidence: 'high', serviceAreaId: null, multiUtilityCandidates: null, reason: 'test' },
          decision: { action: 'no-coverage', serviceAreaId: null, multiUtilityCandidates: null, reason: 'test' },
        }),
      ],
    };

    const { stats } = resolveReviewQueue({ reviewQueue: queue });
    expect(stats.total).toBe(2);
    expect(stats.resolved).toBe(1);
    expect(stats.unchanged).toBe(1);
    expect(stats.byPath.C).toBe(1);
  });

  it('tracks remaining null-action entries', () => {
    const queue = {
      queue: [
        makeEntry({
          zip: '96009',
          autoSuggest: { action: null, confidence: 'low', serviceAreaId: null, multiUtilityCandidates: null, reason: 'test' },
          decision: { action: null, serviceAreaId: null, multiUtilityCandidates: null, reason: 'test' },
        }),
      ],
    };

    const { stats } = resolveReviewQueue({ reviewQueue: queue });
    expect(stats.remainingNullAction).toContain('96009');
  });

  it('tracks medium-confidence decisions when present', () => {
    // Inject a synthetic medium-confidence city to verify the tracking path.
    // Real queue currently has no medium-confidence entries (Calistoga and Carpinteria are now high).
    const queue = {
      queue: [
        makeEntry({
          zip: '94515', // Calistoga — now high-confidence
          dominantUtility: 'PG&E',
          utilityPct: { pge: 1, sce: 0 },
          flags: { multiple_cca_overlap: true },
          ccaIntersections: [
            { acronym: 'SCP', percentOfZcta: 0.50, rateBacked: true, serviceAreaId: 'pge-scp-son' },
            { acronym: 'MCE', percentOfZcta: 0.49, rateBacked: true, serviceAreaId: 'pge-mce-mar' },
          ],
          autoSuggest: { action: null, confidence: 'low', serviceAreaId: null, multiUtilityCandidates: null, reason: 'Multiple rate-backed CCAs overlap' },
          decision: { action: null, serviceAreaId: null, multiUtilityCandidates: null, reason: 'Multiple rate-backed CCAs overlap' },
        }),
      ],
    };

    const { stats } = resolveReviewQueue({ reviewQueue: queue });
    expect(stats.resolved).toBe(1);
    // Calistoga is high confidence — no medium-confidence entries expected
    expect(stats.mediumConfidence).toHaveLength(0);
  });

  it('does not mutate the input queue', () => {
    const entry = makeEntry({
      zip: '90002',
      autoSuggest: { action: 'no-coverage', confidence: 'low', serviceAreaId: null, multiUtilityCandidates: null, reason: 'test' },
      decision: { action: 'no-coverage', serviceAreaId: null, multiUtilityCandidates: null, reason: 'test' },
    });
    const queue = { queue: [entry] };
    const originalAction = queue.queue[0].decision.action;

    resolveReviewQueue({ reviewQueue: queue });

    expect(queue.queue[0].decision.action).toBe(originalAction);
  });
});
