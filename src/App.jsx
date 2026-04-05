import { useState } from 'react';
import ratePlans from './data/ratePlans.json';
import serviceAreasData from './data/serviceAreas.json';
import vehiclesData from './data/vehicles.json';
import { calcChargeSummary } from './engine/costCalculator';
import CityPicker from './components/CityPicker';
import PlanSelector from './components/PlanSelector';
import ProviderSelector from './components/ProviderSelector';
import RateDisplay from './components/RateDisplay';
import Timeline from './components/Timeline';
import { VehicleInputs, CostOutput } from './components/Calculator';
import DonutChart from './components/DonutChart';
import ChargingTip from './components/ChargingTip';
import Footer from './components/Footer';
import { PERIOD_DISPLAY } from './engine/rateEngine';

/** Static registry mapping serviceAreaId → imported rate plan data */
const RATE_PLAN_REGISTRY = {
  'pge-3ce-sbco': ratePlans,
};

const CUSTOM_ID = 'custom';

/**
 * Builds the rates[season][period].{combined, delivery, generation} structure
 * from the v2 ratePlans.json schema, using the correct formula per provider.
 *   'pge' → combined = pgeTotalBundled
 *   '3ce' → combined = pgeDelivery + cce
 */
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
    // E-1 tiered plan: compute flat tier-1 rate for the selected provider
    const r = planConfig.rates;
    const delivery = r.pgeDelivery.tier1;
    const generation = provider === 'pge' ? r.pgeGeneration.allUsage : r.cce.allUsage;
    const combined = provider === 'pge' ? r.pgeTotalBundled.tier1 : delivery + generation;
    return { ...planConfig, _displayProvider: providerLabel, _flatRate: { combined, delivery, generation } };
  }

  const rates = buildRateMatrix(planConfig.rates, provider);
  return { ...planConfig, rates, _displayProvider: providerLabel };
}

