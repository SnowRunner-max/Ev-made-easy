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
import ChargingTip from './components/ChargingTip';
import CostFacts from './components/CostFacts';

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
    () => hasValidLocation && batteryKwh > 0 && summaryPct < 100
      ? calcChargeSummary(new Date(), batteryKwh, summaryPct, 7.7, effectivePlanConfig)
      : null,
    [hasValidLocation, batteryKwh, summaryPct, effectivePlanConfig]
  );

  if (!planConfig) {
    return <div className="p-8 text-red-600">Error: Unknown rate plan &quot;{planId}&quot;</div>;
  }

  return (
    <div className="min-h-screen bg-surface font-sans">

      {/* ── Top Bar ── */}
      <header
        data-testid="app-header"
        className="bg-paper sticky top-0 z-10 h-14 flex items-center justify-between px-6 max-w-[1120px] mx-auto w-full border-b border-surface-container"
      >
        <div className="flex items-center gap-2.5">
          <img src="/MyEVRate.png" alt="" className="w-7 h-7" />
          <span className="font-display text-lg font-black tracking-tight text-ink">MyEVRate</span>
        </div>
        {/* Context strip — location + plan */}
        <div className="flex items-center gap-4 text-xs font-medium text-[var(--text-secondary)]">
          <div className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-paprika shrink-0">
              <path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            <span>{locationResult.displayLabel || '—'}</span>
          </div>
          {hasValidLocation && (
            <>
              <span className="w-px h-4 bg-surface-container-high" />
              <span>
                <span className="text-[var(--text-muted)] mr-1">Plan</span>
                <span className="font-semibold text-ink">{planId}</span>
                {serviceArea?.cca && (
                  <span className="text-[var(--text-muted)]"> · {serviceArea.utility} + {serviceArea.cca}</span>
                )}
              </span>
            </>
          )}
        </div>
      </header>

      {/* ── Two-Panel Layout ── */}
      <div
        data-testid="app-main"
        className="grid max-[860px]:grid-cols-1 grid-cols-[1fr_400px] max-w-[1120px] mx-auto"
      >

        {/* ════ LEFT PANEL: Input Laboratory ════ */}
        <div className="bg-paper px-10 py-9 max-[860px]:px-5 max-[860px]:py-6 max-[860px]:order-2">

          {/* Panel heading */}
          {hasValidLocation ? (
            <div className="mb-5">
              <p className="eyebrow mb-1">01 — Configure</p>
              <h1 className="font-display text-xl font-bold text-[var(--text-primary)] tracking-tight leading-tight">
                Settings
              </h1>
            </div>
          ) : (
            <div className="mb-8">
              <p className="eyebrow mb-2.5">01 — Configure</p>
              <h1 className="font-display text-[2.6rem] font-bold text-[var(--text-primary)] tracking-tight leading-none" style={{ maxWidth: '15ch' }}>
                Your energy rate to charge your EV.
              </h1>
            </div>
          )}

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
              <PlanSelector planId={planId} plans={ratePlansData.ratePlans} onChange={id => setPlanId(id)} disabled={!hasValidLocation} />
            </div>

            {/* Generation Provider — conditional */}
            {hasValidLocation && supportsProviderToggle && (
              <div>
                <p className="field-label">Generation Provider</p>
                <ProviderSelector provider={effectiveProvider} onChange={handleProviderChange} options={providerOptions} />
              </div>
            )}

            {/* Generation Tier — conditional */}
            {hasValidLocation && supportsProviderToggle && showTierSelector && (
              <div>
                <p className="field-label">Generation Tier</p>
                <TierSelector tier={effectiveTier} options={tierOptions} onChange={setCcaTier} />
              </div>
            )}

            {/* Vehicle */}
            <div className={!hasValidLocation ? 'opacity-40' : ''}>
              <p className="field-label">Vehicle</p>
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
          <section className={`mb-8 max-[860px]:mb-3${!hasValidLocation ? ' opacity-40' : ''}`}>
            <p className="field-label">Today&apos;s Rate Schedule</p>
            <div className="bg-surface-container-high p-5 max-[860px]:p-4 rounded-xl">
              <Timeline planConfig={effectivePlanConfig} />
            </div>
          </section>

          {/* Charging tip */}
          <div className={!hasValidLocation ? 'opacity-40' : ''}>
            <ChargingTip planConfig={effectivePlanConfig} />
          </div>
        </div>

        {/* ════ RIGHT PANEL: Live Rate (sticky, dark) ════ */}
        <div
          className={`bg-ink text-white px-8 py-9 max-[860px]:px-5 max-[860px]:py-6 max-[860px]:static max-[860px]:order-1 sticky top-14 h-[calc(100vh-56px)] max-[860px]:h-auto overflow-y-auto overflow-x-hidden flex flex-col relative${!hasValidLocation ? ' max-[860px]:hidden' : ''}`}
        >
          {/* Ambient glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-paprika/10 blur-[100px] pointer-events-none -mr-16 max-[860px]:mr-0 -mt-16" />

          <div className="relative z-10">
            {!hasValidLocation ? (
              <div className="flex flex-col items-center justify-center text-center py-20 gap-4">
                <span className="material-symbols-outlined text-4xl text-pewter/40">bolt</span>
                <p className="text-base font-semibold text-pewter/60">Enter your location<br/>to see live EV rates.</p>
              </div>
            ) : showCostFacts ? (
              <CostFacts
                planConfig={effectivePlanConfig}
                summary={summary}
                globalMetadata={ratePlansData._metadata}
                serviceArea={serviceArea}
                provider={effectiveProvider}
              />
            ) : (
              <>
                <RateDisplay planConfig={effectivePlanConfig} />

                {/* Cost estimate cards */}
                <div
                  data-testid="cost-estimate-section"
                  className="bg-white/5 rounded-xl p-5 mb-4"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-pewter/60 mb-4">
                    {isCustomVehicle ? 'Charging Cost Estimate' : `To Charge ${selectedVehicle?.name ?? 'your EV'}`}
                  </p>
                  <CostOutput summary={summary} />
                  {!summary && (
                    <p className="text-sm text-pewter">
                      {currentPct >= 100
                        ? 'Battery is already full.'
                        : 'Select a vehicle and adjust the charge level to see estimates.'}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* See cost breakdown / ← Summary button */}
            {hasValidLocation && (
              <div className="mt-4">
                <button
                  onClick={() => setShowCostFacts(v => !v)}
                  className="w-full py-3 rounded-xl border border-white/15 text-white/60 hover:text-white hover:border-white/35 text-sm font-medium transition-colors flex items-center justify-between px-4"
                >
                  <span>{showCostFacts ? '← Summary' : 'See cost breakdown'}</span>
                  {!showCostFacts && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>


    </div>
  );
}
