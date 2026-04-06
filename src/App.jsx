import { useState } from 'react';
import ratePlans from './data/ratePlans.json';
import serviceAreasData from './data/serviceAreas.json';
import vehiclesData from './data/vehicles.json';
import { calcChargeSummary } from './engine/costCalculator';
import { useCurrentRate } from './hooks/useCurrentRate';
import CityPicker from './components/CityPicker';
import PlanSelector from './components/PlanSelector';
import ProviderSelector from './components/ProviderSelector';
import RateDisplay from './components/RateDisplay';
import Timeline from './components/Timeline';
import { VehicleInputs, CostOutput } from './components/Calculator';
import DonutChart from './components/DonutChart';
import ChargingTip from './components/ChargingTip';
import Footer from './components/Footer';

/** Static registry mapping serviceAreaId → imported rate plan data */
const RATE_PLAN_REGISTRY = {
  'pge-3ce-sbco': ratePlans,
};

const CUSTOM_ID = 'custom';

function buildRateMatrix(v2Rates, provider) {
  const seasons = Object.keys(v2Rates.pgeDelivery);
  return Object.fromEntries(
    seasons.map(season => [
      season,
      Object.fromEntries(
        Object.keys(v2Rates.pgeDelivery[season]).map(period => {
          const delivery = v2Rates.pgeDelivery[season][period];
          const cce = v2Rates.cce[season][period];
          const bundled = v2Rates.pgeTotalBundled[season][period];
          const combined = provider === 'pge' ? bundled : delivery + cce;
          return [period, { combined, delivery, generation: cce }];
        })
      )
    ])
  );
}

function getEffectiveConfig(planConfig, provider) {
  const providerLabel = provider === 'pge'
    ? 'PG&E Bundled Service'
    : 'Central Coast Community Energy (3CE) — 3Cchoice';

  if (!planConfig.touPeriods) {
    const r = planConfig.rates;
    const delivery = r.pgeDelivery.tier1;
    const generation = provider === 'pge' ? r.pgeGeneration.allUsage : r.cce.allUsage;
    const combined = provider === 'pge' ? r.pgeTotalBundled.tier1 : delivery + generation;
    return { ...planConfig, _displayProvider: providerLabel, _flatRate: { combined, delivery, generation } };
  }

  const rates = buildRateMatrix(planConfig.rates, provider);
  return { ...planConfig, rates, _displayProvider: providerLabel };
}

const PLAN_HINTS = {
  'EV2-A':   'For customers with an EV, battery storage, or heat pump. Whole-house metering.',
  'E-ELEC':  'All-electric home rate for customers with space/water heating and an EV or battery storage.',
  'EV-B':    'Requires a separately metered EV outlet (second meter). Best for high overnight charging.',
  'E-TOU-C': 'Standard residential TOU rate. Peak 4–9 PM every day including weekends.',
  'E-TOU-D': 'Standard residential TOU rate. Peak 5–8 PM on weekdays only.',
  'E-1':     'Traditional tiered rate. No time-of-use pricing — rate varies by monthly usage tier.',
};

