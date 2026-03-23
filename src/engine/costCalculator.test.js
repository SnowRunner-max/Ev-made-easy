import { describe, it, expect } from 'vitest';
import { calcChargeCost, findCheapestWindow, calcChargeSummary } from './costCalculator';

// All PST test dates use January 15, 2026 (-08:00) to avoid DST ambiguity.
// All PDT test dates use July 15, 2026 (-07:00).

describe('calcChargeCost', () => {
  describe('single-period charging', () => {
    it('calculates cost entirely in winter off-peak (2 AM, 45 kWh)', () => {
      // 45 / 7.7 = 5.84h — fits entirely in off-peak (ends 3 PM)
      const start = new Date('2026-01-15T02:00:00-08:00');
      const { totalCost } = calcChargeCost(start, 45);
      expect(totalCost).toBeCloseTo(45 * 0.22261, 1); // ≈ $10.02
    });

    it('calculates cost entirely in winter off-peak (10 AM, 10 kWh)', () => {
      const start = new Date('2026-01-15T10:00:00-08:00');
      const { totalCost } = calcChargeCost(start, 10);
      expect(totalCost).toBeCloseTo(10 * 0.22261, 1); // ≈ $2.23
    });

    it('calculates cost entirely in winter peak (5 PM, 10 kWh)', () => {
      // 10 / 7.7 = 1.3h — peak runs until 9 PM, plenty of room
      const start = new Date('2026-01-15T17:00:00-08:00');
      const { totalCost } = calcChargeCost(start, 10);
      expect(totalCost).toBeCloseTo(10 * 0.40766, 1); // ≈ $4.08
    });

    it('calculates cost entirely in summer peak (5 PM, 10 kWh)', () => {
      const start = new Date('2026-07-15T17:00:00-07:00');
      const { totalCost } = calcChargeCost(start, 10);
      expect(totalCost).toBeCloseTo(10 * 0.53420, 1); // ≈ $5.34
    });
  });

  describe('multi-period charging', () => {
    it('spans part-peak → peak starting at 3 PM (45 kWh)', () => {
      // 3–4 PM (part-peak, 1h): 7.7 kWh × $0.39108 = $3.01
      // 4 PM onward (peak):     37.3 kWh × $0.40766 = $15.21
      // total ≈ $18.22
      const start = new Date('2026-01-15T15:00:00-08:00');
      const { totalCost } = calcChargeCost(start, 45);
      expect(totalCost).toBeCloseTo(18.22, 1);
    });

    it('spans peak → part-peak starting at 8 PM (20 kWh)', () => {
      // 8–9 PM (peak, 1h):       7.7 kWh × $0.40766 = $3.14
      // 9 PM onward (part-peak): 12.3 kWh × $0.39108 = $4.81
      // total ≈ $7.95
      const start = new Date('2026-01-15T20:00:00-08:00');
      const { totalCost } = calcChargeCost(start, 20);
      expect(totalCost).toBeCloseTo(7.95, 1);
    });

    it('spans part-peak → off-peak crossing midnight (20 kWh, 10 PM)', () => {
      // 10 PM–midnight (part-peak, 2h): 15.4 kWh × $0.39108 = $6.02
      // midnight onward (off-peak):      4.6 kWh × $0.22261 = $1.02
      // total ≈ $7.05
      const start = new Date('2026-01-15T22:00:00-08:00');
      const { totalCost } = calcChargeCost(start, 20);
      expect(totalCost).toBeCloseTo(7.05, 1);
    });
  });

  describe('return values', () => {
    it('returns hoursNeeded = kwhNeeded / chargingKw', () => {
      const start = new Date('2026-01-15T02:00:00-08:00');
      const { hoursNeeded } = calcChargeCost(start, 45);
      expect(hoursNeeded).toBeCloseTo(45 / 7.7, 3);
    });

    it('returns $0 cost when kwhNeeded is 0', () => {
      const start = new Date('2026-01-15T02:00:00-08:00');
      const { totalCost } = calcChargeCost(start, 0);
      expect(totalCost).toBe(0);
    });

    it('respects a custom chargingKw argument', () => {
      const start = new Date('2026-01-15T02:00:00-08:00');
      const { hoursNeeded } = calcChargeCost(start, 22, 11);
      expect(hoursNeeded).toBeCloseTo(22 / 11, 3); // 2 hours
    });
  });
});

