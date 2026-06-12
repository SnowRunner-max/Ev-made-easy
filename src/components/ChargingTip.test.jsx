import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ratePlans from '../data/ratePlans.json';
import sceRatePlans from '../data/sceRatePlans.json';
import sdgeRatePlans from '../data/sdgeRatePlans.json';
import ChargingTip from './ChargingTip';

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
const sdgeEvTou5Config = buildEffectiveConfig(sdgeRatePlans.ratePlans['EV-TOU-5']);

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

describe('ChargingTip — SDG&E EV-TOU-5 (super off-peak is the cheapest window)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  // Winter bundled rates: peak 0.53263, offPeak 0.47610, superOffPeak 0.12115

  it('does NOT claim off-peak is the cheapest window (10 AM off-peak)', () => {
    vi.setSystemTime(new Date('2026-01-15T10:00:00-08:00'));
    render(<ChargingTip planConfig={sdgeEvTou5Config} />);
    expect(screen.getByTestId('tip-message')).not.toHaveTextContent(/you're in the cheapest charging window/i);
  });

  it('points to super off-peak during off-peak (10 AM)', () => {
    vi.setSystemTime(new Date('2026-01-15T10:00:00-08:00'));
    render(<ChargingTip planConfig={sdgeEvTou5Config} />);
    const msg = screen.getByTestId('tip-message');
    expect(msg).toHaveTextContent(/super off-peak/i);
    // savings vs super off-peak: 1 - 0.12115/0.47610 ≈ 75%
    expect(msg).toHaveTextContent(/75%/);
  });

  it('treats super off-peak as the cheapest window (2 AM)', () => {
    vi.setSystemTime(new Date('2026-01-15T02:00:00-08:00'));
    render(<ChargingTip planConfig={sdgeEvTou5Config} />);
    expect(screen.getByTestId('charging-tip').className).toMatch(/blue/);
    expect(screen.getByTestId('tip-message')).toHaveTextContent(/cheapest|best time/i);
  });

  it('points to super off-peak, not off-peak, as the cheapest during peak (5 PM)', () => {
    vi.setSystemTime(new Date('2026-01-15T17:00:00-08:00'));
    render(<ChargingTip planConfig={sdgeEvTou5Config} />);
    const msg = screen.getByTestId('tip-message');
    expect(msg).toHaveTextContent(/super off-peak.*cheapest/i);
    // savings vs super off-peak: 1 - 0.12115/0.53263 ≈ 77%
    expect(msg).toHaveTextContent(/77%/);
  });

  it('recommends waiting for super off-peak during late-evening off-peak (10 PM)', () => {
    vi.setSystemTime(new Date('2026-01-15T22:00:00-08:00'));
    render(<ChargingTip planConfig={sdgeEvTou5Config} />);
    expect(screen.getByTestId('tip-message')).toHaveTextContent(/super off-peak/i);
  });
});

describe('ChargingTip — SCE TOU-D-4-9PM winter off-peak is not the cheapest', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  // Winter bundled rates: midPeak 0.51159, offPeak 0.37550, superOffPeak 0.33636

  it('does NOT claim off-peak is the cheapest window (10 AM winter off-peak)', () => {
    vi.setSystemTime(new Date('2026-01-15T10:00:00-08:00'));
    render(<ChargingTip planConfig={sceTouDConfig} />);
    const msg = screen.getByTestId('tip-message');
    expect(msg).not.toHaveTextContent(/you're in the cheapest charging window/i);
    expect(msg).toHaveTextContent(/super off-peak/i);
  });
});

describe('ChargingTip — SCE TOU-D-4-9PM', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders winter mid-peak without crashing', () => {
    vi.setSystemTime(new Date('2026-01-15T17:00:00-08:00'));
    render(<ChargingTip planConfig={sceTouDConfig} />);
    expect(screen.getByTestId('charging-tip').className).toMatch(/amber/);
    expect(screen.getByTestId('tip-message')).toHaveTextContent(/mid-peak|off-peak/i);
  });

  it('treats winter super off-peak as a best charging window', () => {
    vi.setSystemTime(new Date('2026-01-15T02:00:00-08:00'));
    render(<ChargingTip planConfig={sceTouDConfig} />);
    expect(screen.getByTestId('charging-tip').className).toMatch(/blue/);
    expect(screen.getByTestId('tip-message')).toHaveTextContent(/cheapest|best time/i);
  });
});
