import { useState } from 'react';
import ratePlans from './data/ratePlans.json';
import PlanSelector from './components/PlanSelector';
import ProviderSelector from './components/ProviderSelector';
import RateDisplay from './components/RateDisplay';
import Timeline from './components/Timeline';
import Calculator from './components/Calculator';
import ChargingTip from './components/ChargingTip';
import Footer from './components/Footer';

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

  // E-1 tiered: no TOU rate matrix to transform
  if (!planConfig.touPeriods) {
    return { ...planConfig, _displayProvider: providerLabel };
  }

  const rates = buildRateMatrix(planConfig.rates, provider);
  return { ...planConfig, rates, _displayProvider: providerLabel };
}

export default function App() {
  const [planId, setPlanId] = useState('EV2-A');
  const [provider, setProvider] = useState('pge');

  const planConfig = ratePlans.ratePlans[planId];

  if (!planConfig) {
    return <div className="p-8 text-red-600">Error: Unknown rate plan &quot;{planId}&quot;</div>;
  }

  function handlePlanChange(newPlanId) {
    setPlanId(newPlanId);
  }

  const effectivePlanConfig = getEffectiveConfig(planConfig, provider);
  const supportsProviderToggle = !!planConfig.touPeriods;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header
        data-testid="app-header"
        className="bg-white border-b border-gray-200 px-4 py-4 text-center"
      >
        <h1 className="text-xl font-bold text-gray-900">EV Charging Cost Calculator</h1>
        <p className="text-sm text-gray-500 mt-0.5">Buellton, CA · {effectivePlanConfig._displayProvider}</p>
        <div className="mt-2 flex flex-col items-center gap-1">
          <PlanSelector planId={planId} onChange={handlePlanChange} />
          {supportsProviderToggle && (
            <ProviderSelector provider={provider} onChange={setProvider} />
          )}
        </div>
      </header>

      <main
        data-testid="app-main"
        className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8"
      >
        <RateDisplay planConfig={effectivePlanConfig} />
        <Timeline planConfig={effectivePlanConfig} />
        <Calculator planConfig={effectivePlanConfig} />
        <ChargingTip planConfig={effectivePlanConfig} />
      </main>

      <Footer planConfig={effectivePlanConfig} globalMetadata={ratePlans._metadata} />
    </div>
  );
}
