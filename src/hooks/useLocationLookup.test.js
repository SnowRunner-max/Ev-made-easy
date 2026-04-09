import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock zipcodes
vi.mock('zipcodes', () => ({
  default: {
    lookup: vi.fn(),
    lookupByName: vi.fn(),
  },
}));

// Mock pgeTerritory.json
vi.mock('../data/pgeTerritory.json', () => ({
  default: {
    zips: {
      '93427': 'pge-3ce-sbco',   // PGE + 3CE CCA
      '94804': 'pge-only',        // PGE direct, no CCA
      '99999': 'multi-utility',   // multi-utility sentinel
    },
  },
}));

import { useLocationLookup } from './useLocationLookup';
import zipcodes from 'zipcodes';

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useLocationLookup — initial state', () => {
  it('starts idle with null resolved', () => {
    const { result } = renderHook(() => useLocationLookup());
    expect(result.current.status).toBe('idle');
    expect(result.current.resolved).toBeNull();
    expect(result.current.errorCode).toBeNull();
    expect(result.current.inputValue).toBe('');
  });
});

describe('useLocationLookup — input length gates', () => {
  it('stays idle for empty input', () => {
    const { result } = renderHook(() => useLocationLookup());
    act(() => result.current.setInput(''));
    expect(result.current.status).toBe('idle');
  });

  it('stays idle for single-char input', () => {
    const { result } = renderHook(() => useLocationLookup());
    act(() => result.current.setInput('B'));
    expect(result.current.status).toBe('idle');
  });

  it('becomes resolving for 2+ char input', () => {
    zipcodes.lookup.mockReturnValue(null);
    const { result } = renderHook(() => useLocationLookup());
    act(() => result.current.setInput('Bu'));
    expect(result.current.status).toBe('resolving');
  });
});

describe('useLocationLookup — zipcode path', () => {
  it('resolves a valid PGE zip with CCA after debounce', async () => {
    zipcodes.lookup.mockReturnValue({ zip: '93427', city: 'Buellton', state: 'CA' });
    const { result } = renderHook(() => useLocationLookup());

    act(() => result.current.setInput('93427'));
    expect(result.current.status).toBe('resolving');

    await act(async () => { vi.advanceTimersByTime(400); });

    expect(result.current.status).toBe('valid');
    expect(result.current.resolved).toEqual({
      serviceAreaId: 'pge-3ce-sbco',
      displayLabel: 'Buellton, CA',
      zip: '93427',
    });
    expect(result.current.errorCode).toBeNull();
  });

  it('resolves a valid PGE-only zip (no CCA) after debounce', async () => {
    zipcodes.lookup.mockReturnValue({ zip: '94804', city: 'Richmond', state: 'CA' });
    const { result } = renderHook(() => useLocationLookup());

    act(() => result.current.setInput('94804'));
    await act(async () => { vi.advanceTimersByTime(400); });

    expect(result.current.status).toBe('valid');
    expect(result.current.resolved?.serviceAreaId).toBe('pge-only');
  });

  it('returns not_pge for a CA zip not in PGE territory', async () => {
    zipcodes.lookup.mockReturnValue({ zip: '90001', city: 'Los Angeles', state: 'CA' });
    const { result } = renderHook(() => useLocationLookup());

    act(() => result.current.setInput('90001'));
    await act(async () => { vi.advanceTimersByTime(400); });

    expect(result.current.status).toBe('error');
    expect(result.current.errorCode).toBe('not_pge');
  });

  it('returns not_ca for an out-of-state zip', async () => {
    zipcodes.lookup.mockReturnValue({ zip: '10001', city: 'New York', state: 'NY' });
    const { result } = renderHook(() => useLocationLookup());

    act(() => result.current.setInput('10001'));
    await act(async () => { vi.advanceTimersByTime(400); });

    expect(result.current.status).toBe('error');
    expect(result.current.errorCode).toBe('not_ca');
  });

  it('returns invalid_input for a zip not in the zipcodes database', async () => {
    zipcodes.lookup.mockReturnValue(null);
    const { result } = renderHook(() => useLocationLookup());

    act(() => result.current.setInput('00000'));
    await act(async () => { vi.advanceTimersByTime(400); });

    expect(result.current.status).toBe('error');
    expect(result.current.errorCode).toBe('invalid_input');
  });

  it('returns multi_utility for a multi-utility sentinel zip', async () => {
    zipcodes.lookup.mockReturnValue({ zip: '99999', city: 'Bordertown', state: 'CA' });
    const { result } = renderHook(() => useLocationLookup());

    act(() => result.current.setInput('99999'));
    await act(async () => { vi.advanceTimersByTime(400); });

    expect(result.current.status).toBe('error');
    expect(result.current.errorCode).toBe('multi_utility');
  });
});

