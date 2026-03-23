import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Footer from './Footer';
import ratesData from '../data/rates.json';

describe('Footer — collapsed state (default)', () => {
  it('renders with data-testid="app-footer"', () => {
    render(<Footer />);
    expect(screen.getByTestId('app-footer')).toBeInTheDocument();
  });

  it('shows the rate plan name from metadata', () => {
    render(<Footer />);
    expect(screen.getByTestId('app-footer')).toHaveTextContent(ratesData._metadata.ratePlan);
  });

  it('shows an "About these rates" toggle button', () => {
    render(<Footer />);
    expect(screen.getByTestId('footer-toggle')).toBeInTheDocument();
  });

  it('detail section is hidden by default', () => {
    render(<Footer />);
    expect(screen.queryByTestId('footer-details')).not.toBeInTheDocument();
  });
});

describe('Footer — expanded state', () => {
  it('detail section appears after clicking toggle', () => {
    render(<Footer />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    expect(screen.getByTestId('footer-details')).toBeInTheDocument();
  });

  it('detail section hides again on second click', () => {
    render(<Footer />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    fireEvent.click(screen.getByTestId('footer-toggle'));
    expect(screen.queryByTestId('footer-details')).not.toBeInTheDocument();
  });

  it('shows winter off-peak combined rate from JSON', () => {
    render(<Footer />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    const expected = `$${ratesData.rates.winter.offPeak.combined.toFixed(5)}`;
    expect(screen.getByTestId('footer-details')).toHaveTextContent(expected);
  });

  it('shows summer peak combined rate from JSON', () => {
    render(<Footer />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    const expected = `$${ratesData.rates.summer.peak.combined.toFixed(5)}`;
    expect(screen.getByTestId('footer-details')).toHaveTextContent(expected);
  });

  it('shows the base services charge per day from JSON', () => {
    render(<Footer />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    const bsc = ratesData.baseServicesCharge.ratePerDay.toFixed(2);
    expect(screen.getByTestId('footer-details')).toHaveTextContent(bsc);
  });

  it('shows the PG&E effective date from metadata', () => {
    render(<Footer />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    expect(screen.getByTestId('footer-details')).toHaveTextContent(
      ratesData._metadata.effectiveDates.pgeDelivery
    );
  });

  it('shows the 3CE effective date from metadata', () => {
    render(<Footer />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    expect(screen.getByTestId('footer-details')).toHaveTextContent(
      ratesData._metadata.effectiveDates.cceGeneration
    );
  });

  it('mentions NEM / solar customers', () => {
    render(<Footer />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    expect(screen.getByTestId('footer-details')).toHaveTextContent(/NEM|solar/i);
  });

  it('lists at least one source from metadata', () => {
    render(<Footer />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    const firstSource = ratesData._metadata.sources[0];
    expect(screen.getByTestId('footer-details')).toHaveTextContent(firstSource);
  });

  it('shows lastUpdated date from metadata', () => {
    render(<Footer />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    expect(screen.getByTestId('footer-details')).toHaveTextContent(
      ratesData._metadata.lastUpdated
    );
  });
});

describe('Footer — custom ratesData prop', () => {
  it('uses the ratePlan from the prop instead of the default import', () => {
    const customRates = {
      ...ratesData,
      _metadata: { ...ratesData._metadata, ratePlan: 'Custom Test Rate Plan' },
    };
    render(<Footer ratesData={customRates} />);
    expect(screen.getByTestId('app-footer')).toHaveTextContent('Custom Test Rate Plan');
  });

  it('shows rates from the prop when expanded', () => {
    const customRates = {
      ...ratesData,
      rates: {
        ...ratesData.rates,
        winter: {
          ...ratesData.rates.winter,
          offPeak: { ...ratesData.rates.winter.offPeak, combined: 0.99999 },
        },
      },
    };
    render(<Footer ratesData={customRates} />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    expect(screen.getByTestId('footer-details')).toHaveTextContent('$0.99999');
  });
});
