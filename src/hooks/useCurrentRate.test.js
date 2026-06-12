import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ratePlans from '../data/ratePlans.json';
import { useCurrentRate } from './useCurrentRate';

function buildEffectiveConfig(planConfig) {
  if (!planConfig.touPeriods) return planConfig;
  const seasons = Object.keys(planConfig.rates.delivery);
  const rates = Object.fromEntries(
    seasons.map(season => [
      season,
      Object.fromEntries(
        Object.keys(planConfig.rates.delivery[season]).map(period => {
          const delivery = planConfig.rates.delivery[season][period];
          const generation = planConfig.rates.generation[season][period];
          const combined = planConfig.rates.totalBundled[season][period];
          return [period, { combined, delivery, generation }];
        })
      ),
    ])
  );
  return { ...planConfig, rates };
}

const ev2aConfig = buildEffectiveConfig(ratePlans.ratePlans['EV2-A']);

describe('useCurrentRate — TOU boundary tracking', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('reflects the new period within seconds of crossing a boundary when mounted more than 5 minutes before it', () => {
    // EV2-A summer weekday: part-peak 3–4 PM, peak starts at 4 PM.
    // Mount at 3:50:30 PM — outside the 5-minute fast-tick window, and offset
    // from the minute so the 60s coarse ticks never land exactly on 4:00:00.
    vi.setSystemTime(new Date('2026-07-15T15:50:30-07:00'));
    const { result } = renderHook(() => useCurrentRate(ev2aConfig));

    expect(result.current.period).toBe('partPeak');

    // Advance to 4:00:05 PM — past the boundary but before the next coarse 60s
    // tick (4:00:30). The interval must tighten to 1s inside the final 5
    // minutes for the hook to have re-read the clock by now.
    act(() => vi.advanceTimersByTime(9.5 * 60_000 + 5_000));

    expect(result.current.period).toBe('peak');
  });
});
