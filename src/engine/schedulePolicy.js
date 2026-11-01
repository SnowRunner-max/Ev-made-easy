/**
 * PG&E Schedule EV, sheet 3, Special Condition 1 (Advice 7771-E):
 * https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_SCHEDS_EV%20(Sch).pdf
 * The displayed periods begin/end one hour later between the second March
 * Sunday and first April Sunday, and last October Sunday and first November
 * Sunday. Use start-inclusive/end-exclusive Pacific calendar dates. All actual
 * EV-B transitions on the bounding Sundays are after the DST clock change.
 * This is the PG&E meter schedule, not independent verification of any CCA's
 * generation-period alignment. Do not extend this policy to other schedules.
 */
export function getScheduleHourShift(dateStr, planConfig) {
  if (planConfig.scheduleCode !== 'EV' || planConfig.rateDesignation !== 'EV-B') return 0;
  const [year, month, day] = dateStr.split('-').map(Number);
  const sunday = (monthIndex, occurrence) => {
    const first = new Date(Date.UTC(year, monthIndex, 1));
    if (occurrence > 0) return 1 + (7 - first.getUTCDay()) % 7 + (occurrence - 1) * 7;
    const last = new Date(Date.UTC(year, monthIndex + 1, 0));
    return last.getUTCDate() - last.getUTCDay();
  };
  const shifted = (month === 3 && day >= sunday(2, 2))
    || (month === 4 && day < sunday(3, 1))
    || (month === 10 && day >= sunday(9, -1))
    || (month === 11 && day < sunday(10, 1));
  return shifted ? 1 : 0;
}
