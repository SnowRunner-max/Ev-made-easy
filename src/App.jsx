import RateDisplay from './components/RateDisplay';
import Timeline from './components/Timeline';
import Calculator from './components/Calculator';
import ChargingTip from './components/ChargingTip';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header
        data-testid="app-header"
        className="bg-white border-b border-gray-200 px-4 py-4 text-center"
      >
        <h1 className="text-xl font-bold text-gray-900">EV Charging Cost Calculator</h1>
        <p className="text-sm text-gray-500 mt-0.5">Buellton, CA · PG&E EV2-A with 3CE</p>
      </header>

      <main
        data-testid="app-main"
        className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8"
      >
        <RateDisplay />
        <Timeline />
        <Calculator />
        <ChargingTip />
      </main>

      <footer
        data-testid="app-footer"
        className="border-t border-gray-200 bg-white px-4 py-6 text-center text-xs text-gray-400 space-y-1"
      >
        <p>
          Rates shown combine 3CE generation + PG&E delivery for the EV2-A plan in Buellton, CA.
        </p>
        <p>
          A daily base service charge of $0.79/day (~$24/month) is not included in the per-kWh rates above.
        </p>
        <p className="pt-1">
          <a
            href="https://www.pge.com/en/account/rate-plans/electric-vehicle-rate-plans.html"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-600"
          >
            PG&E EV Rates
          </a>
          {' · '}
          <a
            href="https://3cenergy.org/rates"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-600"
          >
            3CE Rates
          </a>
        </p>
      </footer>
    </div>
  );
}
