import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ratePlans from '../data/ratePlans.json';
import Calculator from './Calculator';

const ev2aConfig = ratePlans.plans['ev2a'];

describe('Calculator — EV selector', () => {
  it('renders the vehicle select dropdown', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    expect(screen.getByTestId('vehicle-select')).toBeInTheDocument();
  });

  it('defaults to Tesla Model 3 as the first option', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    const select = screen.getByTestId('vehicle-select');
    expect(select.value).toBe('tesla-model-3-standard');
  });

  it('shows 6 options total — 5 vehicles plus Custom', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    const options = screen.getByTestId('vehicle-select').querySelectorAll('option');
    expect(options).toHaveLength(6);
  });

  it('displays 60 kWh battery for the default Tesla Model 3', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    expect(screen.getByTestId('battery-display')).toHaveTextContent('60 kWh');
  });

  it('shows 75 kWh when Tesla Model Y is selected', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    fireEvent.change(screen.getByTestId('vehicle-select'), {
      target: { value: 'tesla-model-y-long-range' },
    });
    expect(screen.getByTestId('battery-display')).toHaveTextContent('75 kWh');
  });

  it('shows 135 kWh when Rivian R1T is selected', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    fireEvent.change(screen.getByTestId('vehicle-select'), {
      target: { value: 'rivian-r1t-large' },
    });
    expect(screen.getByTestId('battery-display')).toHaveTextContent('135 kWh');
  });

  it('updates battery display when any vehicle is selected', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    fireEvent.change(screen.getByTestId('vehicle-select'), {
      target: { value: 'chevy-equinox-ev' },
    });
    expect(screen.getByTestId('battery-display')).toHaveTextContent('85 kWh');
  });

  it('shows the custom kWh input when Custom is selected', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    fireEvent.change(screen.getByTestId('vehicle-select'), {
      target: { value: 'custom' },
    });
    expect(screen.getByTestId('custom-kwh-input')).toBeInTheDocument();
  });

  it('hides the custom kWh input when a named vehicle is selected', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    fireEvent.change(screen.getByTestId('vehicle-select'), {
      target: { value: 'custom' },
    });
    fireEvent.change(screen.getByTestId('vehicle-select'), {
      target: { value: 'tesla-model-3-standard' },
    });
    expect(screen.queryByTestId('custom-kwh-input')).not.toBeInTheDocument();
  });

  it('updates battery display to match custom kWh input value', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    fireEvent.change(screen.getByTestId('vehicle-select'), {
      target: { value: 'custom' },
    });
    fireEvent.change(screen.getByTestId('custom-kwh-input'), {
      target: { value: '40' },
    });
    expect(screen.getByTestId('battery-display')).toHaveTextContent('40 kWh');
  });

  it('shows 1 kWh (minimum) when custom input is empty', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    fireEvent.change(screen.getByTestId('vehicle-select'), {
      target: { value: 'custom' },
    });
    expect(screen.getByTestId('battery-display')).toHaveTextContent('1 kWh');
  });
});

// Pin time to 3 PM PST (part-peak, winter) — charging now costs more than at midnight,
// so both targets have meaningful savings to display.
const PART_PEAK_3PM = new Date('2026-01-15T15:00:00-08:00');

describe('Calculator — charge slider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(PART_PEAK_3PM);
  });
  afterEach(() => vi.useRealTimers());

  it('renders the charge level slider', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    expect(screen.getByTestId('charge-slider')).toBeInTheDocument();
  });

  it('slider defaults to 20%', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    expect(screen.getByTestId('charge-slider')).toHaveValue('20');
  });

  it('displays default charge percentage label', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    expect(screen.getByTestId('charge-label')).toHaveTextContent('20%');
  });

  it('moving the slider updates the displayed percentage', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    fireEvent.change(screen.getByTestId('charge-slider'), { target: { value: '55' } });
    expect(screen.getByTestId('charge-label')).toHaveTextContent('55%');
  });
});

