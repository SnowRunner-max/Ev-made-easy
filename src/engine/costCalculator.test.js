import { describe, it, expect } from 'vitest';
import ratePlans from '../data/ratePlans.json';
import { calcChargeCost, findCheapestWindow, calcChargeSummary } from './costCalculator';

// All PST dates use January 15, 2026 (-08:00). EV-B weekday = Tuesday Jan 6.

const ev2aRaw = ratePlans.ratePlans['EV2-A'];
const evbRaw  = ratePlans.ratePlans['EV-B'];

// Build effective planConfig with pre-computed combined rates (bundled provider)
function buildEffectiveConfig(planConfig) {
  if (!planConfig.touPeriods) {
    // Tiered plan (E-1): compute flat tier-1 rate, mirroring getEffectiveConfig in App.jsx
    const r = planConfig.rates;
    const delivery = r.pgeDelivery.tier1;
    const generation = r.pgeGeneration.allUsage;
    const combined = r.pgeTotalBundled.tier1;
    return { ...planConfig, _flatRate: { combined, delivery, generation } };
  }
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

const ev2aConfig = buildEffectiveConfig(ev2aRaw);
const evbConfig  = buildEffectiveConfig(evbRaw);

// EV2-A bundled rates used in assertions:
//   winter offPeak=0.22558, partPeak=0.39428, peak=0.41099
//   summer peak=0.53809

describe('calcChargeCost — EV2-A', () => {
  it('single period: winter off-peak 2 AM, 45 kWh', () => {
    const { totalCost } = calcChargeCost(new Date('2026-01-15T02:00:00-08:00'), 45, 7.7, ev2aConfig);
    expect(totalCost).toBeCloseTo(45 * 0.22558, 1);
  });

  it('single period: winter peak 5 PM, 10 kWh', () => {
    const { totalCost } = calcChargeCost(new Date('2026-01-15T17:00:00-08:00'), 10, 7.7, ev2aConfig);
    expect(totalCost).toBeCloseTo(10 * 0.41099, 1);
  });

  it('multi-period: part-peak → peak starting at 3 PM, 45 kWh', () => {
    // 1h part-peak: 7.7 × 0.39428 = 3.04; then 37.3 kWh peak: 37.3 × 0.41099 = 15.33 → ~18.37
    const { totalCost } = calcChargeCost(new Date('2026-01-15T15:00:00-08:00'), 45, 7.7, ev2aConfig);
    expect(totalCost).toBeCloseTo(18.37, 1);
  });

  it('multi-period: peak → part-peak starting at 8 PM, 20 kWh', () => {
    // 1h peak: 7.7 × 0.41099 = 3.16; 12.3 kWh part-peak: 12.3 × 0.39428 = 4.85 → ~8.01
    const { totalCost } = calcChargeCost(new Date('2026-01-15T20:00:00-08:00'), 20, 7.7, ev2aConfig);
    expect(totalCost).toBeCloseTo(8.01, 1);
  });

  it('multi-period: part-peak → off-peak crossing midnight, 10 PM, 20 kWh', () => {
    // 2h part-peak: 15.4 × 0.39428 = 6.07; 4.6 kWh off-peak: 4.6 × 0.22558 = 1.04 → ~7.11
    const { totalCost } = calcChargeCost(new Date('2026-01-15T22:00:00-08:00'), 20, 7.7, ev2aConfig);
    expect(totalCost).toBeCloseTo(7.11, 1);
  });

  it('returns hoursNeeded = kwhNeeded / chargingKw', () => {
    const { hoursNeeded } = calcChargeCost(new Date('2026-01-15T02:00:00-08:00'), 45, 7.7, ev2aConfig);
    expect(hoursNeeded).toBeCloseTo(45 / 7.7, 3);
  });

  it('returns $0 when kwhNeeded is 0', () => {
    const { totalCost } = calcChargeCost(new Date('2026-01-15T02:00:00-08:00'), 0, 7.7, ev2aConfig);
    expect(totalCost).toBe(0);
  });
});

describe('calcChargeCost — EV-B weekday (Tuesday Jan 6, winter)', () => {
  it('single period: off-peak 3 AM, 30 kWh', () => {
    const { totalCost } = calcChargeCost(new Date('2026-01-06T03:00:00-08:00'), 30, 7.7, evbConfig);
    expect(totalCost).toBeCloseTo(30 * 0.23504, 1);
  });

  it('multi-period: part-peak → peak at noon, 30 kWh', () => {
    // 2h part-peak: 15.4 × 0.30677 = 4.72; 14.6 kWh peak: 14.6 × 0.43878 = 6.41 → ~11.13
    const { totalCost } = calcChargeCost(new Date('2026-01-06T12:00:00-08:00'), 30, 7.7, evbConfig);
    expect(totalCost).toBeCloseTo(11.13, 1);
  });
});

describe('findCheapestWindow — EV2-A', () => {
  it('finds midnight (off-peak) as cheapest start for 45 kWh', () => {
    const { startHour, totalCost } = findCheapestWindow(new Date('2026-01-15T14:00:00-08:00'), 45, 7.7, ev2aConfig);
    expect(startHour).toBe(0);
    expect(totalCost).toBeCloseTo(45 * 0.22558, 1);
  });

  it('cheapest cost <= cost of starting now (peak)', () => {
    const date = new Date('2026-01-15T17:00:00-08:00');
    const { totalCost: cheapest } = findCheapestWindow(date, 30, 7.7, ev2aConfig);
    const { totalCost: now } = calcChargeCost(date, 30, 7.7, ev2aConfig);
    expect(cheapest).toBeLessThanOrEqual(now + 0.01);
  });
});

describe('findCheapestWindow — EV-B', () => {
  it('finds off-peak start for weekday 30 kWh', () => {
    const { startHour, totalCost } = findCheapestWindow(new Date('2026-01-06T17:00:00-08:00'), 30, 7.7, evbConfig);
    expect(startHour).toBeLessThan(7);
    expect(totalCost).toBeCloseTo(30 * 0.23504, 1);
  });
});

describe('calcChargeSummary — EV2-A', () => {
  it('returns to80 and to100 objects', () => {
    const result = calcChargeSummary(new Date('2026-01-15T02:00:00-08:00'), 60, 20, 7.7, ev2aConfig);
    expect(result).toHaveProperty('to80');
    expect(result).toHaveProperty('to100');
  });

  it('calculates kWh needed for each target', () => {
    const { to80, to100 } = calcChargeSummary(new Date('2026-01-15T02:00:00-08:00'), 60, 20, 7.7, ev2aConfig);
    expect(to80.kwhNeeded).toBeCloseTo(36, 2);
    expect(to100.kwhNeeded).toBeCloseTo(48, 2);
  });

  it('costNow at 2 AM off-peak for 36 kWh', () => {
    const { to80 } = calcChargeSummary(new Date('2026-01-15T02:00:00-08:00'), 60, 20, 7.7, ev2aConfig);
    expect(to80.costNow).toBeCloseTo(36 * 0.22558, 1);
  });

  it('savings = costNow - cheapestCost, non-negative', () => {
    const { to80 } = calcChargeSummary(new Date('2026-01-15T17:00:00-08:00'), 60, 20, 7.7, ev2aConfig);
    expect(to80.savings).toBeCloseTo(to80.costNow - to80.cheapestCost, 4);
    expect(to80.savings).toBeGreaterThanOrEqual(0);
  });

  it('returns null for to80 when currentPct >= 80', () => {
    const { to80 } = calcChargeSummary(new Date('2026-01-15T02:00:00-08:00'), 60, 85, 7.7, ev2aConfig);
    expect(to80).toBeNull();
  });

  it('returns null for both when currentPct = 100', () => {
    const { to80, to100 } = calcChargeSummary(new Date('2026-01-15T02:00:00-08:00'), 60, 100, 7.7, ev2aConfig);
    expect(to80).toBeNull();
    expect(to100).toBeNull();
  });
});

// E-1 bundled tier1 rates: combined=0.32561, delivery=0.19706, generation=0.12855
const e1Config = buildEffectiveConfig(ratePlans.ratePlans['E-1']);

describe('calcChargeCost — E-1 tiered', () => {
  it('calculates cost using flat tier-1 rate (any hour, same result)', () => {
    const { totalCost } = calcChargeCost(new Date('2026-01-15T14:00:00-08:00'), 45, 7.7, e1Config);
    expect(totalCost).toBeCloseTo(45 * 0.32561, 2);
  });

  it('same flat rate at peak hour as off-peak hour', () => {
    const { totalCost: costPeak } = calcChargeCost(new Date('2026-01-15T17:00:00-08:00'), 20, 7.7, e1Config);
    const { totalCost: costOffPeak } = calcChargeCost(new Date('2026-01-15T02:00:00-08:00'), 20, 7.7, e1Config);
    expect(costPeak).toBeCloseTo(costOffPeak, 4);
  });
});

describe('calcChargeSummary — E-1 tiered', () => {
  it('returns non-zero costNow for 20% starting charge', () => {
    const { to80 } = calcChargeSummary(new Date('2026-01-15T14:00:00-08:00'), 60, 20, 7.7, e1Config);
    expect(to80.costNow).toBeGreaterThan(0);
    expect(to80.costNow).toBeCloseTo(36 * 0.32561, 2);
  });

  it('savings is 0 since all hours cost the same', () => {
    const { to80 } = calcChargeSummary(new Date('2026-01-15T17:00:00-08:00'), 60, 20, 7.7, e1Config);
    expect(to80.savings).toBeCloseTo(0, 2);
  });
});
