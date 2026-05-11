import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCountdown } from './useCountdown';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// Helper: build a target Date that is `ms` milliseconds in the future from `now`.
function futureTarget(ms) {
  return new Date(Date.now() + ms);
}

// Helper: build a target Date that is `ms` milliseconds in the past.
function pastTarget(ms) {
  return new Date(Date.now() - ms);
}

describe('useCountdown — formatted output: ≥ 5 min, < 1 hour', () => {
  it('returns "Xm" for exactly 10 minutes remaining', () => {
    const target = futureTarget(10 * 60_000);

    const { result } = renderHook(() => useCountdown(target));

    expect(result.current.formatted).toBe('10m');
  });

  it('returns "Xm" for exactly 5 minutes (boundary) remaining', () => {
    // 5 min = 300_000ms — at exactly 5 min it is NOT < FIVE_MINUTES_MS, so uses "Xm" branch
    const target = futureTarget(5 * 60_000);

    const { result } = renderHook(() => useCountdown(target));

    expect(result.current.formatted).toBe('5m');
  });

  it('returns "30m" for 30 minutes remaining', () => {
    const target = futureTarget(30 * 60_000);

    const { result } = renderHook(() => useCountdown(target));

    expect(result.current.formatted).toBe('30m');
  });
});

describe('useCountdown — formatted output: ≥ 1 hour', () => {
  it('returns "1h 30m" for 90 minutes remaining', () => {
    const target = futureTarget(90 * 60_000);

    const { result } = renderHook(() => useCountdown(target));

    expect(result.current.formatted).toBe('1h 30m');
  });

  it('returns "2h 0m" for exactly 2 hours remaining', () => {
    const target = futureTarget(2 * 60 * 60_000);

    const { result } = renderHook(() => useCountdown(target));

    expect(result.current.formatted).toBe('2h 0m');
  });

  it('returns "1h 0m" for exactly 1 hour remaining', () => {
    const target = futureTarget(60 * 60_000);

    const { result } = renderHook(() => useCountdown(target));

    expect(result.current.formatted).toBe('1h 0m');
  });
});

describe('useCountdown — formatted output: < 5 min, minutes > 0', () => {
  it('returns "4m 30s" for 4 minutes 30 seconds remaining', () => {
    const target = futureTarget(4 * 60_000 + 30_000);

    const { result } = renderHook(() => useCountdown(target));

    expect(result.current.formatted).toBe('4m 30s');
  });

  it('returns "1m 0s" for exactly 1 minute remaining', () => {
    const target = futureTarget(60_000);

    const { result } = renderHook(() => useCountdown(target));

    expect(result.current.formatted).toBe('1m 0s');
  });

  it('returns "4m 59s" for 299 seconds remaining', () => {
    // 299s = 4m 59s — just below 5 min boundary
    const target = futureTarget(299_000);

    const { result } = renderHook(() => useCountdown(target));

    expect(result.current.formatted).toBe('4m 59s');
  });
});

describe('useCountdown — formatted output: < 5 min, minutes = 0', () => {
  it('returns "45s" for 45 seconds remaining', () => {
    const target = futureTarget(45_000);

    const { result } = renderHook(() => useCountdown(target));

    expect(result.current.formatted).toBe('45s');
  });

  it('returns "1s" for 1 second remaining', () => {
    const target = futureTarget(1_000);

    const { result } = renderHook(() => useCountdown(target));

    expect(result.current.formatted).toBe('1s');
  });

  it('returns "59s" for 59 seconds remaining', () => {
    const target = futureTarget(59_000);

    const { result } = renderHook(() => useCountdown(target));

    expect(result.current.formatted).toBe('59s');
  });
});

describe('useCountdown — msRemaining clamps to 0 for past targets', () => {
  it('returns msRemaining = 0 when target is in the past', () => {
    const target = pastTarget(60_000); // 1 minute ago

    const { result } = renderHook(() => useCountdown(target));

    expect(result.current.msRemaining).toBe(0);
  });

  it('returns "0s" formatted when target is in the past', () => {
    const target = pastTarget(5_000);

    const { result } = renderHook(() => useCountdown(target));

    // ms=0 → Math.floor(0/60_000)=0 → minutes=0, seconds=0 → "0s"
    expect(result.current.formatted).toBe('0s');
  });
});

describe('useCountdown — updates when time advances past target', () => {
  it('transitions from non-zero to 0 after advancing time past the target', async () => {
    const thirtySecondsMs = 30_000;
    const target = futureTarget(thirtySecondsMs);

    const { result } = renderHook(() => useCountdown(target));

    // Initially: 30s remaining
    expect(result.current.msRemaining).toBeGreaterThan(0);

    // Advance 31 seconds — the fast-tick (1s) interval fires, setNow updates
    await act(async () => {
      vi.advanceTimersByTime(31_000);
    });

    // After advancing past the target, msRemaining should clamp to 0
    expect(result.current.msRemaining).toBe(0);
  });
});
