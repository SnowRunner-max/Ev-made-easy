import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PlanSelector from './PlanSelector';

describe('PlanSelector', () => {
  it('renders a select element with data-testid="plan-select"', () => {
    render(<PlanSelector planId="ev2a" onChange={() => {}} />);
    expect(screen.getByTestId('plan-select')).toBeInTheDocument();
  });

  it('renders nine plan options (5 TOU + 4 tiered)', () => {
    render(<PlanSelector planId="ev2a" onChange={() => {}} />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(9);
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

  it('includes E-TOU-C option', () => {
    render(<PlanSelector planId="ev2a" onChange={() => {}} />);
    expect(screen.getByRole('option', { name: /E-TOU-C/i })).toBeInTheDocument();
  });

  it('includes E-TOU-D option', () => {
    render(<PlanSelector planId="ev2a" onChange={() => {}} />);
    expect(screen.getByRole('option', { name: /E-TOU-D/i })).toBeInTheDocument();
  });

  it('includes E1 option', () => {
    render(<PlanSelector planId="ev2a" onChange={() => {}} />);
    expect(screen.getByRole('option', { name: /^E1/i })).toBeInTheDocument();
  });

  it('includes ES option', () => {
    render(<PlanSelector planId="ev2a" onChange={() => {}} />);
    expect(screen.getByRole('option', { name: /^ES/i })).toBeInTheDocument();
  });

  it('includes ET option', () => {
    render(<PlanSelector planId="ev2a" onChange={() => {}} />);
    expect(screen.getByRole('option', { name: /^ET/i })).toBeInTheDocument();
  });

  it('includes EM option', () => {
    render(<PlanSelector planId="ev2a" onChange={() => {}} />);
    expect(screen.getByRole('option', { name: /^EM/i })).toBeInTheDocument();
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
