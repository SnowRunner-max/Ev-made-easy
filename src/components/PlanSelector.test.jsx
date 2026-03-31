import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PlanSelector from './PlanSelector';

describe('PlanSelector', () => {
  it('renders plan-select', () => {
    render(<PlanSelector planId="EV2-A" onChange={() => {}} />);
    expect(screen.getByTestId('plan-select')).toBeInTheDocument();
  });

  it('has six plan options', () => {
    render(<PlanSelector planId="EV2-A" onChange={() => {}} />);
    expect(screen.getByTestId('plan-select').querySelectorAll('option')).toHaveLength(6);
  });

  it('shows the selected planId', () => {
    render(<PlanSelector planId="EV2-A" onChange={() => {}} />);
    expect(screen.getByTestId('plan-select').value).toBe('EV2-A');
  });

  it('calls onChange with the new value', () => {
    const onChange = vi.fn();
    render(<PlanSelector planId="EV2-A" onChange={onChange} />);
    fireEvent.change(screen.getByTestId('plan-select'), { target: { value: 'EV-B' } });
    expect(onChange).toHaveBeenCalledWith('EV-B');
  });

  it('includes EV2-A, E-ELEC, EV-B, E-TOU-C, E-TOU-D, E-1 options', () => {
    render(<PlanSelector planId="EV2-A" onChange={() => {}} />);
    for (const name of ['EV2-A', 'E-ELEC', 'EV-B', 'E-TOU-C', 'E-TOU-D', 'E-1']) {
      expect(screen.getByRole('option', { name: new RegExp(name) })).toBeInTheDocument();
    }
  });

  it('EV-B option mentions separate meter', () => {
    render(<PlanSelector planId="EV2-A" onChange={() => {}} />);
    expect(screen.getByRole('option', { name: /EV-B/i }).textContent).toMatch(/meter/i);
  });
});
