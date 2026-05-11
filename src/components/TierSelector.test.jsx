import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TierSelector from './TierSelector';

const TIER_OPTIONS = [
  { value: 'tier1', label: 'Tier 1 (baseline)' },
  { value: 'tier2', label: 'Tier 2 (above baseline)' },
  { value: 'tier3', label: 'Tier 3 (low income)' },
];

describe('TierSelector — rendering', () => {
  it('renders the tier-select element', () => {
    render(<TierSelector tier="tier1" options={TIER_OPTIONS} onChange={() => {}} />);

    expect(screen.getByTestId('tier-select')).toBeInTheDocument();
  });

  it('renders the correct number of options', () => {
    render(<TierSelector tier="tier1" options={TIER_OPTIONS} onChange={() => {}} />);

    expect(screen.getAllByRole('option')).toHaveLength(TIER_OPTIONS.length);
  });

  it('renders correct option labels', () => {
    render(<TierSelector tier="tier1" options={TIER_OPTIONS} onChange={() => {}} />);

    expect(screen.getByRole('option', { name: 'Tier 1 (baseline)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Tier 2 (above baseline)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Tier 3 (low income)' })).toBeInTheDocument();
  });

  it('renders with a single option when options array has one entry', () => {
    const single = [{ value: 'only', label: 'Only Tier' }];
    render(<TierSelector tier="only" options={single} onChange={() => {}} />);

    expect(screen.getAllByRole('option')).toHaveLength(1);
  });
});

describe('TierSelector — selected value', () => {
  it('reflects the tier prop as the currently selected value', () => {
    render(<TierSelector tier="tier1" options={TIER_OPTIONS} onChange={() => {}} />);

    expect(screen.getByTestId('tier-select').value).toBe('tier1');
  });

  it('reflects a different tier prop when changed', () => {
    render(<TierSelector tier="tier2" options={TIER_OPTIONS} onChange={() => {}} />);

    expect(screen.getByTestId('tier-select').value).toBe('tier2');
  });
});

describe('TierSelector — onChange callback', () => {
  it('calls onChange with the new option value when selection changes', () => {
    const onChange = vi.fn();
    render(<TierSelector tier="tier1" options={TIER_OPTIONS} onChange={onChange} />);

    fireEvent.change(screen.getByTestId('tier-select'), { target: { value: 'tier2' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('tier2');
  });

  it('calls onChange with string value (not event object)', () => {
    const onChange = vi.fn();
    render(<TierSelector tier="tier1" options={TIER_OPTIONS} onChange={onChange} />);

    fireEvent.change(screen.getByTestId('tier-select'), { target: { value: 'tier3' } });

    expect(typeof onChange.mock.calls[0][0]).toBe('string');
    expect(onChange).toHaveBeenCalledWith('tier3');
  });
});
