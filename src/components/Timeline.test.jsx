import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ratePlans from '../data/ratePlans.json';
import Timeline from './Timeline';

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
const evbConfig  = buildEffectiveConfig(ratePlans.ratePlans['EV-B']);
const e1Config   = ratePlans.ratePlans['E-1'];

describe('Timeline — EV2-A', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T10:00:00-08:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('renders 4 segments (offPeak, partPeak, peak, partPeak)', () => {
    render(<Timeline planConfig={ev2aConfig} />);
    expect(screen.getByTestId('segment-offPeak-0')).toBeInTheDocument();
    expect(screen.getByTestId('segment-partPeak-1')).toBeInTheDocument();
    expect(screen.getByTestId('segment-peak-2')).toBeInTheDocument();
    expect(screen.getByTestId('segment-partPeak-3')).toBeInTheDocument();
  });

  it('shows winter off-peak rate $0.23', () => {
    render(<Timeline planConfig={ev2aConfig} />);
    expect(screen.getByTestId('segment-offPeak-0')).toHaveTextContent('$0.23');
  });

  it('shows winter peak rate $0.41', () => {
    render(<Timeline planConfig={ev2aConfig} />);
    expect(screen.getByTestId('segment-peak-2')).toHaveTextContent('$0.41');
  });

  it('shows summer peak rate $0.54', () => {
    vi.setSystemTime(new Date('2026-07-15T10:00:00-07:00'));
    render(<Timeline planConfig={ev2aConfig} />);
    expect(screen.getByTestId('segment-peak-2')).toHaveTextContent('$0.54');
  });

  it('peak segment has red color', () => {
    render(<Timeline planConfig={ev2aConfig} />);
    expect(screen.getByTestId('segment-peak-2').className).toMatch(/red/);
  });

  it('marker at 50% at noon', () => {
    vi.setSystemTime(new Date('2026-01-15T12:00:00-08:00'));
    render(<Timeline planConfig={ev2aConfig} />);
    expect(screen.getByTestId('timeline-marker')).toHaveStyle('left: 50%');
  });

  it('marker at 0% at midnight', () => {
    vi.setSystemTime(new Date('2026-01-15T00:00:00-08:00'));
    render(<Timeline planConfig={ev2aConfig} />);
    expect(screen.getByTestId('timeline-marker')).toHaveStyle('left: 0%');
  });
});

describe('Timeline — EV-B weekday (Tuesday Jan 6)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-06T10:00:00-08:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('renders 5 segments', () => {
    render(<Timeline planConfig={evbConfig} />);
    expect(screen.getAllByTestId(/^segment-/)).toHaveLength(5);
  });
});

describe('Timeline — EV-B weekend (Saturday Jan 10)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-10T10:00:00-08:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('renders 3 segments', () => {
    render(<Timeline planConfig={evbConfig} />);
    expect(screen.getAllByTestId(/^segment-/)).toHaveLength(3);
  });
});

describe('Timeline — E-1 tiered', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T10:00:00-08:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('shows no-time-based-pricing placeholder', () => {
    render(<Timeline planConfig={e1Config} />);
    expect(screen.getByTestId('timeline')).toHaveTextContent(/no time.based pricing/i);
  });
});
