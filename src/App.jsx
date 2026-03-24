import { useState } from 'react';
import ratePlans from './data/ratePlans.json';
import PlanSelector from './components/PlanSelector';
import ProviderSelector from './components/ProviderSelector';
import RateDisplay from './components/RateDisplay';
import Timeline from './components/Timeline';
import Calculator from './components/Calculator';
import ChargingTip from './components/ChargingTip';
import Footer from './components/Footer';

function getEffectiveConfig(planConfig, provider) {
  const pg = planConfig.pgeRates;
  const providerName = planConfig._metadata.providers?.[provider]?.name
    ?? (provider === 'pge' ? 'PG&E Bundled Service' : 'Central Coast Community Energy (3CE)');

  if (provider === 'pge' && pg) {
    return {
      ...planConfig,
      rates: Object.fromEntries(
        Object.entries(planConfig.rates).map(([season, periods]) => [
          season,
          Object.fromEntries(
            Object.entries(periods).map(([period, vals]) => [
              period,
              { ...vals, combined: pg[season][period] }
            ])
          )
        ])
      ),
      _metadata: { ...planConfig._metadata, activeProvider: providerName }
    };
  }

  return {
    ...planConfig,
    _metadata: { ...planConfig._metadata, activeProvider: providerName }
  };
}

export default function App() {
  const [planId, setPlanId] = useState('ev2a');
  const [provider, setProvider] = useState('pge');

  const planConfig = ratePlans.plans[planId];

  function handlePlanChange(newPlanId) {
    const newConfig = ratePlans.plans[newPlanId];
    if (!newConfig.pgeRates && provider === 'pge') {
      setProvider('3ce');
    }
    setPlanId(newPlanId);
  }

  const effectivePlanConfig = getEffectiveConfig(planConfig, provider);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header
        data-testid="app-header"
        className="bg-white border-b border-gray-200 px-4 py-4 text-center"
      >
        <h1 className="text-xl font-bold text-gray-900">EV Charging Cost Calculator</h1>
        <p className="text-sm text-gray-500 mt-0.5">Buellton, CA · {effectivePlanConfig._metadata.activeProvider}</p>
        <div className="mt-2 flex flex-col items-center gap-1">
          <PlanSelector planId={planId} onChange={handlePlanChange} />
          <ProviderSelector provider={provider} onChange={setProvider} />
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

      <Footer planConfig={effectivePlanConfig} />
    </div>
  );
}
