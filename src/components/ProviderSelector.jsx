export default function ProviderSelector({ provider, onChange }) {
  return (
    <div className="mt-1">
      <label className="text-xs text-gray-500 block mb-0.5">Generation provider</label>
      <select
        data-testid="provider-select"
        value={provider}
        onChange={e => onChange(e.target.value)}
        className="text-sm bg-white border border-gray-300 rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="pge">PG&E (Bundled)</option>
        <option value="3ce">Central Coast Community Energy (3CE)</option>
      </select>
    </div>
  );
}
