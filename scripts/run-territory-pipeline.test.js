import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./pin-zcta.js');
vi.mock('./validate-sources.js');
vi.mock('./overlay-territory.js');
vi.mock('./auto-review-candidates.js');
vi.mock('./resolve-review-queue.js');
vi.mock('./apply-review-queue.js');
vi.mock('./promote-territory-candidates.js');
vi.mock('./build-territory.js');
vi.mock('./validate-territory.js');

import { pinZctaSnapshot } from './pin-zcta.js';
import { validateSources } from './validate-sources.js';
import { writeOverlayCandidates } from './overlay-territory.js';
import { autoReviewCandidatesFromFiles } from './auto-review-candidates.js';
import { resolveReviewQueueFromFiles } from './resolve-review-queue.js';
import { applyReviewQueueFromFiles } from './apply-review-queue.js';
import { promoteReviewedCandidatesFromFiles } from './promote-territory-candidates.js';
import { buildTerritoryFromFiles } from './build-territory.js';
import { validateTerritoryFromFiles } from './validate-territory.js';
import { runTerritoryPipeline } from './run-territory-pipeline.js';

const DEFAULT_STATS = { pgeZipCount: 100, sceZipCount: 200, multiUtilityZipCount: 10, serviceAreaCount: 20 };
const EMPTY_RESOLVE_STATS = { remainingNullAction: [], total: 0, resolved: 0, unchanged: 0, byPath: {}, byServiceArea: {}, mediumConfidence: [] };