describe('Calculator — cost output', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(PART_PEAK_3PM);
  });
  afterEach(() => vi.useRealTimers());

  it('renders cost-output when battery > 0 and charge < 100%', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    // Default: Tesla Model 3 (60 kWh), slider at 20%
    expect(screen.getByTestId('cost-output')).toBeInTheDocument();
  });

  it('renders cost-output with minimum 1 kWh when custom input is empty', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    fireEvent.change(screen.getByTestId('vehicle-select'), { target: { value: 'custom' } });
    // custom input is empty → batteryKwh clamps to minimum of 1 kWh
    expect(screen.getByTestId('cost-output')).toBeInTheDocument();
  });

  it('does not render cost-output when slider is at 100%', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    fireEvent.change(screen.getByTestId('charge-slider'), { target: { value: '100' } });
    expect(screen.queryByTestId('cost-output')).not.toBeInTheDocument();
  });

  it('shows "To charge to 80%" block', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    expect(screen.getByTestId('to80-block')).toBeInTheDocument();
  });

  it('shows "To charge to 100%" block', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    expect(screen.getByTestId('to100-block')).toBeInTheDocument();
  });

  it('to80-block is absent when current charge is already 80%', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    fireEvent.change(screen.getByTestId('charge-slider'), { target: { value: '80' } });
    expect(screen.queryByTestId('to80-block')).not.toBeInTheDocument();
  });

  it('both blocks are absent when current charge is 100%', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    fireEvent.change(screen.getByTestId('charge-slider'), { target: { value: '100' } });
    expect(screen.queryByTestId('to80-block')).not.toBeInTheDocument();
    expect(screen.queryByTestId('to100-block')).not.toBeInTheDocument();
  });

  it('to100-block is present when current charge is 79%', () => {
    render(<Calculator planConfig={ev2aConfig} />);
    fireEvent.change(screen.getByTestId('charge-slider'), { target: { value: '79' } });
    expect(screen.queryByTestId('to80-block')).toBeInTheDocument();
    expect(screen.queryByTestId('to100-block')).toBeInTheDocument();
  });

  describe('to80 block content (Tesla Model 3, 60 kWh, 20% → 80%)', () => {
    // 60 × (80-20)% = 36 kWh needed; 36 / 7.7 ≈ 4.68h
    // costNow at 3 PM: 7.7 kWh part-peak + 28.3 kWh peak ≈ $14.55
    // cheapest (midnight off-peak): 36 × $0.22261 ≈ $8.01
    // savings ≈ $6.54

    it('shows kWh needed', () => {
      render(<Calculator planConfig={ev2aConfig} />);
      expect(screen.getByTestId('to80-kwh')).toHaveTextContent('36');
    });

    it('shows hours estimate', () => {
      render(<Calculator planConfig={ev2aConfig} />);
      // 36 / 7.7 ≈ 4.68 — text should contain a number around 4.6–4.7
      const text = screen.getByTestId('to80-hours').textContent;
      expect(parseFloat(text)).toBeCloseTo(36 / 7.7, 1);
    });

    it('shows charge-now cost', () => {
      render(<Calculator planConfig={ev2aConfig} />);
      expect(screen.getByTestId('to80-cost-now')).toHaveTextContent('$');
    });

    it('shows cheapest cost', () => {
      render(<Calculator planConfig={ev2aConfig} />);
      expect(screen.getByTestId('to80-cheapest-cost')).toHaveTextContent('$');
    });

    it('shows savings', () => {
      render(<Calculator planConfig={ev2aConfig} />);
      expect(screen.getByTestId('to80-savings')).toHaveTextContent('$');
    });

    it('charge-now cost is greater than cheapest cost at 3 PM (part-peak)', () => {
      render(<Calculator planConfig={ev2aConfig} />);
      const costNow = parseFloat(
        screen.getByTestId('to80-cost-now').textContent.replace(/[^0-9.]/g, '')
      );
      const cheapest = parseFloat(
        screen.getByTestId('to80-cheapest-cost').textContent.replace(/[^0-9.]/g, '')
      );
      expect(costNow).toBeGreaterThan(cheapest);
    });

    it('savings equals charge-now cost minus cheapest cost', () => {
      render(<Calculator planConfig={ev2aConfig} />);
      const costNow = parseFloat(
        screen.getByTestId('to80-cost-now').textContent.replace(/[^0-9.]/g, '')
      );
      const cheapest = parseFloat(
        screen.getByTestId('to80-cheapest-cost').textContent.replace(/[^0-9.]/g, '')
      );
      const savings = parseFloat(
        screen.getByTestId('to80-savings').textContent.replace(/[^0-9.]/g, '')
      );
      expect(savings).toBeCloseTo(costNow - cheapest, 1);
    });
  });

  describe('to100 block content (Tesla Model 3, 60 kWh, 20% → 100%)', () => {
    // 60 × (100-20)% = 48 kWh needed; 48 / 7.7 ≈ 6.23h

    it('shows kWh needed', () => {
      render(<Calculator planConfig={ev2aConfig} />);
      expect(screen.getByTestId('to100-kwh')).toHaveTextContent('48');
    });

    it('shows hours estimate', () => {
      render(<Calculator planConfig={ev2aConfig} />);
      const text = screen.getByTestId('to100-hours').textContent;
      expect(parseFloat(text)).toBeCloseTo(48 / 7.7, 1);
    });

    it('shows charge-now cost', () => {
      render(<Calculator planConfig={ev2aConfig} />);
      expect(screen.getByTestId('to100-cost-now')).toHaveTextContent('$');
    });

    it('shows cheapest cost', () => {
      render(<Calculator planConfig={ev2aConfig} />);
      expect(screen.getByTestId('to100-cheapest-cost')).toHaveTextContent('$');
    });

    it('shows savings', () => {
      render(<Calculator planConfig={ev2aConfig} />);
      expect(screen.getByTestId('to100-savings')).toHaveTextContent('$');
    });
  });
});
