import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CostFacts from './CostFacts';

const planConfig = {
  name: 'Test TOU',
  touPeriods: { offPeak: {} },
  deliveryLabel: 'SDG&E Delivery',
  generationLabel: 'SDCP Generation',
  rates: {
    winter: {
      offPeak: {
        delivery: 0.12,
        generation: 0.08,
        combined: 0.20,
      },
    },
  },
};

const summary = {
  to80: {
    kwhNeeded: 50,
    costNow: 10,
  },
};

describe('CostFacts', () => {
  it('prompts for calculator inputs when summary is unavailable', () => {
    render(<CostFacts planConfig={planConfig} summary={null} currentRate={{ period: 'offPeak', season: 'winter' }} />);

    expect(screen.getByText('Select a vehicle and charge level to see cost breakdown.')).toBeInTheDocument();
  });

  it('renders session total and dynamic delivery/generation labels', () => {
    render(<CostFacts planConfig={planConfig} summary={summary} currentRate={{ period: 'offPeak', season: 'winter' }} />);

    expect(screen.getByText('for 50.0 kWh')).toBeInTheDocument();
    expect(screen.getByText('$10.00')).toBeInTheDocument();
    expect(screen.getByText('$0.2000')).toBeInTheDocument();
    expect(screen.getByText('SDG&E Delivery')).toBeInTheDocument();
    expect(screen.getByText('$6.00')).toBeInTheDocument();
    expect(screen.getAllByText('SDCP Generation')).toHaveLength(2);
    expect(screen.getByText('$4.00')).toBeInTheDocument();
  });

  it('renders nothing when the active period has no rate data', () => {
    const { container } = render(<CostFacts planConfig={planConfig} summary={summary} currentRate={{ period: 'peak', season: 'winter' }} />);

    expect(container.firstChild).toBeNull();
  });
});
