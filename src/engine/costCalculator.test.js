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
    const delivery = r.delivery.tier1;
    const generation = r.generation.allUsage;
    const combined = r.totalBundled.tier1;
    return { ...planConfig, _flatRate: { combined, delivery, generation } };
  }
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

// Build effective planConfig with 3CE 3cchoice generation rates
function buildCCAConfig(planConfig, ccaId = '3ce', tierId = null) {
  if (!planConfig.touPeriods) {
    const r = planConfig.rates;
    const ccaEntry = r.ccaGeneration[ccaId];
    const tier = tierId ?? ccaEntry.defaultTier;
    const delivery = r.delivery.tier1;
    const generation = ccaEntry.tiers[tier].allUsage;
    const combined = delivery + generation;
    return { ...planConfig, _flatRate: { combined, delivery, generation } };
  }
  const seasons = Object.keys(planConfig.rates.delivery);
  const rates = Object.fromEntries(
    seasons.map(season => [
      season,
      Object.fromEntries(
        Object.keys(planConfig.rates.delivery[season]).map(period => {
          const ccaEntry = planConfig.rates.ccaGeneration[ccaId];
          const tier = tierId ?? ccaEntry.defaultTier;
          const delivery = planConfig.rates.delivery[season][period];
          const generation = ccaEntry.tiers[tier][season][period];
          const combined = delivery + generation;
          return [period, { combined, delivery, generation }];
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

// ── CCA generation rate tests ────────────────────────────────────────────────

describe('ccaGeneration — EV2-A with 3CE 3cchoice vs 3cprime', () => {
  const ev2aRaw = ratePlans.ratePlans['EV2-A'];
  const ev2a3cchoice = buildCCAConfig(ev2aRaw, '3ce', '3cchoice');
  const ev2a3cprime  = buildCCAConfig(ev2aRaw, '3ce', '3cprime');

  it('3cchoice winter off-peak generation = 0.08449', () => {
    // delivery=0.13012, generation=0.08449, combined=0.21461
    const r = ev2a3cchoice.rates.winter.offPeak;
    expect(r.generation).toBeCloseTo(0.08449, 4);
    expect(r.combined).toBeCloseTo(0.13012 + 0.08449, 4);
  });

  it('3cprime winter off-peak generation = 0.09249 (higher than 3cchoice)', () => {
    const r = ev2a3cprime.rates.winter.offPeak;
    expect(r.generation).toBeCloseTo(0.09249, 4);
    expect(r.generation).toBeGreaterThan(ev2a3cchoice.rates.winter.offPeak.generation);
  });

  it('tier switch from 3cchoice to 3cprime raises combined rate', () => {
    const before = ev2a3cchoice.rates.summer.peak.combined;
    const after  = ev2a3cprime.rates.summer.peak.combined;
    expect(after).toBeGreaterThan(before);
    expect(after - before).toBeCloseTo(0.18441 - 0.17641, 4);
  });
});

describe('ccaGeneration — EV2-A with SJCE vs 3CE', () => {
  const ev2aRaw = ratePlans.ratePlans['EV2-A'];
  const ev2aSjce = buildCCAConfig(ev2aRaw, 'sjce', 'greensource');
  const ev2a3ce  = buildCCAConfig(ev2aRaw, '3ce', '3cchoice');

  it('SJCE greensource summer peak generation = 0.19494', () => {
    expect(ev2aSjce.rates.summer.peak.generation).toBeCloseTo(0.19494, 4);
  });

  it('SJCE and 3CE give different generation rates for the same plan', () => {
    expect(ev2aSjce.rates.summer.peak.generation).not.toBeCloseTo(
      ev2a3ce.rates.summer.peak.generation, 3
    );
  });

  it('SJCE combined = delivery + sjce generation', () => {
    const delivery = ratePlans.ratePlans["EV2-A"].rates.delivery.summer.peak;
    const gen = ratePlans.ratePlans['EV2-A'].rates.ccaGeneration.sjce.tiers.greensource.summer.peak;
    expect(ev2aSjce.rates.summer.peak.combined).toBeCloseTo(delivery + gen, 4);
  });
});

// ── Additional single-plan calcChargeCost coverage ───────────────────────────

describe('calcChargeCost — E-ELEC', () => {
  const eelecConfig = buildEffectiveConfig(ratePlans.ratePlans['E-ELEC']);

  // E-ELEC winter offPeak totalBundled = 0.28468
  // At 2 AM winter is off-peak for E-ELEC (same TOU windows as EV2-A)
  it('winter off-peak 2 AM, 30 kWh costs 30 × 0.28468', () => {
    const { totalCost } = calcChargeCost(new Date('2026-01-15T02:00:00-08:00'), 30, 7.7, eelecConfig);
    expect(totalCost).toBeCloseTo(30 * 0.28468, 2);
  });
});

describe('calcChargeCost — E-TOU-C', () => {
  const etoucConfig = buildEffectiveConfig(ratePlans.ratePlans['E-TOU-C']);

  // E-TOU-C summer peak totalBundled = 0.52240
  // E-TOU-C peak = 4–9 PM every day. 5 PM is inside the peak window.
  it('summer peak 5 PM, 20 kWh costs 20 × 0.52240', () => {
    const { totalCost } = calcChargeCost(new Date('2026-07-15T17:00:00-07:00'), 20, 7.7, etoucConfig);
    expect(totalCost).toBeCloseTo(20 * 0.52240, 2);
  });
});

describe('calcChargeCost — EV-B summer weekday (May 5 2026, Tuesday)', () => {
  const evbSummerConfig = buildEffectiveConfig(ratePlans.ratePlans['EV-B']);

  // May 5 2026 is a Tuesday — weekday. EV-B summer weekday peak = 2–9 PM.
  // 3 PM is inside the peak window. EV-B summer peak totalBundled = 0.62131.
  // 20 kWh at 7.7 kW → 20/7.7 ≈ 2.597h, stays entirely within peak (3 PM → ~5:35 PM).
  it('EV-B summer weekday peak at 3 PM, 20 kWh stays in single peak period', () => {
    const { totalCost } = calcChargeCost(new Date('2026-05-05T15:00:00-07:00'), 20, 7.7, evbSummerConfig);
    expect(totalCost).toBeCloseTo(20 * 0.62131, 2);
  });
});

describe('ccaGeneration — E-1 flat rate with multiple CCAs', () => {
  const e1Raw = ratePlans.ratePlans['E-1'];

  it('3CE 3cchoice allUsage = 0.11725', () => {
    const cfg = buildCCAConfig(e1Raw, '3ce', '3cchoice');
    expect(cfg._flatRate.generation).toBeCloseTo(0.11725, 4);
  });

  it('SJCE greensource allUsage = 0.13565', () => {
    const cfg = buildCCAConfig(e1Raw, 'sjce', 'greensource');
    expect(cfg._flatRate.generation).toBeCloseTo(0.13565, 4);
  });

  it('KCCP singletier allUsage = 0.07514 (lowest rate)', () => {
    const cfg = buildCCAConfig(e1Raw, 'kccp', 'singletier');
    expect(cfg._flatRate.generation).toBeCloseTo(0.07514, 4);
    expect(cfg._flatRate.combined).toBeCloseTo(0.19706 + 0.07514, 4);
  });
});
