import RateDisplay from './components/RateDisplay';
import Timeline from './components/Timeline';
import Calculator from './components/Calculator';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-8">
        EV Charging Cost Calculator
      </h1>
      <RateDisplay />
      <Timeline />
      <Calculator />
    </div>
  );
}
