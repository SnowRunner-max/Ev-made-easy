/**
 * Single source of truth for all per-period display metadata: labels,
 * ordering, and color treatments used across the engine and components.
 *
 * label         — human-readable period name (e.g. "Part-Peak")
 * colorScheme   — semantic color name returned by the rate engine
 * tip           — left-panel charging tip box (must keep emerald/red/amber for tests)
 * timelineColor — hex background for Timeline segments and legend swatches
 * pillClass     — rate badge classes for the dark Results Monolith (must keep green/amber/red for tests)
 * pillDotColor  — hex for the pulsing indicator dot inside the rate badge
 */
export const PERIOD_ORDER = ['peak', 'midPeak', 'partPeak', 'offPeak', 'superOffPeak'];

export const PERIOD_COLORS = {
  offPeak: {
    label:        'Off-Peak',
    colorScheme:  'emerald',
    tip:          'bg-emerald-50 text-emerald-900',
    timelineColor: '#2D8F5C',
    pillClass:    'text-[#A5D9B7] bg-green/20',
    pillDotColor: '#A5D9B7',
  },
  partPeak: {
    label:        'Part-Peak',
    colorScheme:  'amber',
    tip:          'bg-amber-50 text-amber-900',
    timelineColor: '#B87B2B',
    pillClass:    'text-[#F1C994] bg-amber/20',
    pillDotColor: '#F1C994',
  },
  // Mid-peak and part-peak are distinct tariff keys but intentionally share the
  // same intermediate severity treatment in the UI palette.
  midPeak: {
    label:        'Mid-Peak',
    colorScheme:  'amber',
    tip:          'bg-amber-50 text-amber-900',
    timelineColor: '#B87B2B',
    pillClass:    'text-[#F1C994] bg-amber/20',
    pillDotColor: '#F1C994',
  },
  peak: {
    label:        'Peak',
    colorScheme:  'red',
    tip:          'bg-red-50 text-red-900',
    timelineColor: '#C0392B',
    pillClass:    'text-[#FFB7AC] bg-red/20',
    pillDotColor: '#FFB7AC',
  },
  superOffPeak: {
    label:        'Super Off-Peak',
    colorScheme:  'blue',
    tip:          'bg-blue-50 text-blue-900',
    timelineColor: '#3B82F6',
    pillClass:    'text-[#93C5FD] bg-blue-500/15',
    pillDotColor: '#93C5FD',
  },
};
