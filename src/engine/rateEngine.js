import rates from '../data/rates.json';

// --- TOU boundary hours (Pacific Time) ---
const PEAK_START = 16;         // 4:00 PM
const PEAK_END = 21;           // 9:00 PM
const PART_PEAK_AFTERNOON = 15; // 3:00 PM (start of first part-peak window)

// Hours at which the TOU period changes, in order within a day
const PERIOD_BOUNDARIES = [15, 16, 21]; // midnight (0) handled as next-day case

// --- Pacific Time helpers ---

function getPacificHour(date) {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    hour12: false,
  }).format(date);
  // 'en-US' hour12:false returns '24' for midnight in some runtimes — normalize
  const hour = parseInt(formatted);
  return hour === 24 ? 0 : hour;
}

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

/**
 * Build a Date object representing a specific hour on the Pacific calendar date
 * of the given reference date. Uses a binary-search approach to find the UTC
 * millisecond that corresponds to the target Pacific wall-clock hour, which
 * correctly handles DST transitions without any hardcoded UTC offsets.
 */
function buildPacificTime(referenceDateStr, targetHour, nextDay = false) {
  // Parse the Pacific date parts
  const [year, month, day] = referenceDateStr.split('-').map(Number);
  const targetDay = nextDay ? day + 1 : day;

  // Start with a UTC noon guess on the target date (always within ±14h of any timezone)
  let guess = Date.UTC(year, month - 1, targetDay, 20, 0, 0); // 20:00 UTC ≈ noon Pacific

  // Iteratively correct until Pacific hour matches targetHour
  for (let i = 0; i < 25; i++) {
    const pacificHour = getPacificHour(new Date(guess));
    const diff = targetHour - pacificHour;
    if (diff === 0) break;
    guess += diff * 3600 * 1000;
  }

  return new Date(guess);
}

// --- Exported functions ---

/**
 * Returns the TOU period for a given date in Pacific Time.
 * @param {Date} date
 * @returns {'peak' | 'partPeak' | 'offPeak'}
 */
export function getCurrentPeriod(date) {
  const hour = getPacificHour(date);
  if (hour >= PEAK_START && hour < PEAK_END) return 'peak';
  if (hour === PART_PEAK_AFTERNOON || hour >= PEAK_END) return 'partPeak';
  return 'offPeak';
}

/**
 * Returns the rate season for a given date based on Pacific Time month.
 * @param {Date} date
 * @returns {'summer' | 'winter'}
 */
export function getSeason(date) {
  const month = getPacificMonth(date);
  return month >= 6 && month <= 9 ? 'summer' : 'winter';
}

/**
 * Returns whether the given date is a PG&E-recognized holiday in Pacific Time.
 * Note: EV2-A TOU periods do NOT change on holidays — this is for informational use.
 * @param {Date} date
 * @returns {boolean}
 */
export function isHoliday(date) {
  const dateStr = getPacificDateStr(date);
  return rates.holidays.dates.some(h => h.date === dateStr);
}

/**
 * Returns the complete rate information for a given date.
 * @param {Date} date
 * @returns {{ period: string, season: string, rate: number, generation: number, delivery: number, periodLabel: string, colorScheme: string }}
 */
export function getRate(date) {
  const period = getCurrentPeriod(date);
  const season = getSeason(date);
  const { combined, generation, delivery } = rates.rates[season][period];
  const { label: periodLabel, colorScheme } = rates.touPeriods[period];
  return { period, season, rate: combined, generation, delivery, periodLabel, colorScheme };
}

/**
 * Returns the next time the TOU period will change, and the new period/rate.
 * @param {Date} date
 * @returns {{ time: Date, newPeriod: string, newRate: number }}
 */
export function getNextRateChange(date) {
  const hour = getPacificHour(date);
  const dateStr = getPacificDateStr(date);

  const nextBoundaryHour = PERIOD_BOUNDARIES.find(b => b > hour);
  const isNextDay = nextBoundaryHour === undefined;
  const targetHour = isNextDay ? 0 : nextBoundaryHour;

  const time = buildPacificTime(dateStr, targetHour, isNextDay);
  const { rate: newRate, period: newPeriod } = getRate(time);

  return { time, newPeriod, newRate };
}

/**
 * Returns the full 24-hour rate schedule for a given date as an array of blocks.
 * The schedule is always the same structure (EV2-A rates don't change by day of week).
 * @param {Date} date
 * @returns {Array<{ startHour: number, endHour: number, period: string, rate: number, generation: number, delivery: number, periodLabel: string, colorScheme: string }>}
 */
export function getDaySchedule(date) {
  const season = getSeason(date);
  const blocks = [
    { startHour: 0,  endHour: 15, period: 'offPeak' },
    { startHour: 15, endHour: 16, period: 'partPeak' },
    { startHour: 16, endHour: 21, period: 'peak' },
    { startHour: 21, endHour: 24, period: 'partPeak' },
  ];
  return blocks.map(block => {
    const { combined: rate, generation, delivery } = rates.rates[season][block.period];
    const { label: periodLabel, colorScheme } = rates.touPeriods[block.period];
    return { ...block, rate, generation, delivery, periodLabel, colorScheme };
  });
}
