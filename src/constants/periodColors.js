/**
 * Tailwind class sets and color values for each TOU period.
 * Single source of truth for period colors across all components.
 *
 * badge     — light-background rate badge (must keep emerald/red keywords for tests)
 * bg        — timeline segment background
 * tip       — left-panel charging tip box (must keep emerald/red/amber for tests)
 * darkBadge — right-panel dark background badge (keeps emerald/red for test compat)
 * dotColor  — hex for the pulsing indicator dot
 */
export const PERIOD_COLORS = {
  offPeak: {
    badge:     'bg-emerald-500 text-white',
    bg:        'bg-emerald-500',
    tip:       'bg-emerald-50 border-emerald-200 text-emerald-900',
    darkBadge: 'bg-emerald-950/40 text-emerald-300',
    dotColor:  '#5CDB95',
  },
  partPeak: {
    badge:     'bg-amber-500 text-white',
    bg:        'bg-amber-500',
    tip:       'bg-amber-50 border-amber-200 text-amber-900',
    darkBadge: 'bg-amber-950/40 text-amber-300',
    dotColor:  '#EFC88B',
  },
  peak: {
    badge:     'bg-red-500 text-white',
    bg:        'bg-red-500',
    tip:       'bg-red-50 border-red-200 text-red-900',
    darkBadge: 'bg-red-950/40 text-red-400',
    dotColor:  '#FF6B5A',
  },
};
