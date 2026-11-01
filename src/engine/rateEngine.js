import {
  assertValidDate, getPacificFractionalHour, buildPacificTime,
  getPacificTimeCandidates, getPacificDayTransitions,
} from '../utils/pacificTime';
import { PERIOD_COLORS } from '../constants/periodColors';
import { getScheduleHourShift } from './schedulePolicy';

// Period labels and color schemes now live in constants/periodColors.js.
// Re-exported here so existing engine consumers keep working.
export const PERIOD_DISPLAY = Object.fromEntries(
  Object.entries(PERIOD_COLORS).map(([period, { label, colorScheme }]) => [period, { label, colorScheme }])
);

const PACIFIC_MONTH_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  month: 'numeric',
});

const PACIFIC_DATE_STR_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric', month: '2-digit', day: '2-digit',
});

const PACIFIC_WEEKDAY_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  weekday: 'short',
});

function getPacificMonth(date) {
  return parseInt(PACIFIC_MONTH_FMT.format(date));
}

export function getPacificDateStr(date) {
  assertValidDate(date);
  const parts = Object.fromEntries(PACIFIC_DATE_STR_FMT.formatToParts(date).map(p => [p.type, p.value]));
  return `${parts.year.padStart(4, '0')}-${parts.month}-${parts.day}`;
}

function getPacificDayOfWeek(date) {
  // Returns 0 (Sunday) through 6 (Saturday) in Pacific Time
  const dayName = PACIFIC_WEEKDAY_FMT.format(date);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(dayName);
}

// Retained legacy observation assumption, NOT a verified shared FERC calendar.
const holidayCache = new Map();

/**
 * Computes the existing assumed holiday dates for a nominal holiday year.
 * Residential Saturday/Sunday observation remains verification-gated. PG&E's
 * non-residential TOU holiday page has different Saturday treatment and cannot
 * establish the EV-B/E-TOU-D residential policy by itself. Do not infer that
 * other utilities share this policy.
 * Returns an array of 'YYYY-MM-DD' strings.
 */
function getAssumedHolidayDates(year) {
  if (holidayCache.has(year)) return holidayCache.get(year);

  // nthWeekday: weekday 0=Sun..6=Sat; n>0 for nth occurrence, n<0 for last
  function nthWeekday(y, month, weekday, n) {
    const first = new Date(Date.UTC(y, month - 1, 1));
    const firstOcc = 1 + ((weekday - first.getUTCDay() + 7) % 7);
    if (n > 0) return new Date(Date.UTC(y, month - 1, firstOcc + (n - 1) * 7));
    const lastDay = new Date(Date.UTC(y, month, 0)).getUTCDate();
    let last = firstOcc;
    while (last + 7 <= lastDay) last += 7;
    return new Date(Date.UTC(y, month - 1, last));
  }

  // Observed date: Sat -> Fri, Sun -> Mon
  function observed(date) {
    const day = date.getUTCDay();
    if (day === 6) return new Date(date.getTime() - 86_400_000);
    if (day === 0) return new Date(date.getTime() + 86_400_000);
    return date;
  }

  function fmt(date) {
    return date.toISOString().slice(0, 10);
  }

  const dates = [
    fmt(observed(new Date(Date.UTC(year, 0, 1)))),    // New Year's Day
    fmt(nthWeekday(year, 2, 1, 3)),          // Presidents' Day: 3rd Monday of Feb
    fmt(nthWeekday(year, 5, 1, -1)),         // Memorial Day: last Monday of May
    fmt(observed(new Date(Date.UTC(year, 6, 4)))),     // Independence Day
    fmt(nthWeekday(year, 9, 1, 1)),          // Labor Day: 1st Monday of Sep
    fmt(observed(new Date(Date.UTC(year, 10, 11)))),   // Veterans Day
    fmt(nthWeekday(year, 11, 4, 4)),         // Thanksgiving: 4th Thursday of Nov
    fmt(observed(new Date(Date.UTC(year, 11, 25)))),   // Christmas Day
  ];

  if (holidayCache.size >= 128) holidayCache.delete(holidayCache.keys().next().value);
  holidayCache.set(year, dates);
  return dates;
}

// --- Exported functions ---

/**
 * Returns whether the Pacific date matches the retained holiday assumption.
 * This is an internally consistent calendar, not verified tariff observation.
 * EV-B and E-TOU-D TOU periods change on holidays.
 * @param {Date} date
 * @returns {boolean}
 */
export function isHoliday(date) {
  const dateStr = getPacificDateStr(date);
  const year = parseInt(dateStr.split('-')[0]);
  return [year - 1, year, year + 1].some(y => getAssumedHolidayDates(y).includes(dateStr));
}