describe('findCheapestWindow', () => {
  it('finds midnight as cheapest start for winter off-peak (45 kWh)', () => {
    const date = new Date('2026-01-15T14:00:00-08:00');
    const { startHour, totalCost } = findCheapestWindow(date, 45);
    // 45 kWh / 7.7 kW = 5.84h — midnight to ~5:50 AM, all off-peak
    expect(startHour).toBe(0);
    expect(totalCost).toBeCloseTo(45 * 0.22261, 1);
  });

  it('returns a start hour between 0 and 23', () => {
    const date = new Date('2026-01-15T14:00:00-08:00');
    const { startHour } = findCheapestWindow(date, 10);
    expect(startHour).toBeGreaterThanOrEqual(0);
    expect(startHour).toBeLessThanOrEqual(23);
  });

  it('cheapest cost is always <= cost of starting now', () => {
    // Starting at 5 PM (peak) — cheapest window must be cheaper or equal
    const date = new Date('2026-01-15T17:00:00-08:00');
    const { totalCost: cheapest } = findCheapestWindow(date, 30);
    const { totalCost: now } = calcChargeCost(date, 30);
    expect(cheapest).toBeLessThanOrEqual(now + 0.01); // +0.01 for float tolerance
  });

  it('works for summer rates', () => {
    const date = new Date('2026-07-15T17:00:00-07:00');
    const { startHour, totalCost } = findCheapestWindow(date, 30);
    expect(startHour).toBeGreaterThanOrEqual(0);
    expect(totalCost).toBeGreaterThan(0);
  });
});

describe('calcChargeSummary', () => {
  it('returns to80 and to100 objects', () => {
    const start = new Date('2026-01-15T02:00:00-08:00');
    const result = calcChargeSummary(start, 60, 20);
    expect(result).toHaveProperty('to80');
    expect(result).toHaveProperty('to100');
  });

  it('calculates correct kWh needed for each target', () => {
    const start = new Date('2026-01-15T02:00:00-08:00');
    const { to80, to100 } = calcChargeSummary(start, 60, 20);
    // 60 kWh × (80-20)% = 36 kWh; 60 × (100-20)% = 48 kWh
    expect(to80.kwhNeeded).toBeCloseTo(36, 2);
    expect(to100.kwhNeeded).toBeCloseTo(48, 2);
  });

  it('calculates correct hoursNeeded for each target', () => {
    const start = new Date('2026-01-15T02:00:00-08:00');
    const { to80, to100 } = calcChargeSummary(start, 60, 20);
    expect(to80.hoursNeeded).toBeCloseTo(36 / 7.7, 2);
    expect(to100.hoursNeeded).toBeCloseTo(48 / 7.7, 2);
  });

  it('calculates costNow correctly (2 AM off-peak, 36 kWh)', () => {
    const start = new Date('2026-01-15T02:00:00-08:00');
    const { to80 } = calcChargeSummary(start, 60, 20);
    expect(to80.costNow).toBeCloseTo(36 * 0.22261, 1); // ≈ $8.01
  });

  it('includes cheapestCost and savings fields', () => {
    const start = new Date('2026-01-15T02:00:00-08:00');
    const { to80 } = calcChargeSummary(start, 60, 20);
    expect(to80).toHaveProperty('cheapestCost');
    expect(to80).toHaveProperty('savings');
  });

  it('savings = costNow - cheapestCost', () => {
    const start = new Date('2026-01-15T17:00:00-08:00'); // peak — should have savings
    const { to80 } = calcChargeSummary(start, 60, 20);
    expect(to80.savings).toBeCloseTo(to80.costNow - to80.cheapestCost, 4);
  });

  it('savings are non-negative (cheapest is always <= now)', () => {
    const start = new Date('2026-01-15T17:00:00-08:00');
    const { to80, to100 } = calcChargeSummary(start, 60, 20);
    expect(to80.savings).toBeGreaterThanOrEqual(0);
    expect(to100.savings).toBeGreaterThanOrEqual(0);
  });

  it('returns null for to80 when currentPct is already >= 80', () => {
    const start = new Date('2026-01-15T02:00:00-08:00');
    const { to80 } = calcChargeSummary(start, 60, 85);
    expect(to80).toBeNull();
  });

  it('returns null for both when currentPct is 100', () => {
    const start = new Date('2026-01-15T02:00:00-08:00');
    const { to80, to100 } = calcChargeSummary(start, 60, 100);
    expect(to80).toBeNull();
    expect(to100).toBeNull();
  });

  it('returns null for to100 when currentPct is exactly 100', () => {
    const start = new Date('2026-01-15T02:00:00-08:00');
    const { to100 } = calcChargeSummary(start, 60, 100);
    expect(to100).toBeNull();
  });
});
