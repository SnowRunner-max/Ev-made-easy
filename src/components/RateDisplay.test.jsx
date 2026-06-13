import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ratePlans from '../data/ratePlans.json';
import sceRatePlans from '../data/sceRatePlans.json';
import RateDisplay from './RateDisplay';
import { buildCurrentRate } from '../test-utils/currentRate';

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
const e1Config   = ratePlans.ratePlans['E-1'];
const sceTouDConfig = buildEffectiveConfig(sceRatePlans.ratePlans['TOU-D-4-9PM']);

describe('RateDisplay — TOU plan (EV2-A)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows off-peak rate $0.23/kWh in winter (2 AM)', () => {
    vi.setSystemTime(new Date('2026-01-15T02:00:00-08:00'));
    render(<RateDisplay planConfig={ev2aConfig} currentRate={buildCurrentRate(ev2aConfig)} />);
    expect(screen.getByTestId('rate-value')).toHaveTextContent('$0.23/kWh');
  });

  it('off-peak badge has emerald color', () => {
    vi.setSystemTime(new Date('2026-01-15T02:00:00-08:00'));
    render(<RateDisplay planConfig={ev2aConfig} currentRate={buildCurrentRate(ev2aConfig)} />);
    expect(screen.getByTestId('rate-badge').className).toMatch(/green/);
  });

  it('shows peak rate $0.41/kWh in winter (6 PM)', () => {
    vi.setSystemTime(new Date('2026-01-15T18:00:00-08:00'));
    render(<RateDisplay planConfig={ev2aConfig} currentRate={buildCurrentRate(ev2aConfig)} />);
    expect(screen.getByTestId('rate-value')).toHaveTextContent('$0.41/kWh');
  });

  it('peak badge has red color', () => {
    vi.setSystemTime(new Date('2026-01-15T18:00:00-08:00'));
    render(<RateDisplay planConfig={ev2aConfig} currentRate={buildCurrentRate(ev2aConfig)} />);
    expect(screen.getByTestId('rate-badge').className).toMatch(/red/);
  });

  it('shows summer peak rate $0.54/kWh (July 6 PM)', () => {
    vi.setSystemTime(new Date('2026-07-15T18:00:00-07:00'));
    render(<RateDisplay planConfig={ev2aConfig} currentRate={buildCurrentRate(ev2aConfig)} />);
    expect(screen.getByTestId('rate-value')).toHaveTextContent('$0.54/kWh');
  });

  it('shows "Summer Rates" in summer', () => {
    vi.setSystemTime(new Date('2026-07-15T18:00:00-07:00'));
    render(<RateDisplay planConfig={ev2aConfig} currentRate={buildCurrentRate(ev2aConfig)} />);
    expect(screen.getByText(/^Summer\b/)).toBeInTheDocument();
  });

  it('shows countdown with direction and next rate', () => {
    vi.setSystemTime(new Date('2026-01-15T14:45:00-08:00')); // 15m until part-peak
    render(<RateDisplay planConfig={ev2aConfig} currentRate={buildCurrentRate(ev2aConfig)} />);
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
    render(<RateDisplay planConfig={e1Config} currentRate={buildCurrentRate(e1Config)} />);
    expect(screen.getByTestId('rate-value')).toHaveTextContent('Tiered Rate');
  });

  it('shows a flat per-kWh rate when the effective plan has one', () => {
    vi.setSystemTime(new Date('2026-01-15T18:00:00-08:00'));
    const flatConfig = { ...e1Config, _flatRate: { combined: 0.1976, delivery: 0, generation: 0.1976 } };
    render(<RateDisplay planConfig={flatConfig} currentRate={buildCurrentRate(flatConfig)} />);
    expect(screen.getByTestId('rate-value')).toHaveTextContent('$0.20/kWh');
  });

  it('no countdown for tiered plan', () => {
    vi.setSystemTime(new Date('2026-01-15T18:00:00-08:00'));
    render(<RateDisplay planConfig={e1Config} currentRate={buildCurrentRate(e1Config)} />);
    expect(screen.queryByTestId('countdown')).not.toBeInTheDocument();
  });
});

describe('RateDisplay — SCE TOU-D-4-9PM', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders winter mid-peak without crashing', () => {
    vi.setSystemTime(new Date('2026-01-15T17:00:00-08:00'));
    render(<RateDisplay planConfig={sceTouDConfig} currentRate={buildCurrentRate(sceTouDConfig)} />);
    expect(screen.getByTestId('rate-badge')).toHaveTextContent('Mid-Peak');
    expect(screen.getByTestId('rate-badge').className).toMatch(/amber/);
    expect(screen.getByTestId('rate-value')).toHaveTextContent('$0.51/kWh');
  });
});
