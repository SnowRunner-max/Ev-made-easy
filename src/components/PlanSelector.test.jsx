import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PlanSelector from './PlanSelector';

describe('PlanSelector', () => {
  it('renders a select element with data-testid="plan-select"', () => {
    render(<PlanSelector planId="ev2a" onChange={() => {}} />);
    expect(screen.getByTestId('plan-select')).toBeInTheDocument();
  });

  it('renders three plan options', () => {
    render(<PlanSelector planId="ev2a" onChange={() => {}} />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
  });

  it('includes EV2-A option', () => {
    render(<PlanSelector planId="ev2a" onChange={() => {}} />);
    expect(screen.getByRole('option', { name: /EV2-A/i })).toBeInTheDocument();
  });

  it('includes E-ELEC option', () => {
    render(<PlanSelector planId="ev2a" onChange={() => {}} />);
    expect(screen.getByRole('option', { name: /E-ELEC/i })).toBeInTheDocument();
  });

  it('includes EV-B option', () => {
    render(<PlanSelector planId="ev2a" onChange={() => {}} />);
    expect(screen.getByRole('option', { name: /EV-B/i })).toBeInTheDocument();
  });

  it('shows the currently selected planId', () => {
    render(<PlanSelector planId="ev2a" onChange={() => {}} />);
    expect(screen.getByTestId('plan-select').value).toBe('ev2a');
  });

  it('shows e-elec as selected when planId is "e-elec"', () => {
    render(<PlanSelector planId="e-elec" onChange={() => {}} />);
    expect(screen.getByTestId('plan-select').value).toBe('e-elec');
  });

  it('calls onChange with new value when selection changes', () => {
    const handleChange = vi.fn();
    render(<PlanSelector planId="ev2a" onChange={handleChange} />);
    fireEvent.change(screen.getByTestId('plan-select'), { target: { value: 'ev-b' } });
    expect(handleChange).toHaveBeenCalledWith('ev-b');
  });

  it('EV-B option text mentions separate meter', () => {
    render(<PlanSelector planId="ev2a" onChange={() => {}} />);
    const evbOption = screen.getByRole('option', { name: /EV-B/i });
    expect(evbOption.textContent).toMatch(/meter/i);
  });
});
