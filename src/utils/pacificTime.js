/**
 * Shared Pacific Time utility functions.
 * All functions interpret dates in America/Los_Angeles timezone.
 */

const PACIFIC_HOUR_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  hour: 'numeric',
  hour12: false,
});

const PACIFIC_FRACTIONAL_HOUR_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  hour: 'numeric',
  minute: 'numeric',
  hour12: false,
});

const PACIFIC_12H_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  hour: 'numeric',
  hour12: true,
});
const PACIFIC_PARTS_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hourCycle: 'h23',
});
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const offsetCache = new Map();

export function assertValidDate(date) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    throw new RangeError('Expected a valid Date');
  }
}

function utcCalendarTime(year, month, day) {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
}

function pacificWallTime(date) {
  const parts = Object.fromEntries(
    PACIFIC_PARTS_FMT.formatToParts(date)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, Number(part.value)])
  );
  return utcCalendarTime(parts.year, parts.month, parts.day)
    + parts.hour * HOUR_MS + parts.minute * 60_000 + parts.second * 1000;
}

function offsetAt(time) {
  return pacificWallTime(new Date(time)) - Math.floor(time / 1000) * 1000;
}

function wallTimeOptions(dateStr, targetHour, nextDay) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new RangeError('Expected a Pacific calendar date in YYYY-MM-DD format');
  }
  if (!Number.isFinite(targetHour) || targetHour < 0 || targetHour >= 24 || typeof nextDay !== 'boolean') {
    throw new RangeError('Expected an hour in [0, 24) and a boolean nextDay');
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  const calendarTime = utcCalendarTime(year, month, day);
  const calendar = new Date(calendarTime);
  if (year < 1 || calendar.getUTCFullYear() !== year
    || calendar.getUTCMonth() + 1 !== month || calendar.getUTCDate() !== day) {
    throw new RangeError('Invalid Pacific calendar date');
  }

  const dayTime = calendarTime + (nextDay ? DAY_MS : 0);
  const wallTime = dayTime + Math.round(targetHour * HOUR_MS);
  let offsets = offsetCache.get(dayTime);
  if (!offsets) {
    // Sample both sides of a possible offset change; never infer the offset
    // from the host timezone or correct just the hour without the date.
    offsets = [...new Set([-DAY_MS, 0, DAY_MS].map(delta => offsetAt(dayTime + delta)))];
    if (offsetCache.size >= 128) offsetCache.delete(offsetCache.keys().next().value);
    offsetCache.set(dayTime, offsets);
  }
  const alternatives = offsets.map(offset => wallTime - offset).sort((a, b) => a - b);
  const candidates = alternatives.filter(time => {
    const represented = pacificWallTime(new Date(time)) + ((time % 1000) + 1000) % 1000;
    return represented === wallTime;
  });
  return { candidates, alternatives };
}

/**
 * Returns the Pacific Time hour (0–23) for the given Date.
 * Normalizes the 'en-US' hour12:false quirk where midnight may return '24'.
 */
export function getPacificHour(date) {
  assertValidDate(date);
  const formatted = PACIFIC_HOUR_FMT.format(date);
  const hour = parseInt(formatted);
  return hour === 24 ? 0 : hour;
}

/**
 * Returns the Pacific Time hour as a fractional number (e.g. 14.5 = 2:30 PM).
 * Used by Timeline to position the current-time marker precisely.
 */
export function getPacificFractionalHour(date) {
  assertValidDate(date);
  const parts = PACIFIC_FRACTIONAL_HOUR_FMT.formatToParts(date);
  const hour = parseInt(parts.find(p => p.type === 'hour').value);
  const minute = parseInt(parts.find(p => p.type === 'minute').value);
  return (hour === 24 ? 0 : hour) + minute / 60;
}

/**
 * Formats a Date as a 12-hour Pacific Time string (e.g. "3 PM", "11 AM").
 */
export function formatPacificTime(date) {
  assertValidDate(date);
  return PACIFIC_12H_FMT.format(date);
}

/**
 * Builds a Date object representing a specific Pacific wall-clock hour on the
 * given Pacific calendar date, independently of the host timezone.
 * "compatible" (default) chooses the earlier repeated time and advances a
 * nonexistent time by the DST gap. "earlier"/"later" choose explicitly;
 * "reject" throws for either ambiguous or nonexistent wall-clock times.
 *
 * @param {string} dateStr - Pacific date in YYYY-MM-DD format
 * @param {number} targetHour - fractional hour in [0, 24)
 * @param {boolean} nextDay - if true, advance to the next calendar day
 * @param {'compatible'|'earlier'|'later'|'reject'} disambiguation
 * @returns {Date}
 */
export function buildPacificTime(dateStr, targetHour, nextDay = false, disambiguation = 'compatible') {
  if (!['compatible', 'earlier', 'later', 'reject'].includes(disambiguation)) {
    throw new RangeError('Invalid Pacific time disambiguation');
  }
  const { candidates, alternatives } = wallTimeOptions(dateStr, targetHour, nextDay);
  if (disambiguation === 'reject' && candidates.length !== 1) {
    throw new RangeError('Ambiguous or nonexistent Pacific wall-clock time');
  }
  if (candidates.length) {
    return new Date(disambiguation === 'later' ? candidates[candidates.length - 1] : candidates[0]);
  }
  return new Date(disambiguation === 'earlier' ? alternatives[0] : alternatives[alternatives.length - 1]);
}

/** All real occurrences of a wall time, ordered; [] for a skipped DST time. */
export function getPacificTimeCandidates(dateStr, targetHour) {
  return wallTimeOptions(dateStr, targetHour, false).candidates.map(time => new Date(time));
}

/** Offset transitions within a Pacific day, including the repeated-hour reset. */
export function getPacificDayTransitions(dateStr) {
  const start = buildPacificTime(dateStr, 0).getTime();
  const end = buildPacificTime(dateStr, 0, true).getTime();
  const transitions = [];
  let previous = start;
  let previousOffset = offsetAt(start);
  for (let probe = Math.min(start + 6 * HOUR_MS, end); previous < end; probe = Math.min(probe + 6 * HOUR_MS, end)) {
    const nextOffset = offsetAt(probe);
    if (nextOffset !== previousOffset) {
      let low = previous;
      let high = probe;
      while (high - low > 1) {
        const mid = Math.floor((low + high) / 2);
        if (offsetAt(mid) === previousOffset) low = mid;
        else high = mid;
      }
      if (high < end) transitions.push(new Date(high));
    }
    previous = probe;
    previousOffset = nextOffset;
  }
  return transitions;
}
