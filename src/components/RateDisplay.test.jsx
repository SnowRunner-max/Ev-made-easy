import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ratePlans from '../data/ratePlans.json';
import RateDisplay from './RateDisplay';

function buildEffectiveConfig(planConfig) {
  if (!planConfig.touPeriods) return planConfig;
  const seasons = Object.keys(planConfig.rates.pgeDelivery);
  const rates = Object.fromEntries(
    seasons.map(season => [
      season,
      Object.fromEntries(
        Object.keys(planConfig.rates.pgeDelivery[season]).map(period => {
          const delivery = planConfig.rates.pgeDelivery[season][period];
          const cce = planConfig.rates.cce[season][period];
          const combined = planConfig.rates.pgeTotalBundled[season][period];
          return [period, { combined, delivery, generation: cce }];
        })
      ),
    ])
  );
  return { ...planConfig, rates };
}

const ev2aConfig = buildEffectiveConfig(ratePlans.ratePlans['EV2-A']);
const e1Config   = ratePlans.ratePlans['E-1'];

describe('RateDisplay — TOU plan (EV2-A)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows off-peak rate $0.23/kWh in winter (2 AM)', () => {
    vi.setSystemTime(new Date('2026-01-15T02:00:00-08:00'));
    render(<RateDisplay planConfig={ev2aConfig} />);
    expect(screen.getByTestId('rate-value')).toHaveTextContent('$0.23/kWh');
  });

  it('off-peak badge has emerald color', () => {
    vi.setSystemTime(new Date('2026-01-15T02:00:00-08:00'));
    render(<RateDisplay planConfig={ev2aConfig} />);
    expect(screen.getByTestId('rate-badge').className).toMatch(/emerald/);
  });

  it('shows peak rate $0.41/kWh in winter (6 PM)', () => {
    vi.setSystemTime(new Date('2026-01-15T18:00:00-08:00'));
    render(<RateDisplay planConfig={ev2aConfig} />);
    expect(screen.getByTestId('rate-value')).toHaveTextContent('$0.41/kWh');
  });

  it('peak badge has red color', () => {
    vi.setSystemTime(new Date('2026-01-15T18:00:00-08:00'));
    render(<RateDisplay planConfig={ev2aConfig} />);
    expect(screen.getByTestId('rate-badge').className).toMatch(/red/);
  });

  it('shows summer peak rate $0.54/kWh (July 6 PM)', () => {
    vi.setSystemTime(new Date('2026-07-15T18:00:00-07:00'));
    render(<RateDisplay planConfig={ev2aConfig} />);
    expect(screen.getByTestId('rate-value')).toHaveTextContent('$0.54/kWh');
  });

  it('shows "Summer Rates" in summer', () => {
    vi.setSystemTime(new Date('2026-07-15T18:00:00-07:00'));
    render(<RateDisplay planConfig={ev2aConfig} />);
    expect(screen.getByText('Summer Rates')).toBeInTheDocument();
  });

  it('shows countdown with direction and next rate', () => {
    vi.setSystemTime(new Date('2026-01-15T14:45:00-08:00')); // 15m until part-peak
    render(<RateDisplay planConfig={ev2aConfig} />);
    const countdown = screen.getByTestId('countdown');
    expect(countdown).toHaveTextContent('15m');
    expect(countdown).toHaveTextContent('rises to');
  });
});

describe('RateDisplay — tiered plan (E-1)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows "Tiered Rate" (no per-kWh rate)', () => {
    vi.setSystemTime(new Date('2026-01-15T18:00:00-08:00'));
    render(<RateDisplay planConfig={e1Config} />);
    expect(screen.getByTestId('rate-value')).toHaveTextContent('Tiered Rate');
  });

  it('no countdown for tiered plan', () => {
    vi.setSystemTime(new Date('2026-01-15T18:00:00-08:00'));
    render(<RateDisplay planConfig={e1Config} />);
    expect(screen.queryByTestId('countdown')).not.toBeInTheDocument();
  });
});
