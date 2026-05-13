import { useState, useEffect } from 'react';
import zipcodes from 'zipcodes';
import multiUtilityZips from '../data/multiUtilityZips.json';
import { getUtilityTerritories } from '../data/utilityRegistry';
import { createLocationResolver } from './locationResolver';

const MIN_CHARS = 2;
const DEBOUNCE_MS = 400;
const resolveLocation = createLocationResolver({
  zipcodes,
  utilityTerritories: getUtilityTerritories(),
  multiUtilityZips,
});

export function useLocationLookup() {
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorCode, setErrorCode] = useState(null);
  const [resolved, setResolved] = useState(null);
  const [result, setResult] = useState(null);

  function setInput(value) {
    setInputValue(value);
    const trimmed = value.trim();
    if (trimmed.length < MIN_CHARS) {
      setStatus('idle');
      setErrorCode(null);
      setResolved(null);
      setResult(null);
    } else {
      setStatus('resolving');
    }
  }

  function clearInput() {
    setInputValue('');
    setStatus('idle');
    setErrorCode(null);
    setResolved(null);
    setResult(null);
  }

  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed.length < MIN_CHARS) return;

    const id = setTimeout(() => {
      const resolved_ = resolveLocation(trimmed);
      if (resolved_.ok) {
        setStatus('valid');
        setErrorCode(null);
        setResolved(resolved_.data);
        setResult(null);
      } else {
        setStatus('error');
        setErrorCode(resolved_.errorCode);
        setResolved(null);
        setResult(resolved_);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(id);
  }, [inputValue]);

  return { inputValue, status, errorCode, resolved, result, setInput, clearInput };
}
