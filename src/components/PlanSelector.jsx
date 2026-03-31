export default function PlanSelector({ planId, onChange }) {
  return (
    <select
      data-testid="plan-select"
      value={planId}
      onChange={e => onChange(e.target.value)}
      className="text-sm bg-white border border-gray-300 rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
