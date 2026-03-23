export default function PlanSelector({ planId, onChange }) {
  return (
    <select
      data-testid="plan-select"
      value={planId}
      onChange={e => onChange(e.target.value)}
      className="text-sm bg-white border border-gray-300 rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="ev2a">EV2-A — Standard EV Rate</option>
      <option value="e-elec">E-ELEC — Electric Home Rate</option>
      <option value="ev-b">EV-B — Separately Metered EV Rate (2nd meter required)</option>
    </select>
  );
}
