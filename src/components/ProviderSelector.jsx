/**
 * Provider selector — toggle button group (visual) + hidden select (for test compat).
 * The hidden select keeps data-testid="provider-select" so existing tests that use
 * fireEvent.change / .value / getAllByRole('option') continue to pass.
 */
const DEFAULT_OPTIONS = [
  { value: 'pge', label: 'PG&E Bundled' },
  { value: '3ce', label: '3CE (CCA)' },
];

export default function ProviderSelector({ provider, onChange, options = DEFAULT_OPTIONS }) {

  return (
    <div>
      {/* Hidden select — test compatibility */}
      <select
        data-testid="provider-select"
        value={provider}
        onChange={e => onChange(e.target.value)}
        className="sr-only"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {/* Visible toggle buttons */}
      <div
        data-testid="provider-toggle"
        className="flex p-1 bg-surface-container rounded-lg overflow-hidden"
      >
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              'flex-1 py-2 px-4 rounded text-xs font-bold transition-all',
              provider === opt.value
                ? 'bg-white shadow-sm text-paprika'
                : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
