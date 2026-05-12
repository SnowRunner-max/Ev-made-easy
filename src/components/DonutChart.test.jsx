import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock useCurrentRate — DonutChart uses real timers internally via useSmartInterval.
// We control the return value so tests are deterministic and time-independent.
vi.mock('../hooks/useCurrentRate', () => ({
  useCurrentRate: vi.fn(),
}));
import { useCurrentRate } from '../hooks/useCurrentRate';

import DonutChart from './DonutChart';
import ratePlans from '../data/ratePlans.json';

// Mirrors the buildEffectiveConfig used in App.jsx and costCalculator.test.js.
// Transforms the raw delivery/generation/totalBundled structure into
// planConfig.rates[season][period] = { delivery, generation, combined }.
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
const e1Config   = ratePlans.ratePlans['E-1']; // tiered — no touPeriods

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DonutChart — null cases', () => {
  it('returns null for a tiered plan that has no touPeriods (E-1)', () => {
    // E-1 has no touPeriods; useCurrentRate still needs a return value
    useCurrentRate.mockReturnValue({ period: 'offPeak', season: null });

    const { container } = render(<DonutChart planConfig={e1Config} />);

    expect(container.firstChild).toBeNull();
  });

  it('returns null when rateData is missing for the given period/season combo', () => {
    // Supply a period that does not exist in the rates structure
    useCurrentRate.mockReturnValue({ period: 'nonExistentPeriod', season: 'winter' });

    const { container } = render(<DonutChart planConfig={ev2aConfig} />);

    expect(container.firstChild).toBeNull();
  });

  it('returns null when season is null for a TOU plan', () => {
    useCurrentRate.mockReturnValue({ period: 'offPeak', season: null });

    const { container } = render(<DonutChart planConfig={ev2aConfig} />);

    expect(container.firstChild).toBeNull();
  });
});

describe('DonutChart — percentage rendering', () => {
  it('renders delivery% and generation% that sum to 100', () => {
    // EV2-A winter offPeak: delivery=0.13012, generation=0.09546, totalBundled=0.22558
    useCurrentRate.mockReturnValue({ period: 'offPeak', season: 'winter' });

    render(<DonutChart planConfig={ev2aConfig} />);

    // delivPct = Math.round(0.13012 / 0.22558 * 100) = 58
    // genPct   = 100 - 58 = 42
    const deliveryText  = screen.getByText('58%');
    const generationText = screen.getByText('42%');

    expect(deliveryText).toBeInTheDocument();
    expect(generationText).toBeInTheDocument();
    expect(58 + 42).toBe(100);
  });

  it('renders correct delivery% for EV2-A winter offPeak: 58% delivery, 42% generation', () => {
    // delivery=0.13012, combined=0.22558
    // Math.round(0.13012 / 0.22558 * 100) = Math.round(57.69) = 58
    useCurrentRate.mockReturnValue({ period: 'offPeak', season: 'winter' });

    render(<DonutChart planConfig={ev2aConfig} />);

    expect(screen.getByText('58%')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('renders delivery% and generation% that sum to 100 for summer peak', () => {
    // EV2-A summer peak: delivery=0.34979, totalBundled=0.53809
    // delivPct = Math.round(0.34979 / 0.53809 * 100) = Math.round(65.0) = 65
    // genPct = 100 - 65 = 35
    useCurrentRate.mockReturnValue({ period: 'peak', season: 'summer' });

    render(<DonutChart planConfig={ev2aConfig} />);

    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('35%')).toBeInTheDocument();
    expect(65 + 35).toBe(100);
  });
});

describe('DonutChart — legend labels', () => {
  it('renders "Utility Delivery" when _displayProvider is missing', () => {
    useCurrentRate.mockReturnValue({ period: 'offPeak', season: 'winter' });

    render(<DonutChart planConfig={ev2aConfig} />);

    expect(screen.getByText('Utility Delivery')).toBeInTheDocument();
  });

  it('renders "Generation" label', () => {
    useCurrentRate.mockReturnValue({ period: 'offPeak', season: 'winter' });

    render(<DonutChart planConfig={ev2aConfig} />);

    expect(screen.getByText('Generation')).toBeInTheDocument();
  });
});
