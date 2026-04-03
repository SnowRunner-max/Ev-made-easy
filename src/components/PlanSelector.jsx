export default function PlanSelector({ planId, onChange }) {
  return (
    <select
      data-testid="plan-select"
      value={planId}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3.5 py-2.5 text-sm text-[var(--text-primary)] bg-white border-[1.5px] border-pewter-light rounded-lg appearance-none focus:outline-none focus:border-paprika focus:ring-2 focus:ring-paprika/15 cursor-pointer transition-colors"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%236B6B7B' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
      }}
    >
      <optgroup label="EV Rates">
        <option value="EV2-A">EV2-A — Home Charging (Standard EV)</option>
        <option value="E-ELEC">E-ELEC — Electric Home Rate</option>
        <option value="EV-B">EV-B — Separately Metered EV (2nd meter required)</option>
      </optgroup>
      <optgroup label="Residential TOU Rates">
        <option value="E-TOU-C">E-TOU-C — Peak 4–9pm Every Day</option>
        <option value="E-TOU-D">E-TOU-D — Peak 5–8pm Weekdays Only</option>
      </optgroup>
      <optgroup label="Tiered (Non-TOU) Rates">
        <option value="E-1">E-1 — Standard Residential (Tiered)</option>
      </optgroup>
    </select>
  );
}