/**
 * Returns the rate season for a given date and plan config.
 * Returns null for tiered plans (E-1) that have no seasons.
 * @param {Date} date
 * @param {Object} planConfig
 * @returns {'summer' | 'winter' | null}
 */
export function getSeason(date, planConfig) {
  assertValidDate(date);
  if (!planConfig.seasons) return null;
  const month = getPacificMonth(date);
  const { startMonth, endMonth } = planConfig.seasons.summer;
  return month >= startMonth && month <= endMonth ? 'summer' : 'winter';
}

/**
 * Returns true if a TOU window definition applies for the given day.
 * - 'all': every day
 * - 'weekdays': Mon–Fri; holidays use weekendsAndHolidays windows instead
 * - 'weekdaysExceptHolidays': Mon–Fri excluding holidays (same effective result as weekdays)
 * - 'weekendsAndHolidays': Sat, Sun, and PG&E holidays
 */
function windowApplies(windowDays, isWeekend, holiday) {
  switch (windowDays) {
    case 'all':                   return true;
    case 'weekdays':              return !isWeekend && !holiday;
    case 'weekdaysExceptHolidays': return !isWeekend && !holiday;
    case 'weekendsAndHolidays':   return isWeekend || holiday;
    default:                      return true;
  }
}

/**
 * Builds the flat [{period, startHour, endHour}] schedule for a given date and plan.
 * Derives the schedule from planConfig.touPeriods using the day-type filter.
 * Gaps between defined windows are filled with offPeak.
 * Returns [] for tiered plans (no touPeriods).
 */
function buildScheduleForDay(date, planConfig) {
  if (!planConfig.touPeriods) return [];

  const season = getSeason(date, planConfig);
  const touDef = planConfig.touPeriods[season];

  const dow = getPacificDayOfWeek(date);
  const isWeekend = dow === 0 || dow === 6;
  const holiday = isHoliday(date);
  const hourShift = getScheduleHourShift(getPacificDateStr(date), planConfig);

  const blocks = [];

  for (const [period, def] of Object.entries(touDef)) {
    if (period === 'offPeak') continue; // filled in at end
    const windows = Array.isArray(def) ? def : [def];
    for (const win of windows) {
      if (!win.start) continue; // offPeak sentinel has no start
      if (!windowApplies(win.days, isWeekend, holiday)) continue;

      const parseHour = value => {
        const [hour, minute] = value.split(':').map(Number);
        return hour + minute / 60;
      };
      const startHour = parseHour(win.start) + hourShift;
      const rawEnd = parseHour(win.end);
      const endHour = (rawEnd === 0 ? 24 : rawEnd) + hourShift;

      blocks.push({ period, startHour, endHour });
    }
  }

  blocks.sort((a, b) => a.startHour - b.startHour);

  // Fill gaps with offPeak
  const full = [];
  let cursor = 0;
  for (const block of blocks) {
    if (block.startHour > cursor) {
      full.push({ period: 'offPeak', startHour: cursor, endHour: block.startHour });
    }
    full.push(block);
    cursor = block.endHour;
  }
  if (cursor < 24) {
    full.push({ period: 'offPeak', startHour: cursor, endHour: 24 });
  }

  return full;
}

/**
 * Returns the TOU period for a given date and rate plan config.
 * Returns 'offPeak' for tiered plans (E-1).
 * @param {Date} date
 * @param {Object} planConfig
 * @returns {'peak' | 'partPeak' | 'offPeak'}
 */
export function getCurrentPeriod(date, planConfig) {
  assertValidDate(date);
  if (!planConfig.touPeriods) return 'offPeak';
  const hour = getPacificFractionalHour(date);
  const schedule = buildScheduleForDay(date, planConfig);
  const block = schedule.find(b => hour >= b.startHour && hour < b.endHour);
  return block ? block.period : 'offPeak';
}

/**
 * Returns the complete rate information for a given date and plan config.
 *
 * provider param (optional):
 *   'bundled' — returns totalBundled rate (for tests / direct engine calls)
 *   null      — reads pre-computed combined rate set by getEffectiveConfig() in App.jsx
 *
 * @param {Date} date
 * @param {Object} planConfig
 * @param {'bundled'|null} [provider]
 * @returns {{ period, season, rate, generation, delivery, periodLabel, colorScheme }}
 */
function getRateValues(planConfig, season, period, provider) {
  if (provider === 'bundled') {
    const delivery = planConfig.rates.delivery[season][period];
    const generation = planConfig.rates.generation[season][period];
    return {
      rate: planConfig.rates.totalBundled[season][period],
      delivery, generation, components: { delivery, generation },
    };
  }
  const cell = planConfig.rates[season][period];
  return {
    rate: cell.combined,
    delivery: cell.delivery,
    generation: cell.generation,
    components: cell.components ?? { delivery: cell.delivery, generation: cell.generation },
  };
}

