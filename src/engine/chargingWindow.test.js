import { describe, it, expect } from 'vitest';
import { calculateChargingWindow, getWindowSegments } from './chargingWindow';
import { buildEffectivePlanConfig } from '../data/effectivePlanConfig';
import rates from '../data/ratePlans.json';
import areas from '../data/serviceAreas.json';

const plan = buildEffectivePlanConfig({
  planConfig: rates.ratePlans['EV2-A'],
  serviceArea: areas.serviceAreas['pge-3ce-sbco'],
  providerId: 'pge',
});
const args = {
  date: '2026-01-15',
  startHour: 0,
  endHour: 6,
  batteryKwh: 60,
  currentPct: 20,
  targetPct: 80,
  chargingKw: 7.7,
  efficiency: 0.9,
  planConfig: plan,
};
describe('selected charging windows', () => {
  it('caps delivered charge at the window end and reconciles cost components', () => {
    const result = calculateChargingWindow({ ...args, endHour: 2 });
    expect(result.meteredKwh).toBeCloseTo(15.4);
    expect(result.finalPct).toBeCloseTo(43.1);
    expect(result.complete).toBe(false);
    expect(Object.values(result.componentCosts).reduce((a, b) => a + b, 0)).toBeCloseTo(
      result.totalCost,
      8,
    );
  });
  it('integrates both sides of the 4 PM boundary', () => {
    const result = calculateChargingWindow({ ...args, startHour: 15.5, endHour: 16.5 });
    expect(result.totalCost).toBeCloseTo(
      7.7 * 0.5 * (plan.rates.winter.partPeak.combined + plan.rates.winter.peak.combined),
      6,
    );
  });
  it('crosses midnight and stops when the target is reached', () => {
    const result = calculateChargingWindow({ ...args, startHour: 21, endHour: 6 });
    expect(result.complete).toBe(true);
    expect(result.meteredKwh).toBeCloseTo(40);
    expect(result.finish.getTime()).toBeLessThan(result.end.getTime());
    expect(getWindowSegments(21, 6)).toEqual([
      [0, 6],
      [21, 24],
    ]);
  });
  it('uses actual elapsed time on the Pacific spring and fall DST days', () => {
    expect(calculateChargingWindow({ ...args, date: '2026-03-08', endHour: 4 }).windowHours).toBe(
      3,
    );
    expect(calculateChargingWindow({ ...args, date: '2026-11-01', endHour: 4 }).windowHours).toBe(
      5,
    );
  });
  it('supports a whole calendar day and a target already reached', () => {
    expect(calculateChargingWindow({ ...args, endHour: 0 }).windowHours).toBe(24);
    expect(calculateChargingWindow({ ...args, currentPct: 90 }).totalCost).toBe(0);
    expect(getWindowSegments(0, 0)).toEqual([[0, 24]]);
  });
});


describe('nonexistent Pacific window endpoints', () => {
  it.each([
    ['2026-03-08', 1.5, 2.5],
    ['2026-03-08', 2.5, 4],
    ['2026-03-07', 23, 2.5],
  ])('rejects skipped times for %s, %s to %s', (date, startHour, endHour) => {
    expect(() => calculateChargingWindow({ ...args, date, startHour, endHour }))
      .toThrow(/does not exist.*daylight-saving/i);
  });
  it('retains the earlier occurrence of repeated fall times', () => {
    const result = calculateChargingWindow({ ...args, date: '2026-11-01', startHour: 1.5, endHour: 2.5 });
    expect(result.windowHours).toBe(2);
  });
});