export default function App() {
  const [cityId, setCityId] = useState('buellton');
  const [planId, setPlanId] = useState('EV2-A');
  const [provider, setProvider] = useState('pge');
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehiclesData.vehicles[0].id);
  const [customKwh, setCustomKwh] = useState('');
  const [currentPct, setCurrentPct] = useState(20);
  const [showCostFacts, setShowCostFacts] = useState(false);

  const city = serviceAreasData.cities.find(c => c.id === cityId);
  const serviceArea = serviceAreasData.serviceAreas[city.serviceAreaId];
  const ratePlansData = RATE_PLAN_REGISTRY[city.serviceAreaId];

  function handleCityChange(newCityId) {
    const newCity = serviceAreasData.cities.find(c => c.id === newCityId);
    setCityId(newCityId);
    if (newCity.serviceAreaId !== city.serviceAreaId) {
      const newArea = serviceAreasData.serviceAreas[newCity.serviceAreaId];
      setPlanId(newArea.defaultPlanId);
      setProvider(newArea.defaultProvider);
    }
  }

  const planConfig = ratePlansData.ratePlans[planId];

  if (!planConfig) {
    return <div className="p-8 text-red-600">Error: Unknown rate plan &quot;{planId}&quot;</div>;
  }

  const effectivePlanConfig = getEffectiveConfig(planConfig, provider);
  const supportsProviderToggle = !!planConfig.touPeriods;

  const isCustomVehicle = selectedVehicleId === CUSTOM_ID;
  const selectedVehicle = vehiclesData.vehicles.find(v => v.id === selectedVehicleId);
  const batteryKwh = isCustomVehicle
    ? Math.min(500, Math.max(1, parseFloat(customKwh) || 1))
    : (selectedVehicle?.usableBatteryKwh ?? 60);

  const summary = batteryKwh > 0 && currentPct < 100
    ? calcChargeSummary(new Date(), batteryKwh, currentPct, 7.7, effectivePlanConfig)
    : null;

  return (
    <div className="min-h-screen bg-surface font-sans">

      {/* ── Top Bar ── */}
      <header
        data-testid="app-header"
        className="bg-surface-container sticky top-0 z-10 h-14 flex items-center justify-between px-6 max-w-[1120px] mx-auto w-full"
      >
        {/* Left: brand + nav */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-paprika rounded-lg flex items-center justify-center text-sm leading-none">
              ⚡
            </div>
            <span className="font-display text-xl font-black tracking-tight text-paprika">ChargeRate</span>
          </div>
          <nav className="hidden sm:flex items-center gap-1">
            <span className="text-sm font-bold text-paprika border-b-2 border-paprika pb-0.5 px-1">
              Dashboard
            </span>
          </nav>
        </div>
        {/* Right: selected city */}
        <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1.5 rounded-full">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
            {city.name}, CA
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
              See today's electricity rates and estimate your EV charging cost.
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
                  <span className="text-xs text-[var(--text-secondary)] font-semibold">City</span>
                  <CityPicker cityId={cityId} cities={serviceAreasData.cities} onChange={handleCityChange} />
                </div>
                {supportsProviderToggle && (
                  <div className="space-y-1.5">
                    <span className="text-xs text-[var(--text-secondary)] font-semibold">Generation Provider</span>
                    <ProviderSelector provider={provider} onChange={setProvider} options={serviceArea.providers} />
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">{serviceArea.providerHint}</p>
                  </div>
                )}
              </div>
            </div>

            {/* CONFIGURATION */}
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                Configuration
              </label>
              <div className="bg-surface-container-high p-5 rounded-xl space-y-5">
                <div className="space-y-1.5">
                  <span className="text-xs text-[var(--text-secondary)] font-semibold">Rate Plan</span>
                  <PlanSelector planId={planId} plans={ratePlansData.ratePlans} onChange={id => setPlanId(id)} />
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">{PLAN_HINTS[planId]}</p>
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs text-[var(--text-secondary)] font-semibold">Vehicle Type</span>
                  <VehicleInputsCompact
                    selectedId={selectedVehicleId}
                    customKwh={customKwh}
                    batteryKwh={batteryKwh}
                    onSelectedIdChange={setSelectedVehicleId}
                    onCustomKwhChange={setCustomKwh}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CURRENT CHARGE — full width */}
          <section data-testid="calculator" className="mb-8">
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
          <section className="mb-8">
            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-3">
              Today's Rate Schedule
            </label>
            <div className="bg-surface-container-high p-5 rounded-xl">
              <Timeline planConfig={effectivePlanConfig} />
            </div>
          </section>

          {/* Charging tip */}
          <ChargingTip planConfig={effectivePlanConfig} />
        </div>

        {/* ════ RIGHT PANEL: Energy Pricing (sticky, dark) ════ */}
        <div
          className="bg-ink text-white px-8 py-9 max-[860px]:px-5 max-[860px]:py-6 max-[860px]:static sticky top-14 h-[calc(100vh-56px)] max-[860px]:h-auto overflow-y-auto flex flex-col relative"
        >
          {/* Ambient glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-paprika/10 blur-[100px] pointer-events-none -mr-16 -mt-16" />

          <div className="relative z-10">
            {/* Panel label */}
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-pewter/50 mb-6">
              Energy Pricing
            </div>

            {showCostFacts ? (
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
            <div className="mt-5">
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
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <Footer planConfig={effectivePlanConfig} globalMetadata={ratePlansData._metadata} city={city} serviceArea={serviceArea} />

      {/* ── Mobile bottom tab bar ── */}
      <nav className="max-[860px]:flex hidden fixed bottom-0 left-0 right-0 bg-ink border-t border-white/10 z-20 pb-safe">
        <button className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5">
          <span className="material-symbols-outlined text-paprika" style={{ fontVariationSettings: "'FILL' 1" }}>calculate</span>
          <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-paprika">Calculator</span>
        </button>
        <button className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-pewter/60">
          <span className="material-symbols-outlined">history</span>
          <span className="font-sans text-[10px] font-bold uppercase tracking-widest">History</span>
        </button>
        <button className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-pewter/60">
          <span className="material-symbols-outlined">person</span>
          <span className="font-sans text-[10px] font-bold uppercase tracking-widest">Account</span>
        </button>
      </nav>
    </div>
  );
}

/**
 * Compact vehicle picker (no slider) — used inside the Configuration card.
 * The full VehicleInputs with slider lives in the full-width section below.
 */
function VehicleInputsCompact({ selectedId, customKwh, batteryKwh, onSelectedIdChange, onCustomKwhChange }) {
  const isCustom = selectedId === CUSTOM_ID;

  return (
    <div className="space-y-2">
      <select
        data-testid="vehicle-select-compact"
        value={selectedId}
        onChange={e => onSelectedIdChange(e.target.value)}
        className="w-full px-3 py-2.5 text-sm text-[var(--text-primary)] bg-surface-container-highest border-none rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-paprika/20 cursor-pointer transition-colors font-medium"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%236B6B7B' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
        }}
      >
        {vehiclesData.vehicles.map(v => (
          <option key={v.id} value={v.id}>
            {v.make} {v.model}{v.trim ? ` (${v.trim})` : ''} — {v.usableBatteryKwh} kWh
          </option>
        ))}
        <option value={CUSTOM_ID}>Custom battery size…</option>
      </select>
      {isCustom && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="500"
            value={customKwh}
            onChange={e => onCustomKwhChange(e.target.value)}
            placeholder="Battery size"
            className="w-24 px-3 py-2 text-sm bg-surface-container-highest border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-paprika/20"
          />
          <span className="text-xs text-[var(--text-muted)]">kWh</span>
        </div>
      )}
      <p data-testid="battery-display" className="text-[10px] text-[var(--text-muted)]">
        Battery: <span className="font-semibold text-[var(--text-secondary)]">{batteryKwh} kWh</span>
      </p>
    </div>
  );
}

