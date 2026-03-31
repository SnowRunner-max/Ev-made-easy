import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ratePlans from '../data/ratePlans.json';
import ChargingTip from './ChargingTip';

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

describe('ChargingTip — off-peak (10 AM)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T10:00:00-08:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('renders tip container', () => {
    render(<ChargingTip planConfig={ev2aConfig} />);
    expect(screen.getByTestId('charging-tip')).toBeInTheDocument();
  });

  it('shows positive off-peak message', () => {
    render(<ChargingTip planConfig={ev2aConfig} />);
    expect(screen.getByTestId('tip-message')).toHaveTextContent(/cheapest|best time/i);
  });

  it('has emerald color (off-peak)', () => {
    render(<ChargingTip planConfig={ev2aConfig} />);
    expect(screen.getByTestId('charging-tip').className).toMatch(/emerald|green/);
  });
});

describe('ChargingTip — peak (5 PM)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T17:00:00-08:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('warns rates are expensive', () => {
    render(<ChargingTip planConfig={ev2aConfig} />);
    expect(screen.getByTestId('tip-message')).toHaveTextContent(/expensive|peak|most/i);
  });

  it('shows savings percentage', () => {
    render(<ChargingTip planConfig={ev2aConfig} />);
    expect(screen.getByTestId('tip-message')).toHaveTextContent(/%/);
  });

  it('has red color (peak)', () => {
    render(<ChargingTip planConfig={ev2aConfig} />);
    expect(screen.getByTestId('charging-tip').className).toMatch(/red|orange/);
  });
});

describe('ChargingTip — part-peak (3 PM)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T15:00:00-08:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('warns peak is approaching', () => {
    render(<ChargingTip planConfig={ev2aConfig} />);
    expect(screen.getByTestId('tip-message')).toHaveTextContent(/peak|4.?pm/i);
  });
});

describe('ChargingTip — tiered plan (E-1)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T17:00:00-08:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('shows no time-based pricing message', () => {
    render(<ChargingTip planConfig={e1Config} />);
    expect(screen.getByTestId('tip-message')).toHaveTextContent(/no time.based pricing|same at all hours/i);
  });
});
