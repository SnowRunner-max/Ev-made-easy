import { describe, it, expect } from 'vitest';
import { buildPacificTime, getPacificHour, getPacificFractionalHour } from './pacificTime';

describe('buildPacificTime — calendar-aware Pacific wall times', () => {
  it.each([
    ['2026-03-08', 0, false, '2026-03-08T08:00:00.000Z'],
    ['2026-03-07', 0, true, '2026-03-08T08:00:00.000Z'],
    ['2026-03-08', 3, false, '2026-03-08T10:00:00.000Z'],
    ['2026-11-01', 0, false, '2026-11-01T07:00:00.000Z'],
    ['2026-11-01', 3, false, '2026-11-01T11:00:00.000Z'],
    ['2026-12-31', 0, true, '2027-01-01T08:00:00.000Z'],
    ['2028-02-28', 0, true, '2028-02-29T08:00:00.000Z'],
    ['2026-02-28', 0, true, '2026-03-01T08:00:00.000Z'],
    ['2026-07-01', 14.5, false, '2026-07-01T21:30:00.000Z'],
  ])('%s hour %s nextDay=%s stays on the intended calendar date', (day, hour, nextDay, iso) => {
    expect(buildPacificTime(day, hour, nextDay).toISOString()).toBe(iso);
  });

  it('chooses the first repeated hour by default and allows the second explicitly', () => {
    expect(buildPacificTime('2026-11-01', 1).toISOString()).toBe('2026-11-01T08:00:00.000Z');
    expect(buildPacificTime('2026-11-01', 1, false, 'later').toISOString()).toBe('2026-11-01T09:00:00.000Z');
    expect(() => buildPacificTime('2026-11-01', 1, false, 'reject')).toThrow(RangeError);
  });

  it('advances nonexistent spring hours by the gap, with explicit alternatives', () => {
    expect(buildPacificTime('2026-03-08', 2).toISOString()).toBe('2026-03-08T10:00:00.000Z');
    expect(buildPacificTime('2026-03-08', 2.5).toISOString()).toBe('2026-03-08T10:30:00.000Z');
    expect(buildPacificTime('2026-03-08', 2, false, 'earlier').toISOString()).toBe('2026-03-08T09:00:00.000Z');
    expect(() => buildPacificTime('2026-03-08', 2, false, 'reject')).toThrow(RangeError);
  });

  it.each(['2026-02-30', '2026-13-01', '2026-00-10', '2026-1-01', 'not-a-date', '', null])(
    'rejects invalid calendar input %s instead of normalizing it', day => {
      expect(() => buildPacificTime(day, 0)).toThrow(RangeError);
    }
  );

  it.each([-1, 24, NaN, Infinity, '3', null])('rejects invalid hour %s', hour => {
    expect(() => buildPacificTime('2026-01-01', hour)).toThrow(RangeError);
  });

  it('rejects invalid nextDay and disambiguation inputs', () => {
    expect(() => buildPacificTime('2026-01-01', 0, 'yes')).toThrow(RangeError);
    expect(() => buildPacificTime('2026-01-01', 0, false, 'guess')).toThrow(RangeError);
  });

  it('rejects invalid Date values in time readers', () => {
    expect(() => getPacificHour(new Date(NaN))).toThrow(RangeError);
    expect(() => getPacificFractionalHour(new Date(NaN))).toThrow(RangeError);
  });
});
