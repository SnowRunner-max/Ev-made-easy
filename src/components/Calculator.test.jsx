import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ratePlans from '../data/ratePlans.json';
import Calculator from './Calculator';

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

describe('Calculator — EV selector', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T02:00:00-08:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('renders vehicle-select', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    expect(screen.getByTestId('vehicle-select')).toBeInTheDocument();
  });

  it('defaults to Tesla Model 3 (60 kWh)', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    expect(screen.getByTestId('battery-display')).toHaveTextContent('60 kWh');
  });

  it('updates battery display when vehicle changes', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    fireEvent.change(screen.getByTestId('vehicle-select'), { target: { value: 'tesla-model-y-long-range' } });
    expect(screen.getByTestId('battery-display')).toHaveTextContent('75 kWh');
  });

  it('shows custom kWh input when Custom is selected', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    fireEvent.change(screen.getByTestId('vehicle-select'), { target: { value: 'custom' } });
    expect(screen.getByTestId('custom-kwh-input')).toBeInTheDocument();
  });
});

describe('Calculator — cost output', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T02:00:00-08:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('renders the calculator container', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    expect(screen.getByTestId('calculator')).toBeInTheDocument();
  });

  it('shows a dollar cost in the output', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    expect(screen.getByTestId('calculator')).toHaveTextContent('$');
  });
});
