export default function TierSelector({ tier, onChange }) {
  return (
    <div className="mt-0.5">
      <label className="text-xs text-gray-500 block mb-0.5">3CE tier</label>
      <select
        data-testid="tier-select"
        value={tier}
        onChange={e => onChange(e.target.value)}
        className="text-sm bg-white border border-gray-300 rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="3cchoice">3Cchoice (Standard)</option>
        <option value="3cprime">3Cprime (100% Renewable)</option>
      </select>
    </div>
  );
}