/**
 * Simplified Cost Facts view — nutrition-label style.
 * Shows delivery / generation totals for the 80% charge scenario.
 */
function CostFacts({ planConfig, summary }) {
  const { period, season } = useCurrentRate(planConfig);

  if (!planConfig.touPeriods || !summary?.to80) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-pewter text-center">Select a vehicle and charge level to see cost facts.</p>
      </div>
    );
  }

  const rateData = planConfig.rates[season]?.[period];
  if (!rateData) return null;

  const kwh = summary.to80.kwhNeeded;
  const deliveryCost = rateData.delivery * kwh;
  const generationCost = rateData.generation * kwh;
  const totalCost = summary.to80.costNow;
  const costPerKwh = rateData.combined;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Nutrition label container */}
      <div className="border border-white/15 rounded-sm p-5">

        {/* Header */}
        <div className="border-b-8 border-white pb-2 mb-2">
          <h3 className="font-display text-3xl font-black uppercase tracking-tight leading-none">Cost Facts</h3>
          <div className="flex justify-between items-baseline mt-1">
            <span className="text-[10px] text-white/60 font-bold">
              Session: {kwh.toFixed(1)} kWh delivered
            </span>
            <span className="text-[10px] text-white/60 font-bold">{planConfig.name}</span>
          </div>
        </div>

        {/* Total */}
        <div className="flex justify-between items-end border-b-4 border-white pb-1 mb-1">
          <span className="font-black text-lg uppercase">Total Cost</span>
          <span className="font-display text-3xl font-black">${totalCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-b border-white/20 py-1 text-xs">
          <span className="font-bold text-white/60">Cost per kWh</span>
          <span className="text-white/90">${costPerKwh.toFixed(4)}</span>
        </div>

        {/* PG&E Delivery */}
        <div className="mt-5">
          <div className="flex justify-between items-baseline">
            <span className="font-black text-sm uppercase">PG&amp;E Delivery</span>
            <span className="font-bold text-sm">${deliveryCost.toFixed(2)}</span>
          </div>
          <div className="border-b-4 border-white mb-2" />
          <div className="flex justify-between text-[11px] border-b border-white/20 py-1.5 text-white/70">
            <span>Delivery charges</span>
            <span className="font-medium text-white">${(rateData.delivery).toFixed(4)}/kWh</span>
          </div>
        </div>

        {/* Generation */}
        <div className="mt-5">
          <div className="flex justify-between items-baseline">
            <span className="font-black text-sm uppercase">Generation</span>
            <span className="font-bold text-sm">${generationCost.toFixed(2)}</span>
          </div>
          <div className="border-b-4 border-white mb-2" />
          <div className="flex justify-between text-[11px] border-b border-white/20 py-1.5 text-white/70">
            <span>{planConfig._displayProvider?.includes('3CE') ? '3CE Generation' : 'PG&E Generation'}</span>
            <span className="font-medium text-white">${(rateData.generation).toFixed(4)}/kWh</span>
          </div>
        </div>

        <footer className="mt-5 text-[9px] leading-tight text-white/40 italic">
          * Based on {planConfig.name} rate schedule charging {kwh.toFixed(1)} kWh from current charge level to 80%.
        </footer>
      </div>
    </div>
  );
}
