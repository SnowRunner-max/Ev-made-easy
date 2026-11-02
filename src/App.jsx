import { useEffect, useMemo, useRef, useState } from 'react';
import { RATE_PLAN_REGISTRY } from './data/ratePlanRegistry';
import serviceAreasData from './data/serviceAreas.json';
import vehiclesData from './data/vehicles.json';
import {
  buildEffectivePlanConfig,
  getProviderOptions,
  getTierState,
  normalizeProvider,
} from './data/effectivePlanConfig';
import { calculateChargingWindow } from './engine/chargingWindow';
import { getPacificDateStr, getRate } from './engine/rateEngine';
import AppIcon from './components/AppIcon';
import ChargingWindow, { timeLabel } from './components/ChargingWindow';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { useCurrentRate } from './hooks/useCurrentRate';
import LocationInput from './components/LocationInput';
import PlanSelector from './components/PlanSelector';
import ProviderSelector from './components/ProviderSelector';
import TierSelector from './components/TierSelector';
import VehicleInputsCompact from './components/VehicleInputsCompact';
import CostFacts from './components/CostFacts';
import ChargerSpeedInput from './components/ChargerSpeedInput';

const CUSTOM_ID = 'custom';
const CHARGE_SUMMARY_DEBOUNCE_MS = 120;

