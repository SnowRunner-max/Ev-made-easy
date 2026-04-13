import { useEffect } from 'react';
import { useLocationLookup } from '../hooks/useLocationLookup';
import serviceAreasData from '../data/serviceAreas.json';
import UtilityPicker from './UtilityPicker';

const ERROR_MESSAGES = {
  invalid_input: 'Enter a valid zipcode or California city name',
  not_ca:        'Only California locations are supported',
  not_supported: 'This area is not yet supported',
};

export default function LocationInput({ onLocationResolved, onLocationCleared }) {
  const { inputValue, status, errorCode, resolved, result, setInput, clearInput } = useLocationLookup();

  useEffect(() => {
    if (status === 'valid' && resolved) {
      onLocationResolved(resolved);
    }
  }, [status, resolved]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClear() {
    clearInput();
    onLocationCleared();
  }

  const isError = status === 'error';
  const isValid = status === 'valid';
  const isResolving = status === 'resolving';
  const serviceArea = resolved ? serviceAreasData.serviceAreas[resolved.serviceAreaId] : null;

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <input
          data-testid="location-input"
          type="text"
          value={inputValue}
          onChange={e => setInput(e.target.value)}
          placeholder="Enter city or zip code"
          aria-label="Location — city or zip code"
          aria-invalid={isError ? 'true' : undefined}
          aria-describedby="location-status"
          className={[
            'w-full px-3 py-2.5 text-sm text-[var(--text-primary)] bg-surface-container-highest border-none rounded-lg',
            'focus:outline-none focus:ring-2 transition-colors font-medium appearance-none',
            isError  ? 'ring-2 ring-red-400/60 focus:ring-red-400/80' : '',
            isValid  ? 'ring-2 ring-emerald-400/60 focus:ring-emerald-400/80' : '',
            !isError && !isValid ? 'focus:ring-paprika/20' : '',
          ].filter(Boolean).join(' ')}
        />

        {isResolving && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs select-none pointer-events-none">
            …
          </span>
        )}
        {isValid && (
          <span
            className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none"
            style={{ fontSize: '16px' }}
          >
            check_circle
          </span>
        )}
        {isError && (
          <span
            className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-red-400 pointer-events-none"
            style={{ fontSize: '16px' }}
          >
            error
          </span>
        )}
        {inputValue && (
          <button
            data-testid="location-clear"
            onClick={handleClear}
            aria-label="Clear location"
            className="absolute right-8 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs px-1"
          >
            ✕
          </button>
        )}
      </div>

      <div
        id="location-status"
        data-testid="location-status"
        role="status"
        aria-live="polite"
        className={[
          'text-[10px] leading-relaxed',
          isError ? 'text-red-400' : '',
          isValid ? 'text-emerald-600' : '',
          !isError && !isValid ? 'text-[var(--text-muted)]' : '',
        ].filter(Boolean).join(' ')}
      >
        {result?.errorCode === 'multi_utility' && (
          <UtilityPicker
            candidates={result.candidates}
            serviceAreas={serviceAreasData.serviceAreas}
            onSelect={(serviceAreaId) => {
              onLocationResolved({
                serviceAreaId,
                displayLabel: result.displayLabel,
                zip: result.zip,
              });
            }}
          />
        )}
        {result?.errorCode && result.errorCode !== 'multi_utility' && ERROR_MESSAGES[result.errorCode] && (
          <p className="text-[10px] leading-relaxed text-red-400">{ERROR_MESSAGES[result.errorCode]}</p>
        )}
        {isValid && serviceArea && `${serviceArea.utility} territory · ${serviceArea.shortLabel}`}
        {isResolving && '…'}
        {status === 'idle' && 'Works with California zip codes and city names'}
      </div>
    </div>
  );
}
