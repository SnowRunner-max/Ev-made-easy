import { useMemo, useState } from 'react';
import { RATE_PLAN_REGISTRY } from './data/ratePlanRegistry';
import serviceAreasData from './data/serviceAreas.json';
import vehiclesData from './data/vehicles.json';
import {
  buildEffectivePlanConfig,
  getProviderOptions,
  getTierState,
  normalizeProvider,
} from './data/effectivePlanConfig';
import { calcChargeSummary } from './engine/costCalculator';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import LocationInput from './components/LocationInput';
import PlanSelector from './components/PlanSelector';
import ProviderSelector from './components/ProviderSelector';
import TierSelector from './components/TierSelector';
import RateDisplay from './components/RateDisplay';
import Timeline from './components/Timeline';
import { VehicleInputs, CostOutput } from './components/Calculator';
import VehicleInputsCompact from './components/VehicleInputsCompact';
import DonutChart from './components/DonutChart';
import ChargingTip from './components/ChargingTip';
import CostFacts from './components/CostFacts';
import Footer from './components/Footer';

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
  const [ccaTier, setCcaTier] = useState(null); // null = use CCA's defaultTier
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehiclesData.vehicles[0].id);
  const [customKwh, setCustomKwh] = useState('');
  const [currentPct, setCurrentPct] = useState(20);
  const [showCostFacts, setShowCostFacts] = useState(false);
  const [hasValidLocation, setHasValidLocation] = useState(false);
  const summaryPct = useDebouncedValue(currentPct, CHARGE_SUMMARY_DEBOUNCE_MS);

  const serviceArea = serviceAreasData.serviceAreas[locationResult.serviceAreaId];
  const ratePlansData = RATE_PLAN_REGISTRY[locationResult.serviceAreaId];
  const planConfig = ratePlansData.ratePlans[planId] ?? null;
  const activePlanConfig = planConfig ?? Object.values(ratePlansData.ratePlans)[0];

  const providerOptions = getProviderOptions(activePlanConfig, serviceArea);
  const effectiveProvider = normalizeProvider(provider, providerOptions, serviceArea);
  const { tierOptions, effectiveTier, showTierSelector } = getTierState(activePlanConfig, effectiveProvider, ccaTier);

  function handleLocationResolved(resolved) {
    setHasValidLocation(true);
    if (resolved.serviceAreaId !== locationResult.serviceAreaId) {
      const newArea = serviceAreasData.serviceAreas[resolved.serviceAreaId];
      setPlanId(newArea.defaultPlanId);
      setProvider(newArea.defaultProvider);
      setCcaTier(null);
    }
    setLocationResult(resolved);
  }

  function handleLocationCleared() {
    // Intentionally empty — app stays on last valid location while user retypes
  }

  function handleProviderChange(newProvider) {
    setProvider(newProvider);
    setCcaTier(null); // reset tier when switching CCA
  }

  const effectivePlanConfig = useMemo(
    () => buildEffectivePlanConfig({ planConfig: activePlanConfig, serviceArea, providerId: effectiveProvider, tierId: effectiveTier }),
    [activePlanConfig, serviceArea, effectiveProvider, effectiveTier]
  );
  const supportsProviderToggle = !!activePlanConfig.touPeriods && providerOptions.length > 1;

  const isCustomVehicle = selectedVehicleId === CUSTOM_ID;
  const selectedVehicle = vehiclesData.vehicles.find(v => v.id === selectedVehicleId);
  const batteryKwh = isCustomVehicle
    ? Math.min(500, Math.max(1, parseFloat(customKwh) || 1))
    : (selectedVehicle?.usableBatteryKwh ?? 60);

  const summary = useMemo(
    () => batteryKwh > 0 && summaryPct < 100
      ? calcChargeSummary(new Date(), batteryKwh, summaryPct, 7.7, effectivePlanConfig)
      : null,
    [batteryKwh, summaryPct, effectivePlanConfig]
  );

  if (!planConfig) {
    return <div className="p-8 text-red-600">Error: Unknown rate plan &quot;{planId}&quot;</div>;
  }

  return (
    <div className="min-h-screen bg-surface font-sans">

      {/* ── Top Bar ── */}
      <header
        data-testid="app-header"
        className="bg-surface-container sticky top-0 z-10 h-14 flex items-center justify-between px-6 max-w-[1120px] mx-auto w-full"
      >
        <div className="flex items-center gap-2">
          <img src="/MyEVRate.png" alt="" className="w-7 h-7" />
          <span className="font-display text-xl font-black tracking-tight text-paprika">My EV Rate</span>
        </div>
        {/* Right: selected city */}
        <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1.5 rounded-full">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
            {locationResult.displayLabel || '—'}
          </span>
        </div>
      </header>

      {/* ── Mobile sticky summary bar ── */}
      {summary && (
        <div className="max-[860px]:flex hidden bg-ink sticky top-14 z-10 px-5 py-3 items-center justify-between max-w-[1120px] mx-auto w-full">
          <div>
            <div className="text-[9px] uppercase tracking-widest text-pewter/60 font-bold">Total Estimated Cost</div>
            <div className="font-display text-2xl font-black text-white">${summary.to80?.costNow.toFixed(2) ?? '—'}</div>
          </div>
          <div className="flex gap-4 text-[10px] text-pewter">
            <div className="text-right">
              <div className="text-pewter/60 text-[9px] uppercase tracking-widest">Session</div>
              <div className="font-semibold text-white">{summary.to80?.kwhNeeded.toFixed(1) ?? '—'} kWh</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Two-Panel Layout ── */}
      <div
        data-testid="app-main"
        className="grid max-[860px]:grid-cols-1 grid-cols-[1fr_400px] max-w-[1120px] mx-auto"
      >

        {/* ════ LEFT PANEL: Input Laboratory ════ */}
        <div className="bg-white px-10 py-9 max-[860px]:px-5 max-[860px]:py-6">

          {/* Panel heading */}
          <div className="mb-8">
            <h1 className="font-display text-4xl font-black text-[var(--text-primary)] tracking-tight mb-1">
              Energy Price by Rate
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              See today&apos;s electricity rates and estimate your EV charging cost.
            </p>
          </div>

          {/* Two-column sub-grid: Location & Utility | Configuration */}
          <div className="grid grid-cols-2 max-[600px]:grid-cols-1 gap-6 mb-8">

            {/* LOCATION & UTILITY */}
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                Location &amp; Utility
              </label>
              <div className="bg-surface-container-high p-5 rounded-xl space-y-5">
                <div className="space-y-1.5">
                  <span className="text-xs text-[var(--text-secondary)] font-semibold">Location</span>
                  <LocationInput
                    onLocationResolved={handleLocationResolved}
                    onLocationCleared={handleLocationCleared}
                  />
                </div>
                {hasValidLocation && supportsProviderToggle && (
                  <div className="space-y-1.5">
                    <span className="text-xs text-[var(--text-secondary)] font-semibold">Generation Provider</span>
                    <ProviderSelector provider={effectiveProvider} onChange={handleProviderChange} options={providerOptions} />
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">{serviceArea.providerHint}</p>
                  </div>
                )}
                {hasValidLocation && supportsProviderToggle && showTierSelector && (
                  <div className="space-y-1.5">
                    <span className="text-xs text-[var(--text-secondary)] font-semibold">Generation Tier</span>
                    <TierSelector
                      tier={effectiveTier}
                      options={tierOptions}
                      onChange={setCcaTier}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* CONFIGURATION */}
            <div className={`space-y-4${!hasValidLocation ? ' opacity-40' : ''}`}>
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                Configuration
              </label>
              <div className="bg-surface-container-high p-5 rounded-xl space-y-5">
                <div className="space-y-1.5">
                  <span className="text-xs text-[var(--text-secondary)] font-semibold">Rate Plan</span>
                  <PlanSelector planId={planId} plans={ratePlansData.ratePlans} onChange={id => setPlanId(id)} disabled={!hasValidLocation} />
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                    {planConfig.uiHint ?? planConfig.description}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs text-[var(--text-secondary)] font-semibold">Vehicle Type</span>
                  <VehicleInputsCompact
                    selectedId={selectedVehicleId}
                    customKwh={customKwh}
                    batteryKwh={batteryKwh}
                    onSelectedIdChange={setSelectedVehicleId}
                    onCustomKwhChange={setCustomKwh}
                    disabled={!hasValidLocation}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CURRENT CHARGE — full width */}
          <section
            data-testid="calculator"
            className={`mb-8${!hasValidLocation ? ' opacity-40 pointer-events-none' : ''}`}
          >
            <VehicleInputs
              selectedId={selectedVehicleId}
              customKwh={customKwh}
              currentPct={currentPct}
              batteryKwh={batteryKwh}
              onSelectedIdChange={setSelectedVehicleId}
              onCustomKwhChange={setCustomKwh}
              onCurrentPctChange={setCurrentPct}
              sliderOnly
            />
          </section>

          {/* TODAY'S RATE SCHEDULE — full width */}
          <section className={`mb-8${!hasValidLocation ? ' opacity-40' : ''}`}>
            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-3">
              Today&apos;s Rate Schedule
            </label>
            <div className="bg-surface-container-high p-5 rounded-xl">
              <Timeline planConfig={effectivePlanConfig} />
            </div>
          </section>

          {/* Charging tip */}
          <div className={!hasValidLocation ? 'opacity-40' : ''}>
            <ChargingTip planConfig={effectivePlanConfig} />
          </div>
        </div>

        {/* ════ RIGHT PANEL: Energy Pricing (sticky, dark) ════ */}
        <div
          className={`bg-ink text-white px-8 py-9 max-[860px]:px-5 max-[860px]:py-6 max-[860px]:static sticky top-14 h-[calc(100vh-56px)] max-[860px]:h-auto overflow-y-auto flex flex-col relative${!hasValidLocation ? ' max-[860px]:hidden' : ''}`}
        >
          {/* Ambient glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-paprika/10 blur-[100px] pointer-events-none -mr-16 -mt-16" />

          <div className="relative z-10">
            {/* Panel label */}
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-pewter/50 mb-6">
              Energy Pricing
            </div>

            {!hasValidLocation ? (
              <div className="flex flex-col items-center justify-center text-center py-20 gap-4">
                <span className="material-symbols-outlined text-4xl text-pewter/40">bolt</span>
                <p className="text-base font-semibold text-pewter/60">Enter your location<br/>to see live EV rates.</p>
              </div>
            ) : showCostFacts ? (
              <CostFacts
                planConfig={effectivePlanConfig}
                summary={summary}
              />
            ) : (
              <>
                <RateDisplay planConfig={effectivePlanConfig} />
                <DonutChart planConfig={effectivePlanConfig} />

                {/* Cost estimate cards */}
                <div className="text-[10px] uppercase tracking-[2px] text-apricot font-medium mb-3">
                  Charging Cost Estimate
                </div>
                <CostOutput summary={summary} />
                {!summary && (
                  <p className="text-sm text-pewter mb-4">
                    {currentPct >= 100
                      ? 'Battery is already full.'
                      : 'Select a vehicle and adjust the charge level to see estimates.'}
                  </p>
                )}
              </>
            )}

            {/* FLIP / BACK button — inline, below cost cards */}
            {hasValidLocation && <div className="mt-5">
              <button
                onClick={() => setShowCostFacts(v => !v)}
                className="w-full py-4 bg-paprika hover:bg-paprika-hover rounded-xl font-display text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-paprika/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {showCostFacts
                  ? <><span className="material-symbols-outlined text-sm">arrow_back</span> Back to Summary</>
                  : 'Flip for Breakdown'
                }
              </button>
              <p className="text-[9px] text-center mt-2 text-white/30 italic">
                {showCostFacts
                  ? 'Showing detailed cost attribution for current session.'
                  : 'Calculated based on live TOU schedule.'}
              </p>
            </div>}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <Footer
        planConfig={effectivePlanConfig}
        globalMetadata={ratePlansData._metadata}
        city={{ name: locationResult.displayLabel.replace(', CA', ''), serviceAreaId: locationResult.serviceAreaId }}
        serviceArea={serviceArea}
        provider={effectiveProvider}
      />

    </div>
  );
}
