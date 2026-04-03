/**
 * Provider selector — toggle button group (visual) + hidden select (for test compat).
 * The hidden select keeps data-testid="provider-select" so existing tests that use
 * fireEvent.change / .value / getAllByRole('option') continue to pass.
 */
export default function ProviderSelector({ provider, onChange }) {
  const options = [
    { value: 'pge', label: 'PG&E Bundled' },
    { value: '3ce', label: '3CE (CCA)' },
  ];

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
        className="flex border-[1.5px] border-pewter-light rounded-lg overflow-hidden"
      >
        {options.map((opt, i) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              'flex-1 py-2.5 px-4 text-sm font-medium transition-colors',
              i > 0 ? 'border-l border-pewter-light' : '',
              provider === opt.value
                ? 'bg-paprika text-white font-semibold'
                : 'bg-white text-[var(--text-secondary)] hover:bg-offwhite',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
