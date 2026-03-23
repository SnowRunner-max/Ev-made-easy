import RateDisplay from './components/RateDisplay';
import Timeline from './components/Timeline';
import Calculator from './components/Calculator';
import ChargingTip from './components/ChargingTip';
import Footer from './components/Footer';

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

      <Footer />
    </div>
  );
}
