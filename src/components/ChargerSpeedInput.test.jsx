import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChargerSpeedInput from './ChargerSpeedInput';

// Standard charger speeds the component must offer as options (kW)
const STANDARD_SPEEDS = [1.4, 3.8, 7.2, 7.7, 9.6, 11.5, 19.2];

describe('ChargerSpeedInput', () => {
  describe('rendering', () => {
    it('renders a select with data-testid="charger-speed-select"', () => {
      render(
        <ChargerSpeedInput
          chargerKw={7.7}
          vehicleMaxKw={11.5}
          onChange={() => {}}
        />
      );

      expect(screen.getByTestId('charger-speed-select')).toBeInTheDocument();
    });

    it('shows the current chargerKw as the selected value', () => {
      render(
        <ChargerSpeedInput
          chargerKw={7.7}
          vehicleMaxKw={11.5}
          onChange={() => {}}
        />
      );

      expect(screen.getByTestId('charger-speed-select')).toHaveValue('7.7');
    });

    it('shows a different current value when chargerKw prop changes', () => {
      render(
        <ChargerSpeedInput
          chargerKw={3.8}
          vehicleMaxKw={11.5}
          onChange={() => {}}
        />
      );

      expect(screen.getByTestId('charger-speed-select')).toHaveValue('3.8');
    });
  });

  describe('option filtering by vehicleMaxKw', () => {
    it('omits speeds above vehicleMaxKw when vehicleMaxKw is a number', () => {
      // vehicleMaxKw=7.7 means 9.6, 11.5, and 19.2 kW should not appear
      render(
        <ChargerSpeedInput
          chargerKw={7.7}
          vehicleMaxKw={7.7}
          onChange={() => {}}
        />
      );

      const select = screen.getByTestId('charger-speed-select');
      const optionValues = Array.from(select.options).map(o => parseFloat(o.value));

      expect(optionValues).not.toContain(9.6);
      expect(optionValues).not.toContain(11.5);
      expect(optionValues).not.toContain(19.2);
    });

    it('includes speeds at or below vehicleMaxKw when vehicleMaxKw is a number', () => {
      // vehicleMaxKw=7.7 means 1.4, 3.8, 7.2, and 7.7 kW should all be present
      render(
        <ChargerSpeedInput
          chargerKw={7.7}
          vehicleMaxKw={7.7}
          onChange={() => {}}
        />
      );

      const select = screen.getByTestId('charger-speed-select');
      const optionValues = Array.from(select.options).map(o => parseFloat(o.value));

      expect(optionValues).toContain(1.4);
      expect(optionValues).toContain(3.8);
      expect(optionValues).toContain(7.2);
      expect(optionValues).toContain(7.7);
    });

    it('shows all standard speeds including 19.2 kW when vehicleMaxKw is null (custom vehicle)', () => {
      render(
        <ChargerSpeedInput
          chargerKw={7.7}
          vehicleMaxKw={null}
          onChange={() => {}}
        />
      );

      const select = screen.getByTestId('charger-speed-select');
      const optionValues = Array.from(select.options).map(o => parseFloat(o.value));

      STANDARD_SPEEDS.forEach(speed => {
        expect(optionValues).toContain(speed);
      });
    });

    it('filters correctly for a mid-range vehicleMaxKw of 11.5', () => {
      // vehicleMaxKw=11.5: 19.2 excluded, everything else present
      render(
        <ChargerSpeedInput
          chargerKw={7.7}
          vehicleMaxKw={11.5}
          onChange={() => {}}
        />
      );

      const select = screen.getByTestId('charger-speed-select');
      const optionValues = Array.from(select.options).map(o => parseFloat(o.value));

      expect(optionValues).toContain(11.5);
      expect(optionValues).not.toContain(19.2);
    });
  });

  describe('(max) label on the vehicleMaxKw option', () => {
    it('includes "(max)" in the label of the option matching vehicleMaxKw', () => {
      // 7.7 kW is both the current selection and the vehicle max
      render(
        <ChargerSpeedInput
          chargerKw={7.7}
          vehicleMaxKw={7.7}
          onChange={() => {}}
        />
      );

      const select = screen.getByTestId('charger-speed-select');
      const maxOption = Array.from(select.options).find(o => parseFloat(o.value) === 7.7);

      expect(maxOption).toBeDefined();
      expect(maxOption.textContent).toMatch(/\(max\)/i);
    });

    it('does not include "(max)" on options that are not vehicleMaxKw', () => {
      render(
        <ChargerSpeedInput
          chargerKw={3.8}
          vehicleMaxKw={7.7}
          onChange={() => {}}
        />
      );

      const select = screen.getByTestId('charger-speed-select');
      const nonMaxOption = Array.from(select.options).find(o => parseFloat(o.value) === 3.8);

      expect(nonMaxOption).toBeDefined();
      expect(nonMaxOption.textContent).not.toMatch(/\(max\)/i);
    });

    it('does not add "(max)" to any option when vehicleMaxKw is null', () => {
      render(
        <ChargerSpeedInput
          chargerKw={7.7}
          vehicleMaxKw={null}
          onChange={() => {}}
        />
      );

      const select = screen.getByTestId('charger-speed-select');
      const allLabels = Array.from(select.options).map(o => o.textContent);

      allLabels.forEach(label => {
        expect(label).not.toMatch(/\(max\)/i);
      });
    });
  });

  describe('onChange callback', () => {
    it('calls onChange with a number (not a string) when the user selects a new speed', () => {
      const onChange = vi.fn();

      render(
        <ChargerSpeedInput
          chargerKw={7.7}
          vehicleMaxKw={11.5}
          onChange={onChange}
        />
      );

      fireEvent.change(screen.getByTestId('charger-speed-select'), {
        target: { value: '11.5' },
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(11.5);
      // Explicitly assert the type — select always yields a string, component must convert
      expect(typeof onChange.mock.calls[0][0]).toBe('number');
    });

    it('calls onChange with 1.4 (number) when the slowest speed is selected', () => {
      const onChange = vi.fn();

      render(
        <ChargerSpeedInput
          chargerKw={7.7}
          vehicleMaxKw={null}
          onChange={onChange}
        />
      );

      fireEvent.change(screen.getByTestId('charger-speed-select'), {
        target: { value: '1.4' },
      });

      expect(onChange).toHaveBeenCalledWith(1.4);
      expect(typeof onChange.mock.calls[0][0]).toBe('number');
    });
  });

  describe('disabled prop', () => {
    it('disables the select when disabled prop is true', () => {
      render(
        <ChargerSpeedInput
          chargerKw={7.7}
          vehicleMaxKw={11.5}
          onChange={() => {}}
          disabled={true}
        />
      );

      expect(screen.getByTestId('charger-speed-select')).toBeDisabled();
    });

    it('is not disabled by default (disabled prop omitted)', () => {
      render(
        <ChargerSpeedInput
          chargerKw={7.7}
          vehicleMaxKw={11.5}
          onChange={() => {}}
        />
      );

      expect(screen.getByTestId('charger-speed-select')).not.toBeDisabled();
    });

    it('is not disabled when disabled prop is explicitly false', () => {
      render(
        <ChargerSpeedInput
          chargerKw={7.7}
          vehicleMaxKw={11.5}
          onChange={() => {}}
          disabled={false}
        />
      );

      expect(screen.getByTestId('charger-speed-select')).not.toBeDisabled();
    });
  });
});
