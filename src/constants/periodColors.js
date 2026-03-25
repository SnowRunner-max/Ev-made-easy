/**
 * Tailwind CSS class sets for each TOU period.
 * Single source of truth for period colors across all components.
 */
export const PERIOD_COLORS = {
  offPeak:  { badge: 'bg-emerald-500 text-white', bg: 'bg-emerald-500', tip: 'bg-emerald-50 border-emerald-300 text-emerald-800' },
  partPeak: { badge: 'bg-amber-500 text-white',   bg: 'bg-amber-500',   tip: 'bg-amber-50 border-amber-300 text-amber-800' },
  peak:     { badge: 'bg-red-500 text-white',      bg: 'bg-red-500',     tip: 'bg-red-50 border-red-300 text-red-800' },
};
