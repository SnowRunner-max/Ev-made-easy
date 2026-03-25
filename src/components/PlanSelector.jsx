export default function PlanSelector({ planId, onChange }) {
  return (
    <select
      data-testid="plan-select"
      value={planId}
      onChange={e => onChange(e.target.value)}
      className="text-sm bg-white border border-gray-300 rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <optgroup label="Time-of-Use Rates">
        <option value="ev2a">EV2-A — Standard EV Rate</option>
        <option value="e-elec">E-ELEC — Electric Home Rate</option>
        <option value="ev-b">EV-B — Separately Metered EV Rate (2nd meter required)</option>
        <option value="e-touc">E-TOU-C — Default Residential Rate</option>
        <option value="e-toud">E-TOU-D — Residential Rate (weekday peak only)</option>
      </optgroup>
      <optgroup label="Tiered (Non-TOU) Rates">
        <option value="e1">E1 — Standard Residential</option>
        <option value="es">ES — Residential with Solar</option>
        <option value="et">ET — Residential (Medical Baseline)</option>
        <option value="em">EM — Master-Metered Residential</option>
      </optgroup>
    </select>
  );
}
