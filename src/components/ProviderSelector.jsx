const DEFAULT_OPTIONS = [
  { value: 'pge', label: 'PG&E Bundled' },
  { value: '3ce', label: '3CE (CCA)' },
];

export default function ProviderSelector({ provider, onChange, options = DEFAULT_OPTIONS }) {

  return (
    <div
      data-testid="provider-toggle"
      className="flex p-1 bg-surface-container rounded-lg overflow-hidden"
    >
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={provider === opt.value}
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
  );
}
