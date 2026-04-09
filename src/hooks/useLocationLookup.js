import { useState, useEffect } from 'react';
import zipcodes from 'zipcodes';
import pgeTerritory from '../data/pgeTerritory.json';

const ZIP_RE = /^\d{5}$/;
const MIN_CHARS = 2;
const DEBOUNCE_MS = 400;

export function useLocationLookup() {
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorCode, setErrorCode] = useState(null);
  const [resolved, setResolved] = useState(null);

  function setInput(value) {
    setInputValue(value);
    const trimmed = value.trim();
    if (trimmed.length < MIN_CHARS) {
      setStatus('idle');
      setErrorCode(null);
      setResolved(null);
    } else {
      setStatus('resolving');
    }
  }

  function clearInput() {
    setInputValue('');
    setStatus('idle');
    setErrorCode(null);
    setResolved(null);
  }

  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed.length < MIN_CHARS) return;

    const id = setTimeout(() => {
      const result = resolve(trimmed);
      if (result.ok) {
        setStatus('valid');
        setErrorCode(null);
        setResolved(result.data);
      } else {
        setStatus('error');
        setErrorCode(result.errorCode);
        setResolved(null);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(id);
  }, [inputValue]);

  return { inputValue, status, errorCode, resolved, setInput, clearInput };
}

function resolve(trimmed) {
  return ZIP_RE.test(trimmed) ? resolveZip(trimmed) : resolveCity(trimmed);
}

function resolveZip(zip) {
  const info = zipcodes.lookup(zip);
  if (!info) return { ok: false, errorCode: 'invalid_input' };
  if (info.state !== 'CA') return { ok: false, errorCode: 'not_ca' };
  const sid = pgeTerritory.zips[zip];
  if (!sid) return { ok: false, errorCode: 'not_pge' };
  if (sid === 'multi-utility') return { ok: false, errorCode: 'multi_utility' };
  return { ok: true, data: { serviceAreaId: sid, displayLabel: `${info.city}, CA`, zip } };
}

function resolveCity(cityName) {
  const matches = zipcodes.lookupByName(cityName, 'CA');
  if (!matches || matches.length === 0) return { ok: false, errorCode: 'invalid_input' };
  const pgeMatch = matches.find(
    m => pgeTerritory.zips[m.zip] && pgeTerritory.zips[m.zip] !== 'multi-utility'
  );
  if (!pgeMatch) return { ok: false, errorCode: 'not_pge' };
  return {
    ok: true,
    data: {
      serviceAreaId: pgeTerritory.zips[pgeMatch.zip],
      displayLabel: `${pgeMatch.city}, CA`,
      zip: pgeMatch.zip,
    },
  };
}
