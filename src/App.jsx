import { useState } from 'react';
import ratePlans from './data/ratePlans.json';
import PlanSelector from './components/PlanSelector';
import ProviderSelector from './components/ProviderSelector';
import TierSelector from './components/TierSelector';
import RateDisplay from './components/RateDisplay';
import Timeline from './components/Timeline';
import Calculator from './components/Calculator';
import ChargingTip from './components/ChargingTip';
import Footer from './components/Footer';

function withCombined(planRates, combinedRates) {
  return Object.fromEntries(
    Object.entries(planRates).map(([season, periods]) => [
      season,
      Object.fromEntries(
        Object.entries(periods).map(([period, vals]) => [
          period,
          { ...vals, combined: combinedRates[season][period] }
        ])
      )
    ])
  );
}

function getEffectiveConfig(planConfig, provider, cceTier) {
  if (provider === 'pge' && planConfig.pgeRates) {
    return {
      ...planConfig,
      rates: withCombined(planConfig.rates, planConfig.pgeRates),
      _metadata: { ...planConfig._metadata, activeProvider: 'PG&E Bundled Service' }
    };
  }

  const tier = provider === '3ce' ? cceTier : '3cchoice';
  const tierRates = planConfig.cceTiers?.[tier];
  const tierLabel = tier === '3cprime' ? '3Cprime (100% Renewable)' : '3Cchoice';
  const activeProvider = `Central Coast Community Energy (3CE) — ${tierLabel}`;

  if (tierRates) {
    return {
      ...planConfig,
      rates: withCombined(planConfig.rates, tierRates),
      _metadata: { ...planConfig._metadata, activeProvider }
    };
  }

  return { ...planConfig, _metadata: { ...planConfig._metadata, activeProvider } };
}

export default function App() {
  const [planId, setPlanId] = useState('ev2a');
  const [provider, setProvider] = useState('pge');
  const [cceTier, setCceTier] = useState('3cchoice');

  const planConfig = ratePlans.plans[planId];

  if (!planConfig) {
    return <div className="p-8 text-red-600">Error: Unknown rate plan &quot;{planId}&quot;</div>;
  }

  function handlePlanChange(newPlanId) {
    const newConfig = ratePlans.plans[newPlanId];
    if (!newConfig.pgeRates && provider === 'pge') {
      setProvider('3ce');
    }
    setPlanId(newPlanId);
  }

  const effectivePlanConfig = getEffectiveConfig(planConfig, provider, cceTier);
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
          {provider === '3ce' && <TierSelector tier={cceTier} onChange={setCceTier} />}
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
