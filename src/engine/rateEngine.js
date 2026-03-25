import ratePlansData from '../data/ratePlans.json';
import { getPacificHour, buildPacificTime } from '../utils/pacificTime';

function getPacificMonth(date) {
  return parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      month: 'numeric',
    }).format(date)
  );
}

export function getPacificDateStr(date) {
  // en-CA locale produces YYYY-MM-DD format
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
  }).format(date);
}

function getPacificDayOfWeek(date) {
  // Returns 0 (Sunday) through 6 (Saturday) in Pacific Time
  const dayName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
  }).format(date);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(dayName);
}

// --- Exported functions ---

/**
 * Returns whether the given date is a PG&E-recognized holiday in Pacific Time.
 * EV-B TOU periods change on holidays (use weekend schedule).
 * @param {Date} date
 * @returns {boolean}
 */
export function isHoliday(date) {
  const dateStr = getPacificDateStr(date);
  return ratePlansData.holidays.dates.some(h => h.date === dateStr);
}

/**
 * Returns the TOU schedule blocks applicable for the given date and plan.
 * For plans with weekdayVariant=true (EV-B), returns weekday or weekend schedule.
 * @param {Date} date
 * @param {Object} planConfig
 * @returns {Array<{ period: string, startHour: number, endHour: number }>}
 */
function getScheduleForDay(date, planConfig) {
  if (!planConfig.weekdayVariant) {
    return planConfig.touSchedules.default;
  }
  const dow = getPacificDayOfWeek(date);
  const isWeekendOrHoliday = dow === 0 || dow === 6 || isHoliday(date);
  return isWeekendOrHoliday
    ? planConfig.touSchedules.weekend
    : planConfig.touSchedules.weekday;
}

/**
 * Returns the TOU period for a given date and rate plan config.
 * @param {Date} date
 * @param {Object} planConfig
 * @returns {'peak' | 'partPeak' | 'offPeak'}
 */
export function getCurrentPeriod(date, planConfig) {
  const hour = getPacificHour(date);
  const blocks = getScheduleForDay(date, planConfig);
  const block = blocks.find(b => hour >= b.startHour && hour < b.endHour);
  return block ? block.period : 'offPeak';
}

/**
 * Returns the rate season for a given date and plan config.
 * Season months are defined per-plan (EV-B has different season months than EV2-A).
 * @param {Date} date
 * @param {Object} planConfig
 * @returns {'summer' | 'winter'}
 */
export function getSeason(date, planConfig) {
  const month = getPacificMonth(date);
  return planConfig.seasons.summer.months.includes(month) ? 'summer' : 'winter';
}

/**
 * Returns the complete rate information for a given date and plan config.
 * @param {Date} date
 * @param {Object} planConfig
 * @returns {{ period: string, season: string, rate: number, generation: number, delivery: number, periodLabel: string, colorScheme: string }}
 */
export function getRate(date, planConfig) {
  const period = getCurrentPeriod(date, planConfig);
  const season = getSeason(date, planConfig);
  const { combined, generation, delivery } = planConfig.rates[season][period];
  const { label: periodLabel, colorScheme } = planConfig.touPeriods[period];
  return { period, season, rate: combined, generation, delivery, periodLabel, colorScheme };
}

/**
 * Returns the next time the TOU period will change, and the new period/rate.
 * @param {Date} date
 * @param {Object} planConfig
 * @returns {{ time: Date, newPeriod: string, newRate: number }}
 */
export function getNextRateChange(date, planConfig) {
  const hour = getPacificHour(date);
  const dateStr = getPacificDateStr(date);
  const blocks = getScheduleForDay(date, planConfig);

  // Extract sorted boundary hours (each block's endHour, excluding the final 24)
  const boundaries = blocks
    .map(b => b.endHour)
    .filter(h => h < 24)
    .sort((a, b) => a - b);

  const nextBoundaryHour = boundaries.find(b => b > hour);
  const isNextDay = nextBoundaryHour === undefined;
  const targetHour = isNextDay ? 0 : nextBoundaryHour;

  const time = buildPacificTime(dateStr, targetHour, isNextDay);
  const { rate: newRate, period: newPeriod } = getRate(time, planConfig);

  return { time, newPeriod, newRate };
}

/**
 * Returns the full 24-hour rate schedule for a given date as an array of blocks.
 * Block count varies by plan and day type (e.g., 4 for EV2-A, 5 for EV-B weekday, 3 for EV-B weekend).
 * @param {Date} date
 * @param {Object} planConfig
 * @returns {Array<{ startHour: number, endHour: number, period: string, rate: number, generation: number, delivery: number, periodLabel: string, colorScheme: string }>}
 */
export function getDaySchedule(date, planConfig) {
  const season = getSeason(date, planConfig);
  const blocks = getScheduleForDay(date, planConfig);
  return blocks.map(block => {
    const { combined: rate, generation, delivery } = planConfig.rates[season][block.period];
    const { label: periodLabel, colorScheme } = planConfig.touPeriods[block.period];
    return { ...block, rate, generation, delivery, periodLabel, colorScheme };
  });
}
