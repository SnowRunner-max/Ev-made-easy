import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ratePlans from '../data/ratePlans.json';
import Calculator from './Calculator';

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

  it('updates the slider label immediately and debounces cost output', () => {
    render(<Calculator planConfig={ev2aConfig} />);

    const initialCost = screen.getByTestId('to80-cost-now').textContent;

    fireEvent.change(screen.getByTestId('charge-slider'), { target: { value: '50' } });

    expect(screen.getByTestId('charge-label')).toHaveTextContent('50%');
    expect(screen.getByTestId('to80-cost-now')).toHaveTextContent(initialCost);

    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(screen.getByTestId('to80-cost-now').textContent).not.toBe(initialCost);
  });
});

describe('Calculator — charging duration display', () => {
  // Uses fake timers matching the pattern in existing Calculator describe blocks.
  // Time is fixed at 02:00 PT on 2026-01-15 (winter, off-peak for EV2-A).
  // Default state of charge is 20%, so both to80 and to100 cards render.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T02:00:00-08:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('renders data-testid="to80-duration" in the cost output', () => {
    render(<Calculator planConfig={ev2aConfig} />);

    // The default currentPct is 20%, so charging to 80% is always needed
    expect(screen.getByTestId('to80-duration')).toBeInTheDocument();
  });

  it('renders data-testid="to100-duration" when currentPct is below 80', () => {
    render(<Calculator planConfig={ev2aConfig} />);

    // Default currentPct=20 is below both 80 and 100, so to100 card also renders
    expect(screen.getByTestId('to100-duration')).toBeInTheDocument();
  });

  it('duration text changes after slider moves and the 120ms debounce elapses', () => {
    render(<Calculator planConfig={ev2aConfig} />);

    // Capture the duration text before any interaction
    const initialDuration = screen.getByTestId('to80-duration').textContent;

    // Move slider to 70% — kWhNeeded to 80% shrinks, so duration must change
    fireEvent.change(screen.getByTestId('charge-slider'), { target: { value: '70' } });

    // Debounce has NOT fired yet — duration should still show the old value
    expect(screen.getByTestId('to80-duration')).toHaveTextContent(initialDuration);

    // Advance past the 120ms debounce threshold
    act(() => {
      vi.advanceTimersByTime(120);
    });

    // Duration text must now reflect the new, smaller kWh needed
    expect(screen.getByTestId('to80-duration').textContent).not.toBe(initialDuration);
  });
});
