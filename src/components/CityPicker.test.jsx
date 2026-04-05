import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CityPicker from './CityPicker';
import serviceAreas from '../data/serviceAreas.json';

const cities = serviceAreas.cities;

describe('CityPicker', () => {
  it('renders city-select', () => {
    render(<CityPicker cityId="buellton" cities={cities} onChange={() => {}} />);
    expect(screen.getByTestId('city-select')).toBeInTheDocument();
  });

  it('has four city options', () => {
    render(<CityPicker cityId="buellton" cities={cities} onChange={() => {}} />);
    expect(screen.getByTestId('city-select').querySelectorAll('option')).toHaveLength(4);
  });

  it('shows the selected city', () => {
    render(<CityPicker cityId="solvang" cities={cities} onChange={() => {}} />);
    expect(screen.getByTestId('city-select').value).toBe('solvang');
  });

  it('calls onChange with new city id', () => {
    const onChange = vi.fn();
    render(<CityPicker cityId="buellton" cities={cities} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('city-select'), { target: { value: 'los-olivos' } });
    expect(onChange).toHaveBeenCalledWith('los-olivos');
  });

  it('displays city names with state', () => {
    render(<CityPicker cityId="buellton" cities={cities} onChange={() => {}} />);
    expect(screen.getByRole('option', { name: /Buellton, CA/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Solvang, CA/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Santa Ynez, CA/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Los Olivos, CA/ })).toBeInTheDocument();
  });
});
