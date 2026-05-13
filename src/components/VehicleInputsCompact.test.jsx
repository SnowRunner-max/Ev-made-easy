import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import vehiclesData from '../data/vehicles.json';
import VehicleInputsCompact from './VehicleInputsCompact';

const firstVehicle = vehiclesData.vehicles[0];

describe('VehicleInputsCompact', () => {
  it('renders the selected vehicle and battery size', () => {
    render(
      <VehicleInputsCompact
        selectedId={firstVehicle.id}
        customKwh="75"
        batteryKwh={firstVehicle.usableBatteryKwh}
        onSelectedIdChange={() => {}}
        onCustomKwhChange={() => {}}
      />
    );

    expect(screen.getByTestId('vehicle-select-compact')).toHaveValue(firstVehicle.id);
    expect(screen.getByTestId('battery-display')).toHaveTextContent(`Battery: ${firstVehicle.usableBatteryKwh} kWh`);
  });

  it('calls onSelectedIdChange when the user selects a different vehicle', () => {
    const onSelectedIdChange = vi.fn();

    render(
      <VehicleInputsCompact
        selectedId={firstVehicle.id}
        customKwh="75"
        batteryKwh={firstVehicle.usableBatteryKwh}
        onSelectedIdChange={onSelectedIdChange}
        onCustomKwhChange={() => {}}
      />
    );

    fireEvent.change(screen.getByTestId('vehicle-select-compact'), { target: { value: 'custom' } });

    expect(onSelectedIdChange).toHaveBeenCalledWith('custom');
  });

  it('shows and updates custom battery input for custom vehicles', () => {
    const onCustomKwhChange = vi.fn();

    render(
      <VehicleInputsCompact
        selectedId="custom"
        customKwh="82"
        batteryKwh={82}
        onSelectedIdChange={() => {}}
        onCustomKwhChange={onCustomKwhChange}
      />
    );

    const input = screen.getByPlaceholderText('Battery size');
    expect(input).toHaveValue(82);

    fireEvent.change(input, { target: { value: '90' } });

    expect(onCustomKwhChange).toHaveBeenCalledWith('90');
  });
});