export default function App() {
  const [locationResult, setLocationResult] = useState({
    serviceAreaId: 'pge-3ce-sbco',
    displayLabel: '',
    zip: '93427',
  });
  const [planId, setPlanId] = useState('EV2-A');
  const [provider, setProvider] = useState('pge');
  const [confirmedProvider, setConfirmedProvider] = useState(null);
  const [pciaVintage, setPciaVintage] = useState('');
  const [baselineTier, setBaselineTier] = useState('');
  const [baselineRemainingKwh, setBaselineRemainingKwh] = useState('');
  const [efficiencyPct, setEfficiencyPct] = useState(100);
  const [ccaTier, setCcaTier] = useState(null); // null = use CCA's defaultTier
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehiclesData.vehicles[0].id);
  const [customKwh, setCustomKwh] = useState('');
  const [currentPct, setCurrentPct] = useState(20);
  const [chargerKw, setChargerKw] = useState(vehiclesData.vehicles[0].maxAcChargingKw);
  const [tab, setTab] = useState(() =>
    window.location.hash === '#calculator' ? 'calculator' : 'setup',
  );
  const [dark, setDark] = useState(false);
  const [targetPct, setTargetPct] = useState(80);
  const [startHour, setStartHour] = useState(0);
  const [endHour, setEndHour] = useState(6);
  const detailsRef = useRef(null);
  useEffect(() => {
    const update = () => setTab(window.location.hash === '#calculator' ? 'calculator' : 'setup');
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  function openDetails() {
    detailsRef.current.showModal();
  }
  function navigate(next) {
    setTab(next);
    window.location.hash = next;
  }

  const [hasValidLocation, setHasValidLocation] = useState(false);
  const summaryPct = useDebouncedValue(currentPct, CHARGE_SUMMARY_DEBOUNCE_MS);

  const serviceArea = serviceAreasData.serviceAreas[locationResult.serviceAreaId];
  const ratePlansData = RATE_PLAN_REGISTRY[locationResult.serviceAreaId];
  const planConfig = ratePlansData.ratePlans[planId] ?? null;
  const activePlanConfig = planConfig ?? Object.values(ratePlansData.ratePlans)[0];

  const providerOptions = getProviderOptions(activePlanConfig, serviceArea);
  const effectiveProvider = normalizeProvider(provider, providerOptions, serviceArea);
  const { tierOptions, effectiveTier, showTierSelector } = getTierState(
    activePlanConfig,
    effectiveProvider,
    ccaTier,
  );

  function handleLocationResolved(resolved) {
    setHasValidLocation(true);
    if (resolved.serviceAreaId !== locationResult.serviceAreaId) {
      const newArea = serviceAreasData.serviceAreas[resolved.serviceAreaId];
      setPlanId(newArea.defaultPlanId);
      setProvider(newArea.defaultProvider);
      setConfirmedProvider(null);
      setPciaVintage('');
      setBaselineTier('');
      setBaselineRemainingKwh('');
      setCcaTier(null);
    }
    setLocationResult(resolved);
  }

  function handleLocationCleared() {
    // Intentionally empty — app stays on last valid location while user retypes
  }

  function handleProviderChange(newProvider) {
    setProvider(newProvider);
    setConfirmedProvider(newProvider);
    setCcaTier(null); // reset tier when switching CCA
  }

  function handleVehicleChange(newId) {
    setSelectedVehicleId(newId);
    if (newId !== CUSTOM_ID) {
      const v = vehiclesData.vehicles.find((veh) => veh.id === newId);
      if (v) setChargerKw(v.maxAcChargingKw);
    } else {
      setChargerKw(vehiclesData._metadata.defaultChargingSpeedKw);
    }
  }

  const effectivePlanConfig = useMemo(
    () =>
      buildEffectivePlanConfig({
        planConfig: activePlanConfig,
        serviceArea,
        providerId: effectiveProvider,
        tierId: effectiveTier,
        accountOptions: {
          pciaVintage: pciaVintage || undefined,
          baselineTier: baselineTier || undefined,
          baselineRemainingKwh:
            baselineRemainingKwh === '' ? undefined : Number(baselineRemainingKwh),
          includeStateSurcharge: true,
        },
      }),
    [
      activePlanConfig,
      serviceArea,
      effectiveProvider,
      effectiveTier,
      pciaVintage,
      baselineTier,
      baselineRemainingKwh,
    ],
  );
  const supportsProviderToggle = providerOptions.length > 1;

  const isCustomVehicle = selectedVehicleId === CUSTOM_ID;
  const selectedVehicle = vehiclesData.vehicles.find((v) => v.id === selectedVehicleId);
  const batteryKwh = isCustomVehicle
    ? Math.min(500, Math.max(1, parseFloat(customKwh) || 1))
    : (selectedVehicle?.usableBatteryKwh ?? 60);

  const vehicleMaxKw = isCustomVehicle ? null : (selectedVehicle?.maxAcChargingKw ?? null);

  const currentRate = useCurrentRate(effectivePlanConfig);

  const calculation = useMemo(() => {
    if (!hasValidLocation || batteryKwh <= 0) return { result: null };
    try {
      const result = calculateChargingWindow({
        date: getPacificDateStr(currentRate.now),
        startHour,
        endHour,
        batteryKwh,
        currentPct: summaryPct,
        targetPct,
        chargingKw: chargerKw,
        efficiency: efficiencyPct / 100,
        planConfig: effectivePlanConfig,
      });
      return { result };
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      return { result: null, error: error.message };
    }
  }, [
    hasValidLocation,
    batteryKwh,
    summaryPct,
    chargerKw,
    effectivePlanConfig,
    currentRate.now,
    efficiencyPct,
    startHour,
    endHour,
    targetPct,
  ]);
  const { result } = calculation;
  const isReferenceEstimate =
    (supportsProviderToggle && confirmedProvider !== effectiveProvider) ||
    provider !== effectiveProvider ||
    (effectiveProvider === '3ce' && pciaVintage === '') ||
    (effectivePlanConfig.utilityId === 'pge' &&
      ['E-1', 'E-TOU-C'].includes(planId) &&
      baselineTier === '' &&
      baselineRemainingKwh === '');

  if (!planConfig) {
    return <div className="p-8 text-red-600">Error: Unknown rate plan &quot;{planId}&quot;</div>;
  }

  const selectedRate = result?.meteredKwh ? result.totalCost / result.meteredKwh : currentRate.rate;
  const minutes = result ? Math.round(result.hoursNeeded * 60) : 0;
  const displayCost = result ? result.totalCost.toFixed(2) : '—';
  return (
    <div className={`app apple-app${dark ? ' dark' : ''}`}>
      <aside className="sidebar" aria-label="App navigation">
        <a
          className="brand"
          href="#calculator"
          aria-label="MyEVRate home"
          onClick={() => navigate('calculator')}
        >
          <span className="app-icon">
            <AppIcon name="bolt" />
          </span>
        </a>
        <nav aria-label="Main navigation">
          {[
            ['calculator', 'Charging', 'calculator'],
            ['setup', 'Setup', 'setup'],
          ].map(([key, label, icon]) => (
            <a
              key={key}
              href={`#${key}`}
              aria-label={label}
              aria-current={tab === key ? 'page' : undefined}
              className={`nav-item${tab === key ? ' active' : ''}`}
              data-tooltip={label}
              onClick={() => navigate(key)}
            >
              <AppIcon name={icon} />
            </a>
          ))}
          <button
            className="nav-item"
            aria-label="Pricing details"
            data-tooltip="Pricing details"
            onClick={openDetails}
          >
            <AppIcon name="info" />
          </button>
        </nav>
      </aside>
      <div className="workspace">
        <header className="toolbar" data-testid="app-header">
          <a className="toolbar-brand" href="#calculator" onClick={() => navigate('calculator')}>
            MyEVRate
          </a>
          <span className="active-context">
            {locationResult.displayLabel || '—'}
            {hasValidLocation &&
              ` · ${planId} · ${!effectivePlanConfig.isBundledProvider ? serviceArea.utility + ' + ' : ''}${effectivePlanConfig._displayProvider}`}
          </span>
          <button
            className="icon-button"
            aria-label={dark ? 'Switch to light appearance' : 'Switch to dark appearance'}
            onClick={() => setDark(!dark)}
          >
            <AppIcon name="sun" />
          </button>
        </header>
        <main data-testid="app-main">
          <section
            className="tab-panel charge-page"
            hidden={tab !== 'calculator'}
            aria-label="Charging calculator"
          >
            <section
              className="card estimate"
              data-testid="calculator"
              aria-labelledby="chargeTitle"
            >
              <div className="card-top">
                <h1 id="chargeTitle">Your charge</h1>
                {hasValidLocation && (
                  <span className="status" data-testid="rate-badge">
                    Now {currentRate.periodLabel || currentRate.period}
                  </span>
                )}
              </div>
              <div className="estimate-main" data-testid="cost-estimate-section">
                <div>
                  <div className="price" aria-live="polite">
                    <span className="currency">$</span>
                    <span data-testid="session-cost">{displayCost}</span>
                  </div>
                  <div className="rate-note">
                    {hasValidLocation ? (
                      <>
                        <span data-testid="rate-value">{(selectedRate * 100).toFixed(2)}¢</span> /
                        kWh · energy only
                      </>
                    ) : (
                      'Add your location in Setup'
                    )}
                  </div>
                </div>
                <div className="target-control">
                  <span>Charge to</span>
                  <div className="segmented small" aria-label="Target charge">
                    {[80, 100].map((target) => (
                      <button
                        key={target}
                        aria-pressed={targetPct === target}
                        onClick={() => setTargetPct(target)}
                      >
                        {target}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="charge-controls">
                <div className="charge-label">
                  <label htmlFor="currentCharge">Current charge</label>
                  <output htmlFor="currentCharge">{currentPct}%</output>
                </div>
                <input
                  id="currentCharge"
                  aria-label="Current charge percentage"
                  type="range"
                  min="0"
                  max="100"
                  value={currentPct}
                  onChange={(e) => setCurrentPct(Number(e.target.value))}
                  style={{
                    background: `linear-gradient(to right,var(--blue) ${currentPct}%,var(--control) ${currentPct}%)`,
                  }}
                />
              </div>
              <div className="charge-stats">
                <div>
                  <AppIcon name="bolt" />
                  <strong data-testid="session-metered-kwh">
                    {result ? result.meteredKwh.toFixed(1) : '—'} kWh
                  </strong>
                </div>
                <div>
                  <AppIcon name="clock" />
                  <strong>
                    {Math.floor(minutes / 60)} hr {minutes % 60} min
                  </strong>
                </div>
                <button className="icon-button" aria-label="Cost breakdown" onClick={openDetails}>
                  <AppIcon name="chevron" />
                </button>
              </div>
              {hasValidLocation && isReferenceEstimate && (
                <button
                  className="reference-note"
                  data-testid="reference-estimate"
                  onClick={() => navigate('setup')}
                >
                  Provisional · confirm account settings <AppIcon name="chevron" />
                </button>
              )}
              {calculation.error && <p role="alert">{calculation.error}</p>}
            </section>
            {hasValidLocation ? (
              <ChargingWindow
                planConfig={effectivePlanConfig}
                now={currentRate.now}
                startHour={startHour}
                endHour={endHour}
                onStartChange={setStartHour}
                onEndChange={setEndHour}
                result={result}
                error={calculation.error}
              />
            ) : (
              <section className="card empty-charge">
                <h2>Where do you charge?</h2>
                <p>Enter a California ZIP code to find your utility and available plans.</p>
                <button className="primary-button" onClick={() => navigate('setup')}>
                  Set up charging
                </button>
              </section>
            )}
          </section>
          <section
            className="tab-panel setup-page"
            hidden={tab !== 'setup'}
            aria-labelledby="setupTitle"
          >
            <div className="setup-heading">
              <h1 id="setupTitle">Your setup</h1>
              <p>Choose the details from your electricity bill.</p>
            </div>
            <div className="settings-content">
              {/* Two-column input grid — flat, no nested cards */}
              <div className="grid grid-cols-2 max-[600px]:grid-cols-1 gap-x-6 gap-y-5 mb-8">
                {/* Location — always active */}
                <div>
                  <p className="field-label">Location</p>
                  <LocationInput
                    onLocationResolved={handleLocationResolved}
                    onLocationCleared={handleLocationCleared}
                  />
                </div>

                {/* Rate Plan */}
                <div className={!hasValidLocation ? 'opacity-40' : ''}>
                  <p className="field-label">Rate Plan</p>
                  <PlanSelector
                    planId={planId}
                    plans={ratePlansData.ratePlans}
                    onChange={(id) => setPlanId(id)}
                    disabled={!hasValidLocation}
                  />
                </div>

                {/* Generation Provider — conditional */}
                {hasValidLocation && supportsProviderToggle && (
                  <div>
                    <p className="field-label">Generation Provider</p>
                    <ProviderSelector
                      provider={effectiveProvider}
                      onChange={handleProviderChange}
                      options={providerOptions}
                    />
                  </div>
                )}

                {/* Generation Tier — conditional */}
                {hasValidLocation && supportsProviderToggle && showTierSelector && (
                  <div>
                    <p className="field-label">Generation Tier</p>
                    <TierSelector
                      tier={effectiveTier}
                      options={tierOptions}
                      onChange={setCcaTier}
                    />
                  </div>
                )}

                {/* Vehicle */}
                <div className={!hasValidLocation ? 'opacity-40' : ''}>
                  <p className="field-label">Vehicle</p>
                  <VehicleInputsCompact
                    selectedId={selectedVehicleId}
                    customKwh={customKwh}
                    batteryKwh={batteryKwh}
                    onSelectedIdChange={handleVehicleChange}
                    onCustomKwhChange={setCustomKwh}
                    disabled={!hasValidLocation}
                  />
                </div>

                {/* Charger Speed */}
                <div className={!hasValidLocation ? 'opacity-40' : ''}>
                  <p className="field-label">Charger Speed</p>
                  <ChargerSpeedInput
                    chargerKw={chargerKw}
                    vehicleMaxKw={vehicleMaxKw}
                    onChange={setChargerKw}
                    disabled={!hasValidLocation}
                  />
                </div>
              </div>
            </div>
            {hasValidLocation && (
              <details className="account-settings">
                <summary>Account &amp; charging details</summary>
                <section className="mb-6 text-sm space-y-3" aria-label="Pricing assumptions">
                  {supportsProviderToggle && confirmedProvider !== effectiveProvider && (
                    <p role="status">
                      Confirm your generation provider using the buttons above. Location alone does
                      not identify your account; these are provisional rates.
                    </p>
                  )}
                  {provider !== effectiveProvider && (
                    <p role="status">
                      Your selected provider is unavailable on this plan. Showing the bundled
                      provider as a provisional fallback; this does not confirm your account
                      service.
                    </p>
                  )}
                  {effectivePlanConfig.utilityId === 'pge' && effectiveProvider === '3ce' && (
                    <>
                      <label className="block">
                        PCIA vintage (from your bill)
                        <select
                          aria-label="PCIA vintage"
                          value={pciaVintage}
                          onChange={(e) => setPciaVintage(e.target.value)}
                          className="ml-2 bg-surface-container-high p-2 rounded"
                        >
                          <option value="">Unknown — assumes standard non-exempt 2021</option>
                          {Array.from({ length: 18 }, (_, i) => String(2009 + i)).map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p>
                        3CE reference charges assume standard non-exempt service. CARE, medical and
                        other exempt-customer-group pricing is not supported.
                      </p>
                    </>
                  )}
                  {effectivePlanConfig.utilityId === 'pge' &&
                    ['E-1', 'E-TOU-C'].includes(planId) && (
                      <>
                        <label className="block">
                          Baseline assumption
                          <select
                            aria-label="Baseline assumption"
                            value={baselineTier}
                            onChange={(e) => {
                              setBaselineTier(e.target.value);
                              setBaselineRemainingKwh('');
                            }}
                            className="ml-2 bg-surface-container-high p-2 rounded"
                          >
                            <option value="">Unknown — above-baseline reference</option>
                            <option value="tier1">Within baseline</option>
                            <option value="tier2">Above baseline</option>
                          </select>
                        </label>
                        <label className="block">
                          Remaining baseline (metered kWh, optional)
                          <input
                            aria-label="Remaining baseline kWh"
                            type="number"
                            min="0"
                            value={baselineRemainingKwh}
                            onChange={(e) =>
                              setBaselineRemainingKwh(
                                e.target.value === ''
                                  ? ''
                                  : String(Math.max(0, Number(e.target.value))),
                              )
                            }
                            className="ml-2 w-24 bg-surface-container-high p-2 rounded"
                          />
                        </label>
                      </>
                    )}
                  <label className="block">
                    Wall-to-battery efficiency (%)
                    <input
                      aria-label="Charging efficiency percent"
                      type="number"
                      min="1"
                      max="100"
                      value={efficiencyPct}
                      onChange={(e) =>
                        setEfficiencyPct(Math.max(1, Math.min(100, Number(e.target.value) || 100)))
                      }
                      className="ml-2 w-20 bg-surface-container-high p-2 rounded"
                    />
                  </label>
                  <p>
                    100% assumes no charging losses; adjust for your vehicle and charger. Charger
                    speed is wall power. Constant-power duration excludes tapering and temperature
                    effects.
                  </p>
                  {effectivePlanConfig._pricingWarnings?.map((warning) => (
                    <p key={warning} role="note">
                      {warning}
                    </p>
                  ))}
                  <p>
                    Incremental grid-import estimate, not a bill or NEM2 settlement. Excludes solar
                    export credits, true-up balances, non-bypassable-charge reconciliation, fixed
                    daily charges and local taxes. State energy surcharge is included where
                    verified.
                  </p>
                </section>
              </details>
            )}
            <p className="setup-footnote">
              Rates use bundled tariff data and Pacific Time. ZIP codes identify available
              providers, not your account enrollment.
            </p>
          </section>
        </main>
        <dialog ref={detailsRef} className="pricing-dialog" aria-labelledby="detailsTitle">
          <div className="dialog-heading">
            <h2 id="detailsTitle">Pricing details</h2>
            <button
              className="icon-button"
              aria-label="Close pricing details"
              onClick={() => detailsRef.current.close()}
            >
              <AppIcon name="close" />
            </button>
          </div>
          <div className="pricing-details">
            {hasValidLocation ? (
              <>
                <p>
                  Selected window: {timeLabel(startHour)}–{timeLabel(endHour)}
                  {endHour <= startHour ? ' next day' : ''}, Pacific Time.{' '}
                  {result &&
                    !result.complete &&
                    `Window reaches ${Math.round(result.finalPct)}% before it ends.`}
                </p>
                <p>
                  Starting rate{' '}
                  <strong data-testid="precise-rate">
                    $
                    {(result
                      ? getRate(result.start, effectivePlanConfig).rate
                      : currentRate.rate
                    ).toFixed(5)}
                    /kWh
                  </strong>
                </p>
                {effectivePlanConfig._pricingWarnings?.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
                <CostFacts
                  planConfig={effectivePlanConfig}
                  summary={result ? { [targetPct === 80 ? 'to80' : 'to100']: result } : null}
                  globalMetadata={ratePlansData._metadata}
                  serviceArea={serviceArea}
                  provider={effectiveProvider}
                  currentRate={currentRate}
                />
              </>
            ) : (
              <p>Enter your location in Setup to see pricing details.</p>
            )}
          </div>
          <button className="primary-button" onClick={() => detailsRef.current.close()}>
            Done
          </button>
        </dialog>
      </div>
    </div>
  );
}
