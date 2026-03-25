import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Footer from './Footer';
import ratePlans from '../data/ratePlans.json';

const ev2aConfig = ratePlans.plans['ev2a'];

describe('Footer — collapsed state (default)', () => {
  it('renders with data-testid="app-footer"', () => {
    render(<Footer planConfig={ev2aConfig} />);
    expect(screen.getByTestId('app-footer')).toBeInTheDocument();
  });

  it('shows the rate plan name from metadata', () => {
    render(<Footer planConfig={ev2aConfig} />);
    expect(screen.getByTestId('app-footer')).toHaveTextContent(ev2aConfig._metadata.ratePlan);
  });

  it('shows an "About these rates" toggle button', () => {
    render(<Footer planConfig={ev2aConfig} />);
    expect(screen.getByTestId('footer-toggle')).toBeInTheDocument();
  });

  it('detail section is hidden by default', () => {
    render(<Footer planConfig={ev2aConfig} />);
    expect(screen.queryByTestId('footer-details')).not.toBeInTheDocument();
  });
});

describe('Footer — expanded state', () => {
  it('detail section appears after clicking toggle', () => {
    render(<Footer planConfig={ev2aConfig} />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    expect(screen.getByTestId('footer-details')).toBeInTheDocument();
  });

  it('detail section hides again on second click', () => {
    render(<Footer planConfig={ev2aConfig} />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    fireEvent.click(screen.getByTestId('footer-toggle'));
    expect(screen.queryByTestId('footer-details')).not.toBeInTheDocument();
  });

  it('shows winter off-peak combined rate from planConfig', () => {
    render(<Footer planConfig={ev2aConfig} />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    const expected = `$${ev2aConfig.rates.winter.offPeak.combined.toFixed(5)}`;
    expect(screen.getByTestId('footer-details')).toHaveTextContent(expected);
  });

  it('shows summer peak combined rate from planConfig', () => {
    render(<Footer planConfig={ev2aConfig} />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    const expected = `$${ev2aConfig.rates.summer.peak.combined.toFixed(5)}`;
    expect(screen.getByTestId('footer-details')).toHaveTextContent(expected);
  });

  it('shows the base services charge per day from planConfig', () => {
    render(<Footer planConfig={ev2aConfig} />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    const bsc = ev2aConfig.baseServicesCharge.ratePerDay.toFixed(2);
    expect(screen.getByTestId('footer-details')).toHaveTextContent(bsc);
  });

  it('shows the PG&E effective date from metadata', () => {
    render(<Footer planConfig={ev2aConfig} />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    expect(screen.getByTestId('footer-details')).toHaveTextContent(
      ev2aConfig._metadata.effectiveDates.pgeDelivery
    );
  });

  it('shows the 3CE effective date from metadata', () => {
    render(<Footer planConfig={ev2aConfig} />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    expect(screen.getByTestId('footer-details')).toHaveTextContent(
      ev2aConfig._metadata.effectiveDates.cceGeneration
    );
  });

  it('mentions NEM / solar customers', () => {
    render(<Footer planConfig={ev2aConfig} />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    expect(screen.getByTestId('footer-details')).toHaveTextContent(/NEM|solar/i);
  });

  it('lists at least one source from metadata', () => {
    render(<Footer planConfig={ev2aConfig} />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    const firstSource = ev2aConfig._metadata.sources[0];
    expect(screen.getByTestId('footer-details')).toHaveTextContent(firstSource);
  });
});

describe('Footer — custom planConfig prop', () => {
  it('uses the ratePlan from the planConfig prop', () => {
    const customConfig = {
      ...ev2aConfig,
      _metadata: { ...ev2aConfig._metadata, ratePlan: 'Custom Test Rate Plan' },
    };
    render(<Footer planConfig={customConfig} />);
    expect(screen.getByTestId('app-footer')).toHaveTextContent('Custom Test Rate Plan');
  });

  it('shows rates from planConfig when expanded', () => {
    const customConfig = {
      ...ev2aConfig,
      rates: {
        ...ev2aConfig.rates,
        winter: {
          ...ev2aConfig.rates.winter,
          offPeak: { ...ev2aConfig.rates.winter.offPeak, combined: 0.99999 },
        },
      },
    };
    render(<Footer planConfig={customConfig} />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    expect(screen.getByTestId('footer-details')).toHaveTextContent('$0.99999');
  });
});
