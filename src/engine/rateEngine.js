import { getPacificHour, buildPacificTime } from '../utils/pacificTime';

// Period display metadata — single source of truth for labels and color schemes
export const PERIOD_DISPLAY = {
  peak:     { label: 'Peak',      colorScheme: 'red'     },
  partPeak: { label: 'Part-Peak', colorScheme: 'amber'   },
  offPeak:  { label: 'Off-Peak',  colorScheme: 'emerald' },
};

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

/**
 * Computes PG&E-observed holiday dates for a given year.
 * Returns an array of 'YYYY-MM-DD' strings.
 */
function getPGEHolidayDates(year) {
  // nthWeekday: weekday 0=Sun..6=Sat; n>0 for nth occurrence, n<0 for last
  function nthWeekday(y, month, weekday, n) {
    const first = new Date(y, month - 1, 1);
    const firstOcc = 1 + ((weekday - first.getDay() + 7) % 7);
    if (n > 0) return new Date(y, month - 1, firstOcc + (n - 1) * 7);
    const lastDay = new Date(y, month, 0).getDate();
    let last = firstOcc;
    while (last + 7 <= lastDay) last += 7;
    return new Date(y, month - 1, last);
  }

  // Observed date: Sat -> Fri, Sun -> Mon
  function observed(date) {
    const day = date.getDay();
    if (day === 6) return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
    if (day === 0) return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    return date;
  }

  function fmt(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  return [
    fmt(observed(new Date(year, 0, 1))),    // New Year's Day
    fmt(nthWeekday(year, 2, 1, 3)),          // Presidents' Day: 3rd Monday of Feb
    fmt(nthWeekday(year, 5, 1, -1)),         // Memorial Day: last Monday of May
    fmt(observed(new Date(year, 6, 4))),     // Independence Day
    fmt(nthWeekday(year, 9, 1, 1)),          // Labor Day: 1st Monday of Sep
    fmt(observed(new Date(year, 10, 11))),   // Veterans Day
    fmt(nthWeekday(year, 11, 4, 4)),         // Thanksgiving: 4th Thursday of Nov
    fmt(observed(new Date(year, 11, 25))),   // Christmas Day
  ];
}

// --- Exported functions ---

/**
 * Returns whether the given date is a PG&E-recognized holiday in Pacific Time.
 * EV-B and E-TOU-D TOU periods change on holidays.
 * @param {Date} date
 * @returns {boolean}
 */
export function isHoliday(date) {
  const dateStr = getPacificDateStr(date);
  const year = parseInt(dateStr.split('-')[0]);
  return getPGEHolidayDates(year).includes(dateStr);
}

/**
 * Returns the rate season for a given date and plan config.
 * Returns null for tiered plans (E-1) that have no seasons.
 * @param {Date} date
 * @param {Object} planConfig
 * @returns {'summer' | 'winter' | null}
 */
export function getSeason(date, planConfig) {
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

  const blocks = [];

  for (const [period, def] of Object.entries(touDef)) {
    if (period === 'offPeak') continue; // filled in at end
    const windows = Array.isArray(def) ? def : [def];
    for (const win of windows) {
      if (!win.start) continue; // offPeak sentinel has no start
      if (!windowApplies(win.days, isWeekend, holiday)) continue;

      const startHour = parseInt(win.start.split(':')[0]);
      const rawEnd = parseInt(win.end.split(':')[0]);
      const endHour = rawEnd === 0 ? 24 : rawEnd; // midnight = end of day

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
  if (!planConfig.touPeriods) return 'offPeak';
  const hour = getPacificHour(date);
  const schedule = buildScheduleForDay(date, planConfig);
  const block = schedule.find(b => hour >= b.startHour && hour < b.endHour);
  return block ? block.period : 'offPeak';
}

/**
 * Returns the complete rate information for a given date and plan config.
 *
 * provider param (optional):
 *   'bundled' — returns pgeTotalBundled rate (for tests / direct engine calls)
 *   'cca'     — returns pgeDelivery + cce rate (for tests / direct engine calls)
 *   null      — reads pre-computed combined rate set by getEffectiveConfig() in App.jsx
 *
 * @param {Date} date
 * @param {Object} planConfig
 * @param {'bundled'|'cca'|null} [provider]
 * @returns {{ period, season, rate, generation, delivery, periodLabel, colorScheme }}
 */
export function getRate(date, planConfig, provider = null) {
  if (!planConfig.touPeriods) {
    // E-1 tiered plan — no TOU periods
    return {
      period: 'offPeak',
      season: null,
      rate: null,
      generation: null,
      delivery: null,
      periodLabel: 'Flat Rate',
      colorScheme: 'emerald',
    };
  }

  const period = getCurrentPeriod(date, planConfig);
  const season = getSeason(date, planConfig);
  const { label: periodLabel, colorScheme } = PERIOD_DISPLAY[period];

  let rate, delivery, generation;

  if (provider === 'bundled') {
    rate = planConfig.rates.pgeTotalBundled[season][period];
    delivery = planConfig.rates.pgeDelivery[season][period];
    generation = planConfig.rates.pgeGeneration[season][period];
  } else if (provider === 'cca') {
    delivery = planConfig.rates.pgeDelivery[season][period];
    generation = planConfig.rates.cce[season][period];
    rate = delivery + generation;
  } else {
    // Default: read pre-computed combined set by getEffectiveConfig() in App.jsx
    const rateData = planConfig.rates[season][period];
    rate = rateData.combined;
    delivery = rateData.delivery;
    generation = rateData.generation;
  }

  return { period, season, rate, generation, delivery, periodLabel, colorScheme };
}

/**
 * Returns the next time the TOU period will change, and the new period/rate.
 * For tiered plans, returns a far-future sentinel (no rate changes).
 * @param {Date} date
 * @param {Object} planConfig
 * @returns {{ time: Date, newPeriod: string, newRate: number }}
 */
export function getNextRateChange(date, planConfig, provider = null) {
  if (!planConfig.touPeriods) {
    // Tiered plan — no rate changes
    return {
      time: new Date(date.getTime() + 365 * 24 * 60 * 60 * 1000),
      newPeriod: 'offPeak',
      newRate: null,
    };
  }

  const hour = getPacificHour(date);
  const dateStr = getPacificDateStr(date);
  const schedule = buildScheduleForDay(date, planConfig);

  // Extract sorted boundary hours (each block's endHour, excluding the final 24)
  const boundaries = schedule
    .map(b => b.endHour)
    .filter(h => h < 24)
    .sort((a, b) => a - b);

  const nextBoundaryHour = boundaries.find(b => b > hour);
  const isNextDay = nextBoundaryHour === undefined;
  const targetHour = isNextDay ? 0 : nextBoundaryHour;

  const time = buildPacificTime(dateStr, targetHour, isNextDay);
  const { rate: newRate, period: newPeriod } = getRate(time, planConfig, provider);

  return { time, newPeriod, newRate };
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
  if (!planConfig.touPeriods) return [];

  const season = getSeason(date, planConfig);
  const blocks = buildScheduleForDay(date, planConfig);

  return blocks.map(block => {
    let rate, delivery, generation;

    if (provider === 'bundled') {
      rate = planConfig.rates.pgeTotalBundled[season][block.period];
      delivery = planConfig.rates.pgeDelivery[season][block.period];
      generation = planConfig.rates.pgeGeneration[season][block.period];
    } else if (provider === 'cca') {
      delivery = planConfig.rates.pgeDelivery[season][block.period];
      generation = planConfig.rates.cce[season][block.period];
      rate = delivery + generation;
    } else {
      const rateData = planConfig.rates[season][block.period];
      rate = rateData.combined;
      delivery = rateData.delivery;
      generation = rateData.generation;
    }

    const { label: periodLabel, colorScheme } = PERIOD_DISPLAY[block.period];
    return { ...block, rate, generation, delivery, periodLabel, colorScheme };
  });
}