beforeEach(() => {
  vi.mocked(pinZctaSnapshot).mockResolvedValue(undefined);
  vi.mocked(validateSources).mockReturnValue({ ok: true, errors: [], stats: { rateFileCount: 2, territoryFileCount: 1 } });
  vi.mocked(writeOverlayCandidates).mockReturnValue(undefined);
  vi.mocked(autoReviewCandidatesFromFiles).mockReturnValue({ stats: {} });
  vi.mocked(resolveReviewQueueFromFiles).mockReturnValue({ updatedQueue: { queue: [] }, stats: EMPTY_RESOLVE_STATS });
  vi.mocked(applyReviewQueueFromFiles).mockReturnValue({});
  vi.mocked(promoteReviewedCandidatesFromFiles).mockReturnValue({});
  vi.mocked(buildTerritoryFromFiles).mockReturnValue({ ok: true, checkMode: false, driftedPaths: [], written: [], bootstrapped: false, warnings: [] });
  vi.mocked(validateTerritoryFromFiles).mockReturnValue({ ok: true, errors: [], warnings: [], stats: DEFAULT_STATS });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('runTerritoryPipeline', () => {
  it('runs all steps in order without flags', async () => {
    const callOrder = [];
    vi.mocked(validateSources).mockImplementation(() => { callOrder.push('validateSources'); return { ok: true, errors: [], stats: { rateFileCount: 1, territoryFileCount: 1 } }; });
    vi.mocked(writeOverlayCandidates).mockImplementation(() => { callOrder.push('writeOverlayCandidates'); });
    vi.mocked(autoReviewCandidatesFromFiles).mockImplementation(() => { callOrder.push('autoReviewCandidatesFromFiles'); return { stats: {} }; });
    vi.mocked(resolveReviewQueueFromFiles).mockImplementation(() => { callOrder.push('resolveReviewQueueFromFiles'); return { updatedQueue: { queue: [] }, stats: EMPTY_RESOLVE_STATS }; });
    vi.mocked(applyReviewQueueFromFiles).mockImplementation(() => { callOrder.push('applyReviewQueueFromFiles'); return {}; });
    vi.mocked(promoteReviewedCandidatesFromFiles).mockImplementation(() => { callOrder.push('promoteReviewedCandidatesFromFiles'); return {}; });
    vi.mocked(buildTerritoryFromFiles).mockImplementation(() => { callOrder.push('buildTerritoryFromFiles'); return { ok: true, checkMode: false, driftedPaths: [], written: [], bootstrapped: false, warnings: [] }; });
    vi.mocked(validateTerritoryFromFiles).mockImplementation(() => { callOrder.push('validateTerritoryFromFiles'); return { ok: true, errors: [], warnings: [], stats: DEFAULT_STATS }; });

    const result = await runTerritoryPipeline();

    expect(callOrder).toEqual([
      'validateSources',
      'writeOverlayCandidates',
      'autoReviewCandidatesFromFiles',
      'resolveReviewQueueFromFiles',
      'applyReviewQueueFromFiles',
      'promoteReviewedCandidatesFromFiles',
      'buildTerritoryFromFiles',
      'validateTerritoryFromFiles',
    ]);
    expect(result.ok).toBe(true);
    expect(vi.mocked(pinZctaSnapshot)).not.toHaveBeenCalled();
  });

  it('pins ZCTA snapshot as first step when --refresh-sources', async () => {
    const callOrder = [];
    vi.mocked(pinZctaSnapshot).mockImplementation(async () => { callOrder.push('pinZctaSnapshot'); });
    vi.mocked(validateSources).mockImplementation(() => { callOrder.push('validateSources'); return { ok: true, errors: [], stats: { rateFileCount: 1, territoryFileCount: 1 } }; });

    await runTerritoryPipeline({ refreshSources: true });

    expect(callOrder[0]).toBe('pinZctaSnapshot');
    expect(callOrder[1]).toBe('validateSources');
  });

  it('throws in --strict mode when null-action entries remain, before applying queue', async () => {
    vi.mocked(resolveReviewQueueFromFiles).mockReturnValue({
      updatedQueue: { queue: [] },
      stats: { ...EMPTY_RESOLVE_STATS, remainingNullAction: ['90001', '90210'] },
    });

    await expect(runTerritoryPipeline({ strict: true })).rejects.toThrow('--strict');
    expect(vi.mocked(applyReviewQueueFromFiles)).not.toHaveBeenCalled();
  });

  it('warns and continues without --strict when null-action entries remain', async () => {
    vi.mocked(resolveReviewQueueFromFiles).mockReturnValue({
      updatedQueue: { queue: [] },
      stats: { ...EMPTY_RESOLVE_STATS, remainingNullAction: ['90001'] },
    });

    const result = await runTerritoryPipeline({ strict: false });

    expect(result.ok).toBe(true);
    expect(result.nullActionZips).toEqual(['90001']);
    expect(vi.mocked(applyReviewQueueFromFiles)).toHaveBeenCalled();
  });

  it('throws in --check mode when runtime JSON would drift', async () => {
    vi.mocked(buildTerritoryFromFiles).mockReturnValue({
      ok: false,
      checkMode: true,
      driftedPaths: ['/repo/src/data/pgeTerritory.json'],
      written: [],
      bootstrapped: false,
      warnings: [],
    });

    await expect(runTerritoryPipeline({ check: true })).rejects.toThrow('Territory check failed');
    expect(vi.mocked(buildTerritoryFromFiles)).toHaveBeenCalledWith({ check: true });
  });

  it('passes check: true to buildTerritoryFromFiles when --check', async () => {
    await runTerritoryPipeline({ check: true });
    expect(vi.mocked(buildTerritoryFromFiles)).toHaveBeenCalledWith({ check: true });
  });

  it('stops after promote and skips build+validate when --skip-build', async () => {
    const result = await runTerritoryPipeline({ skipBuild: true });

    expect(vi.mocked(buildTerritoryFromFiles)).not.toHaveBeenCalled();
    expect(vi.mocked(validateTerritoryFromFiles)).not.toHaveBeenCalled();
    expect(result.skippedBuild).toBe(true);
    expect(result.ok).toBe(true);
  });

  it('throws and stops pipeline when source validation fails', async () => {
    vi.mocked(validateSources).mockReturnValue({ ok: false, errors: ['Missing source file: zcta.geojson'], stats: { rateFileCount: 0, territoryFileCount: 0 } });

    await expect(runTerritoryPipeline()).rejects.toThrow('Source validation failed');
    expect(vi.mocked(writeOverlayCandidates)).not.toHaveBeenCalled();
  });

  it('throws when territory validation fails', async () => {
    vi.mocked(validateTerritoryFromFiles).mockReturnValue({
      ok: false,
      errors: [{ message: 'ZIP 90210 references unknown serviceAreaId sce-unknown' }],
      warnings: [],
      stats: DEFAULT_STATS,
    });

    await expect(runTerritoryPipeline()).rejects.toThrow('Territory validation failed');
  });

  it('returns correct stats in result', async () => {
    const result = await runTerritoryPipeline();
    expect(result.stats).toEqual(DEFAULT_STATS);
    expect(result.nullActionZips).toEqual([]);
  });
});