/** Plan-specific hint text shown below the plan selector */
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

  // Vehicle state (lifted from Calculator for two-panel layout)
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehiclesData.vehicles[0].id);
  const [customKwh, setCustomKwh] = useState('');
  const [currentPct, setCurrentPct] = useState(20);

  // Rate breakdown toggle
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  // Derive city, service area, and rate plans from cityId
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
    <div className="min-h-screen bg-offwhite font-sans">

      {/* ── Top Bar ── */}
      <header
        data-testid="app-header"
        className="bg-ink sticky top-0 z-10 h-14 flex items-center justify-between px-6"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-paprika rounded-[7px] flex items-center justify-center text-sm leading-none">
            ⚡
          </div>
          <span className="font-serif text-[18px] text-white tracking-[-0.3px]">EV Made Easy</span>
        </div>
        <div className="text-xs text-pewter flex items-center gap-1.5 hidden sm:flex">
          <span>{city.name}, CA</span>
          <span className="w-1 h-1 rounded-full bg-paprika" />
          <span>{serviceArea.shortLabel}</span>
          <span className="w-1 h-1 rounded-full bg-paprika" />
          <span>Updated Mar 2026</span>
        </div>
      </header>

      {/* ── Two-Panel Layout ── */}
      <div
        data-testid="app-main"
        className="grid max-[860px]:grid-cols-1 grid-cols-[1fr_380px] max-w-[1120px] mx-auto"
      >

        {/* ════ LEFT PANEL: Inputs ════ */}
        <div className="bg-white border-r border-pewter-light max-[860px]:border-r-0 max-[860px]:border-b px-10 py-9 max-[860px]:px-5 max-[860px]:py-6">

          {/* Location section */}
          <section className="mb-7">
            <div className="text-[11px] uppercase tracking-[2px] text-paprika font-semibold mb-4">
              Location
            </div>
            <label className="block text-[13px] font-semibold text-[var(--text-primary)] mb-1.5">
              Your city
            </label>
            <CityPicker cityId={cityId} cities={serviceAreasData.cities} onChange={handleCityChange} />
            <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
              {serviceArea.shortLabel} service territory
            </p>
          </section>

          <hr className="border-t border-pewter-light my-6" />

          {/* Rate Plan section */}
          <section className="mb-7">
            <div className="text-[11px] uppercase tracking-[2px] text-paprika font-semibold mb-4">
              Rate Plan
            </div>
            <label className="block text-[13px] font-semibold text-[var(--text-primary)] mb-1.5">
              Select your plan
            </label>
            <PlanSelector planId={planId} plans={ratePlansData.ratePlans} onChange={id => { setPlanId(id); }} />
            <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
              {PLAN_HINTS[planId]}
            </p>

            {supportsProviderToggle && (
              <div className="mt-4">
                <label className="block text-[13px] font-semibold text-[var(--text-primary)] mb-1.5">
                  Generation provider
                </label>
                <ProviderSelector provider={provider} onChange={setProvider} options={serviceArea.providers} />
                <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  {serviceArea.providerHint}
                </p>
              </div>
            )}
          </section>

          <hr className="border-t border-pewter-light my-6" />

          {/* Vehicle section */}
          <section data-testid="calculator" className="mb-7">
            <div className="text-[11px] uppercase tracking-[2px] text-paprika font-semibold mb-4">
              Your Vehicle
            </div>
            <VehicleInputs
              selectedId={selectedVehicleId}
              customKwh={customKwh}
              currentPct={currentPct}
              batteryKwh={batteryKwh}
              onSelectedIdChange={setSelectedVehicleId}
              onCustomKwhChange={setCustomKwh}
              onCurrentPctChange={setCurrentPct}
            />
          </section>

          <hr className="border-t border-pewter-light my-6" />

          {/* Timeline section */}
          <section className="mb-7">
            <div className="text-[11px] uppercase tracking-[2px] text-paprika font-semibold mb-4">
              Today's Rate Schedule
            </div>
            <label className="block text-[13px] font-semibold text-[var(--text-primary)] mb-2">
              {planConfig.name}{supportsProviderToggle ? ' · Every day including weekends' : ''}
            </label>
            <Timeline planConfig={effectivePlanConfig} />
          </section>

          {/* Charging tip */}
          <ChargingTip planConfig={effectivePlanConfig} />
        </div>

        {/* ════ RIGHT PANEL: Results (sticky, dark) ════ */}
        <div
          className="bg-ink text-white px-8 py-9 max-[860px]:px-5 max-[860px]:py-6 max-[860px]:static sticky top-14 h-[calc(100vh-56px)] max-[860px]:h-auto overflow-y-auto flex flex-col"
        >
          {/* Rate badge + hero number + countdown */}
          <RateDisplay planConfig={effectivePlanConfig} />

          {/* Donut: delivery / generation split */}
          <DonutChart planConfig={effectivePlanConfig} />

          {/* Cost estimate cards */}
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-[2px] text-apricot font-medium mb-3">
              Charging Cost Estimate
            </div>
            <CostOutput summary={summary} />
            {!summary && (
              <p className="text-sm text-pewter">
                {currentPct >= 100
                  ? 'Battery is already full.'
                  : 'Select a vehicle and adjust the charge level to see estimates.'}
              </p>
            )}
          </div>

          {/* Rate breakdown toggle */}
          {supportsProviderToggle && effectivePlanConfig.rates && (
            <RateBreakdown
              planConfig={effectivePlanConfig}
              open={breakdownOpen}
              onToggle={() => setBreakdownOpen(o => !o)}
            />
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <Footer planConfig={effectivePlanConfig} globalMetadata={ratePlansData._metadata} city={city} serviceArea={serviceArea} />
    </div>
  );
}

/** Collapsible per-period rate breakdown table for the right panel */
function RateBreakdown({ planConfig, open, onToggle }) {
  const PERIOD_ORDER = ['peak', 'partPeak', 'offPeak'];
  const seasonKeys = Object.keys(planConfig.seasons ?? {});
  if (!seasonKeys.length) return null;

  const firstSeason = seasonKeys[0];
  const periodKeys = PERIOD_ORDER.filter(p => planConfig.rates[firstSeason]?.[p] !== undefined);

  return (
    <div className="mt-auto pt-5">
      <button
        className="w-full bg-transparent border border-white/10 rounded-lg text-pewter text-xs px-3.5 py-2.5 flex items-center justify-between hover:border-white/20 hover:text-white transition-colors"
        onClick={onToggle}
      >
        <span>Show rate breakdown by period</span>
        <span>{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr>
                <th className="text-left py-1.5 px-2 text-apricot font-medium uppercase tracking-[0.8px] text-[10px] border-b border-white/[0.08]">
                  Period
                </th>
                {seasonKeys.map(s => (
                  <th key={s} className="text-left py-1.5 px-2 text-apricot font-medium uppercase tracking-[0.8px] text-[10px] border-b border-white/[0.08] capitalize">
                    {planConfig.seasons[s].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periodKeys.map(period => (
                <tr key={period} className="border-b border-white/[0.04]">
                  <td className="py-1.5 px-2 text-white font-medium">
                    {PERIOD_DISPLAY[period]?.label ?? period}
                  </td>
                  {seasonKeys.map(s => (
                    <td key={s} className="py-1.5 px-2 text-pewter tabular-nums">
                      ${planConfig.rates[s][period]?.combined.toFixed(5) ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
