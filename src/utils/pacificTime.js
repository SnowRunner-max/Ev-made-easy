/**
 * Shared Pacific Time utility functions.
 * All functions interpret dates in America/Los_Angeles timezone.
 */

/**
 * Returns the Pacific Time hour (0–23) for the given Date.
 * Normalizes the 'en-US' hour12:false quirk where midnight may return '24'.
 */
export function getPacificHour(date) {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    hour12: false,
  }).format(date);
  const hour = parseInt(formatted);
  return hour === 24 ? 0 : hour;
}

/**
 * Returns the Pacific Time hour as a fractional number (e.g. 14.5 = 2:30 PM).
 * Used by Timeline to position the current-time marker precisely.
 */
export function getPacificFractionalHour(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);
  const hour = parseInt(parts.find(p => p.type === 'hour').value);
  const minute = parseInt(parts.find(p => p.type === 'minute').value);
  return (hour === 24 ? 0 : hour) + minute / 60;
}

/**
 * Formats a Date as a 12-hour Pacific Time string (e.g. "3 PM", "11 AM").
 */
export function formatPacificTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    hour12: true,
  }).format(date);
}

/**
 * Builds a Date object representing a specific Pacific wall-clock hour on the
 * given Pacific calendar date. Uses iterative Intl correction for DST safety —
 * no hardcoded UTC offsets.
 *
 * @param {string} dateStr - Pacific date in YYYY-MM-DD format
 * @param {number} targetHour - 0–23
 * @param {boolean} nextDay - if true, advance to the next calendar day
 * @returns {Date}
 */
export function buildPacificTime(dateStr, targetHour, nextDay = false) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDay = nextDay ? day + 1 : day;

  // Start with UTC 20:00 on the target day — always within ±14h of Pacific Time
  let guess = Date.UTC(year, month - 1, targetDay, 20, 0, 0);

  // Iteratively correct until Pacific hour matches targetHour
  for (let i = 0; i < 25; i++) {
    const pacificHour = getPacificHour(new Date(guess));
    const diff = targetHour - pacificHour;
    if (diff === 0) break;
    guess += diff * 3600 * 1000;
  }

  return new Date(guess);
}
