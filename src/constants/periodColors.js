/**
 * Single source of truth for all per-period display metadata: labels,
 * ordering, and color treatments used across the engine and components.
 *
 * label         — human-readable period name (e.g. "Part-Peak")
 * colorScheme   — semantic color name returned by the rate engine
 * timelineColor — hex background for chart bars and legend swatches
 */
export const PERIOD_ORDER = ['peak', 'midPeak', 'partPeak', 'offPeak', 'superOffPeak'];

export const PERIOD_COLORS = {
  offPeak: {
    label:        'Off-Peak',
    colorScheme:  'emerald',
    timelineColor: '#2D8F5C',
  },
  partPeak: {
    label:        'Part-Peak',
    colorScheme:  'amber',
    timelineColor: '#B87B2B',
  },
  // Mid-peak and part-peak are distinct tariff keys but intentionally share the
  // same intermediate severity treatment in the UI palette.
  midPeak: {
    label:        'Mid-Peak',
    colorScheme:  'amber',
    timelineColor: '#B87B2B',
  },
  peak: {
    label:        'Peak',
    colorScheme:  'red',
    timelineColor: '#C0392B',
  },
  superOffPeak: {
    label:        'Super Off-Peak',
    colorScheme:  'blue',
    timelineColor: '#3B82F6',
  },
};