export function getRate(date, planConfig, provider = null) {
  assertValidDate(date);
  if (!planConfig.touPeriods) {
    // E-1 tiered plan — flat rate, no TOU periods; _flatRate set by getEffectiveConfig
    const flat = planConfig._flatRate;
    return {
      period: 'offPeak',
      season: null,
      rate: flat ? flat.combined : null,
      generation: flat ? flat.generation : null,
      delivery: flat ? flat.delivery : null,
      components: flat ? (flat.components ?? { delivery: flat.delivery, generation: flat.generation }) : null,
      periodLabel: 'Flat Rate',
      colorScheme: 'emerald',
    };
  }

  const period = getCurrentPeriod(date, planConfig);
  const season = getSeason(date, planConfig);
  const { label: periodLabel, colorScheme } = PERIOD_DISPLAY[period];

  return { period, season, ...getRateValues(planConfig, season, period, provider), periodLabel, colorScheme };
}

/**
 * Returns the next strictly-future schedule/day/offset boundary for integration.
 * Midnight is retained even when rate/period do not change. Both occurrences
 * of repeated wall-clock boundaries and the DST reset/jump are considered.
 * @param {Date} date
 * @param {Object} planConfig
 * @returns {{ time: Date, newPeriod: string, newRate: number }}
 */
export function getNextIntegrationBoundary(date, planConfig, provider = null) {
  assertValidDate(date);
  const dateStr = getPacificDateStr(date);
  const schedule = buildScheduleForDay(date, planConfig);
  const hours = [...new Set(schedule.flatMap(b => [b.startHour, b.endHour]))]
    .filter(hour => hour > 0 && hour < 24);
  const candidates = [
    buildPacificTime(dateStr, 0, true),
    ...getPacificDayTransitions(dateStr),
    ...hours.flatMap(hour => getPacificTimeCandidates(dateStr, hour)),
  ].filter(time => time.getTime() > date.getTime());
  const time = new Date(Math.min(...candidates.map(candidate => candidate.getTime())));
  if (!Number.isFinite(time.getTime()) || time.getTime() <= date.getTime()) {
    throw new RangeError('No strictly-future Pacific integration boundary');
  }
  const { rate: newRate, period: newPeriod } = getRate(time, planConfig, provider);

  return { time, newPeriod, newRate };
}
/**
 * Next actual total-price change, not just a period label/day boundary.
 * Returns null for flat/uniform rates or when the configured repeating annual
 * schedule has no change in the next 370 days. Never rounds tariff precision.
 * Consumers must handle null rather than displaying a fabricated countdown.
 */
export function getNextRateChange(date, planConfig, provider = null) {
  assertValidDate(date);
  if (!planConfig.touPeriods) return null;
  const currentRate = getRate(date, planConfig, provider).rate;
  if (!Number.isFinite(currentRate)) throw new RangeError('Expected a finite TOU price');
  const cells = provider === 'bundled'
    ? Object.values(planConfig.rates.totalBundled).flatMap(season => Object.values(season))
    : Object.values(planConfig.rates).flatMap(season => Object.values(season).map(cell => cell.combined));
  if (cells.every(rate => rate === currentRate)) return null;

  const deadline = date.getTime() + 370 * 86_400_000;
  let cursor = date;
  // Day/schedule boundaries always advance; the absolute horizon bounds work
  // even for a config whose differently priced cells never actually apply.
  while (cursor.getTime() < deadline) {
    const next = getNextIntegrationBoundary(cursor, planConfig, provider);
    if (next.time.getTime() > deadline) break;
    if (!Number.isFinite(next.newRate)) throw new RangeError('Expected a finite TOU price');
    if (next.newRate !== currentRate) return next;
    cursor = next.time;
  }
  return null;
}

/**
 * Returns the full 24-hour rate schedule for a given date as an array of blocks.
 * Block count varies by plan and day type.
 * Returns [] for tiered plans (E-1).
 *
 * @param {Date} date
 * @param {Object} planConfig
 * @param {'bundled'|'cca'|null} [provider]
 * @returns {Array<{ startHour, endHour, period, rate, generation, delivery, periodLabel, colorScheme }>}
 */
export function getDaySchedule(date, planConfig, provider = null) {
  assertValidDate(date);
  if (!planConfig.touPeriods) return [];

  const season = getSeason(date, planConfig);
  const blocks = buildScheduleForDay(date, planConfig);

  return blocks.map(block => {

    const { label: periodLabel, colorScheme } = PERIOD_DISPLAY[block.period];
    return { ...block, ...getRateValues(planConfig, season, block.period, provider), periodLabel, colorScheme };
  });
}