describe('useLocationLookup — city name path', () => {
  it('resolves a CA city in PGE territory', async () => {
    zipcodes.lookupByName.mockReturnValue([
      { zip: '93427', city: 'Buellton', state: 'CA' },
    ]);
    const { result } = renderHook(() => useLocationLookup());

    act(() => result.current.setInput('Buellton'));
    await act(async () => { vi.advanceTimersByTime(400); });

    expect(result.current.status).toBe('valid');
    expect(result.current.resolved?.serviceAreaId).toBe('pge-3ce-sbco');
    expect(result.current.resolved?.displayLabel).toBe('Buellton, CA');
  });

  it('returns not_pge for a CA city with no PGE zips', async () => {
    zipcodes.lookupByName.mockReturnValue([
      { zip: '90001', city: 'Los Angeles', state: 'CA' },
    ]);
    const { result } = renderHook(() => useLocationLookup());

    act(() => result.current.setInput('Los Angeles'));
    await act(async () => { vi.advanceTimersByTime(400); });

    expect(result.current.status).toBe('error');
    expect(result.current.errorCode).toBe('not_pge');
  });

  it('returns invalid_input for an unknown city', async () => {
    zipcodes.lookupByName.mockReturnValue([]);
    const { result } = renderHook(() => useLocationLookup());

    act(() => result.current.setInput('Xyzzyville'));
    await act(async () => { vi.advanceTimersByTime(400); });

    expect(result.current.status).toBe('error');
    expect(result.current.errorCode).toBe('invalid_input');
  });

  it('returns invalid_input when lookupByName returns null', async () => {
    zipcodes.lookupByName.mockReturnValue(null);
    const { result } = renderHook(() => useLocationLookup());

    act(() => result.current.setInput('Nowhere'));
    await act(async () => { vi.advanceTimersByTime(400); });

    expect(result.current.status).toBe('error');
    expect(result.current.errorCode).toBe('invalid_input');
  });
});

describe('useLocationLookup — debounce', () => {
  it('does not resolve before 400ms', async () => {
    zipcodes.lookup.mockReturnValue({ zip: '93427', city: 'Buellton', state: 'CA' });
    const { result } = renderHook(() => useLocationLookup());

    act(() => result.current.setInput('93427'));
    await act(async () => { vi.advanceTimersByTime(300); });

    expect(result.current.status).toBe('resolving');
  });

  it('only resolves once for rapid successive inputs', async () => {
    zipcodes.lookup
      .mockReturnValueOnce({ zip: '93427', city: 'Buellton', state: 'CA' })
      .mockReturnValueOnce({ zip: '94804', city: 'Richmond', state: 'CA' });

    const { result } = renderHook(() => useLocationLookup());

    act(() => result.current.setInput('9342'));
    await act(async () => { vi.advanceTimersByTime(100); });
    act(() => result.current.setInput('93427'));
    await act(async () => { vi.advanceTimersByTime(400); });

    // Only the final input resolves
    expect(zipcodes.lookup).toHaveBeenCalledTimes(1);
    expect(zipcodes.lookup).toHaveBeenCalledWith('93427');
  });
});

describe('useLocationLookup — clearInput', () => {
  it('resets all state to idle', async () => {
    zipcodes.lookup.mockReturnValue({ zip: '93427', city: 'Buellton', state: 'CA' });
    const { result } = renderHook(() => useLocationLookup());

    act(() => result.current.setInput('93427'));
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(result.current.status).toBe('valid');

    act(() => result.current.clearInput());

    expect(result.current.status).toBe('idle');
    expect(result.current.resolved).toBeNull();
    expect(result.current.errorCode).toBeNull();
    expect(result.current.inputValue).toBe('');
  });
});
