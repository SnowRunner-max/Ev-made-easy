import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSmartInterval } from './useSmartInterval';

const FIVE_MINUTES_MS = 5 * 60 * 1000; // 300_000

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSmartInterval — polling interval selection', () => {
  it('uses 60s interval when getMsToNext() > 5 minutes', () => {
    const onTick = vi.fn();
    const getMsToNext = vi.fn().mockReturnValue(FIVE_MINUTES_MS + 1);

    renderHook(() => useSmartInterval(onTick, getMsToNext, []));

    // After 59s — no tick yet
    vi.advanceTimersByTime(59_000);
    expect(onTick).not.toHaveBeenCalled();

    // After 60s — exactly one tick
    vi.advanceTimersByTime(1_000);
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('uses 1s interval when getMsToNext() <= 5 minutes', () => {
    const onTick = vi.fn();
    const getMsToNext = vi.fn().mockReturnValue(FIVE_MINUTES_MS);

    renderHook(() => useSmartInterval(onTick, getMsToNext, []));

    // After 999ms — no tick yet
    vi.advanceTimersByTime(999);
    expect(onTick).not.toHaveBeenCalled();

    // After 1s — exactly one tick
    vi.advanceTimersByTime(1);
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('treats exactly 5 minutes (300000ms) as the fast-tick threshold', () => {
    const onTick = vi.fn();
    // exactly 300_000 ms → should use 1s interval (boundary: <=)
    const getMsToNext = vi.fn().mockReturnValue(300_000);

    renderHook(() => useSmartInterval(onTick, getMsToNext, []));

    vi.advanceTimersByTime(1_000);
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('treats 300001ms (just over 5 min) as the slow-tick threshold', () => {
    const onTick = vi.fn();
    const getMsToNext = vi.fn().mockReturnValue(300_001);

    renderHook(() => useSmartInterval(onTick, getMsToNext, []));

    // 1s not enough for a 60s interval
    vi.advanceTimersByTime(1_000);
    expect(onTick).not.toHaveBeenCalled();

    vi.advanceTimersByTime(59_000);
    expect(onTick).toHaveBeenCalledTimes(1);
  });
});

describe('useSmartInterval — onTick is called', () => {
  it('calls onTick after the interval fires', () => {
    const onTick = vi.fn();
    const getMsToNext = vi.fn().mockReturnValue(FIVE_MINUTES_MS);

    renderHook(() => useSmartInterval(onTick, getMsToNext, []));

    vi.advanceTimersByTime(1_000);

    expect(onTick).toHaveBeenCalledTimes(1);
  });
});

describe('useSmartInterval — self-rescheduling', () => {
  it('re-evaluates getMsToNext and reschedules after each tick', () => {
    const onTick = vi.fn();
    // First call: slow interval (> 5 min). Second call: fast interval (<= 5 min).
    const getMsToNext = vi.fn()
      .mockReturnValueOnce(FIVE_MINUTES_MS + 1)   // initial → 60s interval
      .mockReturnValueOnce(FIVE_MINUTES_MS + 1)   // first tick fires, reschedules → still slow
      .mockReturnValue(FIVE_MINUTES_MS);           // second schedule → 1s interval

    renderHook(() => useSmartInterval(onTick, getMsToNext, []));

    // First tick at 60s
    vi.advanceTimersByTime(60_000);
    expect(onTick).toHaveBeenCalledTimes(1);

    // Rescheduled with slow again, fires at next 60s
    vi.advanceTimersByTime(60_000);
    expect(onTick).toHaveBeenCalledTimes(2);

    // Now rescheduled with fast (1s); fires quickly
    vi.advanceTimersByTime(1_000);
    expect(onTick).toHaveBeenCalledTimes(3);
  });

  it('calls onTick twice when time is advanced through two slow intervals', () => {
    const onTick = vi.fn();
    const getMsToNext = vi.fn().mockReturnValue(FIVE_MINUTES_MS + 1); // always slow

    renderHook(() => useSmartInterval(onTick, getMsToNext, []));

    vi.advanceTimersByTime(120_000); // 2 × 60s
    expect(onTick).toHaveBeenCalledTimes(2);
  });
});

describe('useSmartInterval — cleanup', () => {
  it('clears the interval on unmount and stops calling onTick', () => {
    const onTick = vi.fn();
    const getMsToNext = vi.fn().mockReturnValue(FIVE_MINUTES_MS + 1);

    const { unmount } = renderHook(() => useSmartInterval(onTick, getMsToNext, []));

    unmount();

    // Advance past the 60s interval — onTick should NOT fire
    vi.advanceTimersByTime(120_000);
    expect(onTick).not.toHaveBeenCalled();
  });
});

describe('useSmartInterval — deps change', () => {
  it('re-creates the interval when deps change', () => {
    const onTick = vi.fn();
    const getMsToNext = vi.fn().mockReturnValue(FIVE_MINUTES_MS + 1);
    let dep = 1;

    const { rerender } = renderHook(() => useSmartInterval(onTick, getMsToNext, [dep]));

    // Advance part way through first interval
    vi.advanceTimersByTime(30_000);
    expect(onTick).not.toHaveBeenCalled();

    // Change dep → effect re-runs, interval resets
    dep = 2;
    rerender();

    // The new 60s interval hasn't fired yet
    vi.advanceTimersByTime(30_000);
    expect(onTick).not.toHaveBeenCalled();

    // Now the new interval fires (30s old + 30s new = total new 60s)
    vi.advanceTimersByTime(30_000);
    expect(onTick).toHaveBeenCalledTimes(1);
  });
});
