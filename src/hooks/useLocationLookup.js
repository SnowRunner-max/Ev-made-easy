import { useState, useEffect } from 'react';
import zipcodes from 'zipcodes';
import pgeTerritory from '../data/pgeTerritory.json';
import sceTerritory from '../data/sceTerritory.json';
import multiUtilityZips from '../data/multiUtilityZips.json';

const ZIP_RE = /^\d{5}$/;
const MIN_CHARS = 2;
const DEBOUNCE_MS = 400;

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
      const resolved_ = resolve(trimmed);
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

function resolve(trimmed) {
  return ZIP_RE.test(trimmed) ? resolveZip(trimmed) : resolveCity(trimmed);
}

function resolveZip(zip) {
  const info = zipcodes.lookup(zip);
  if (!info) return { ok: false, errorCode: 'invalid_input' };
  if (info.state !== 'CA') return { ok: false, errorCode: 'not_ca' };

  // Priority 1: multi-utility overlap
  if (multiUtilityZips.zips[zip]) {
    return { ok: false, errorCode: 'multi_utility', candidates: multiUtilityZips.zips[zip], displayLabel: `${info.city}, CA`, zip };
  }

  // Priority 2: PG&E territory
  const pgeSid = pgeTerritory.zips[zip];
  if (pgeSid && pgeSid !== 'multi-utility') {
    return { ok: true, data: { serviceAreaId: pgeSid, displayLabel: `${info.city}, CA`, zip } };
  }

  // Priority 3: SCE territory
  const sceSid = sceTerritory.zips[zip];
  if (sceSid) {
    return { ok: true, data: { serviceAreaId: sceSid, displayLabel: `${info.city}, CA`, zip } };
  }

  return { ok: false, errorCode: 'not_supported' };
}

function resolveCity(cityName) {
  const matches = zipcodes.lookupByName(cityName, 'CA');
  if (!matches || matches.length === 0) return { ok: false, errorCode: 'invalid_input' };

  // Priority 1: multi-utility overlap — check first matching ZIP
  const multiMatch = matches.find(m => multiUtilityZips.zips[m.zip]);
  if (multiMatch) {
    return {
      ok: false,
      errorCode: 'multi_utility',
      candidates: multiUtilityZips.zips[multiMatch.zip],
      displayLabel: `${multiMatch.city}, CA`,
      zip: multiMatch.zip,
    };
  }

  // Priority 2: PG&E territory
  const pgeMatch = matches.find(
    m => pgeTerritory.zips[m.zip] && pgeTerritory.zips[m.zip] !== 'multi-utility'
  );
  if (pgeMatch) {
    return {
      ok: true,
      data: {
        serviceAreaId: pgeTerritory.zips[pgeMatch.zip],
        displayLabel: `${pgeMatch.city}, CA`,
        zip: pgeMatch.zip,
      },
    };
  }

  // Priority 3: SCE territory
  const sceMatch = matches.find(m => sceTerritory.zips[m.zip]);
  if (sceMatch) {
    return {
      ok: true,
      data: {
        serviceAreaId: sceTerritory.zips[sceMatch.zip],
        displayLabel: `${sceMatch.city}, CA`,
        zip: sceMatch.zip,
      },
    };
  }

  return { ok: false, errorCode: 'not_supported' };
}
