import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import vehiclesData from '../data/vehicles.json';
import { VehicleInputs, CostOutput } from './Calculator';

const firstVehicle = vehiclesData.vehicles[0];

const baseProps = {
  selectedId: firstVehicle.id,
  customKwh: '',
  currentPct: 20,
  batteryKwh: firstVehicle.usableBatteryKwh,
  onSelectedIdChange: () => {},
  onCustomKwhChange: () => {},
  onCurrentPctChange: () => {},
};

describe('VehicleInputs', () => {
  it('renders vehicle-select', () => {
    render(<VehicleInputs {...baseProps} />);
    expect(screen.getByTestId('vehicle-select')).toBeInTheDocument();
  });

  it('shows the battery size from props', () => {
    render(<VehicleInputs {...baseProps} />);
    expect(screen.getByTestId('battery-display')).toHaveTextContent(`${firstVehicle.usableBatteryKwh} kWh`);
  });

  it('calls onSelectedIdChange when the vehicle changes', () => {
    const onSelectedIdChange = vi.fn();
    render(<VehicleInputs {...baseProps} onSelectedIdChange={onSelectedIdChange} />);

    fireEvent.change(screen.getByTestId('vehicle-select'), { target: { value: 'custom' } });

    expect(onSelectedIdChange).toHaveBeenCalledWith('custom');
  });

  it('shows custom kWh input when Custom is selected', () => {
    render(<VehicleInputs {...baseProps} selectedId="custom" customKwh="80" batteryKwh={80} />);
    expect(screen.getByTestId('custom-kwh-input')).toBeInTheDocument();
  });

  it('calls onCustomKwhChange when the custom input changes', () => {
    const onCustomKwhChange = vi.fn();
    render(
      <VehicleInputs
        {...baseProps}
        selectedId="custom"
        customKwh="80"
        batteryKwh={80}
        onCustomKwhChange={onCustomKwhChange}
      />
    );

    fireEvent.change(screen.getByTestId('custom-kwh-input'), { target: { value: '90' } });

    expect(onCustomKwhChange).toHaveBeenCalledWith('90');
  });

  it('renders the charge slider with the current percentage', () => {
    render(<VehicleInputs {...baseProps} currentPct={45} />);
    expect(screen.getByTestId('charge-label')).toHaveTextContent('45%');
    expect(screen.getByTestId('charge-slider')).toHaveValue('45');
  });

  it('calls onCurrentPctChange when the slider moves', () => {
    const onCurrentPctChange = vi.fn();
    render(<VehicleInputs {...baseProps} onCurrentPctChange={onCurrentPctChange} />);

    fireEvent.change(screen.getByTestId('charge-slider'), { target: { value: '70' } });

    expect(onCurrentPctChange).toHaveBeenCalledWith(70);
  });

  it('hides the vehicle picker when sliderOnly is true', () => {
    render(<VehicleInputs {...baseProps} sliderOnly />);
    expect(screen.queryByTestId('vehicle-select')).not.toBeInTheDocument();
    expect(screen.getByTestId('charge-slider')).toBeInTheDocument();
  });
});

describe('CostOutput', () => {
  it('renders nothing when summary is null', () => {
    const { container } = render(<CostOutput summary={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the to80 block with cost, kWh, and duration', () => {
    const summary = {
      to80: { costNow: 5.4321, kwhNeeded: 12.34, hoursNeeded: 1.5 },
    };
    render(<CostOutput summary={summary} />);

    expect(screen.getByTestId('to80-block')).toBeInTheDocument();
    expect(screen.getByTestId('to80-cost-now')).toHaveTextContent('$5.43');
    expect(screen.getByTestId('to80-kwh')).toHaveTextContent('+12.3 kWh');
    expect(screen.getByTestId('to80-duration')).toHaveTextContent('1 hr 30 min');
    expect(screen.queryByTestId('to100-block')).not.toBeInTheDocument();
  });

  it('renders the to100 block when present', () => {
    const summary = {
      to80: { costNow: 5, kwhNeeded: 10, hoursNeeded: 1 },
      to100: { costNow: 8, kwhNeeded: 20, hoursNeeded: 2.25 },
    };
    render(<CostOutput summary={summary} />);

    expect(screen.getByTestId('to100-block')).toBeInTheDocument();
    expect(screen.getByTestId('to100-cost-now')).toHaveTextContent('$8.00');
    expect(screen.getByTestId('to100-duration')).toHaveTextContent('2 hr 15 min');
  });
});
