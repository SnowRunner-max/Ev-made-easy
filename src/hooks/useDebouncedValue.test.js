import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDebouncedValue', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue(20, 120));

    expect(result.current).toBe(20);
  });

  it('waits for the delay before publishing changed values', () => {
    let value = 20;
    const { result, rerender } = renderHook(() => useDebouncedValue(value, 120));

    value = 50;
    rerender();

    expect(result.current).toBe(20);

    act(() => {
      vi.advanceTimersByTime(119);
    });
    expect(result.current).toBe(20);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(50);
  });

  it('uses the latest value when updates happen within the delay', () => {
    let value = 20;
    const { result, rerender } = renderHook(() => useDebouncedValue(value, 120));

    value = 40;
    rerender();
    act(() => {
      vi.advanceTimersByTime(60);
    });

    value = 70;
    rerender();
    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(result.current).toBe(70);
  });
});
