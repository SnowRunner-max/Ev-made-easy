import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ratePlans from '../data/ratePlans.json';
import serviceAreasData from '../data/serviceAreas.json';
import Footer from './Footer';

function buildEffectiveConfig(planConfig) {
  if (!planConfig.touPeriods) return planConfig;
  const seasons = Object.keys(planConfig.rates.pgeDelivery);
  const rates = Object.fromEntries(
    seasons.map(season => [
      season,
      Object.fromEntries(
        Object.keys(planConfig.rates.pgeDelivery[season]).map(period => {
          const delivery = planConfig.rates.pgeDelivery[season][period];
          const cce = planConfig.rates.cce[season][period];
          const combined = planConfig.rates.pgeTotalBundled[season][period];
          return [period, { combined, delivery, generation: cce }];
        })
      ),
    ])
  );
  return { ...planConfig, rates };
}

const ev2aConfig = buildEffectiveConfig(ratePlans.ratePlans['EV2-A']);
const globalMetadata = ratePlans._metadata;
const city = serviceAreasData.cities[0]; // Buellton
const serviceArea = serviceAreasData.serviceAreas[city.serviceAreaId];

describe('Footer — collapsed (default)', () => {
  it('renders app-footer', () => {
    render(<Footer planConfig={ev2aConfig} globalMetadata={globalMetadata} city={city} serviceArea={serviceArea} />);
    expect(screen.getByTestId('app-footer')).toBeInTheDocument();
  });

  it('shows the plan name', () => {
    render(<Footer planConfig={ev2aConfig} globalMetadata={globalMetadata} city={city} serviceArea={serviceArea} />);
    expect(screen.getByTestId('app-footer')).toHaveTextContent(ev2aConfig.name);
  });

  it('toggle button hides details by default', () => {
    render(<Footer planConfig={ev2aConfig} globalMetadata={globalMetadata} city={city} serviceArea={serviceArea} />);
    expect(screen.queryByTestId('footer-details')).not.toBeInTheDocument();
  });
});

describe('Footer — expanded', () => {
  it('details appear after clicking toggle', () => {
    render(<Footer planConfig={ev2aConfig} globalMetadata={globalMetadata} city={city} serviceArea={serviceArea} />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    expect(screen.getByTestId('footer-details')).toBeInTheDocument();
  });

  it('details hide on second click', () => {
    render(<Footer planConfig={ev2aConfig} globalMetadata={globalMetadata} city={city} serviceArea={serviceArea} />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    fireEvent.click(screen.getByTestId('footer-toggle'));
    expect(screen.queryByTestId('footer-details')).not.toBeInTheDocument();
  });

  it('shows the PG&E effective date', () => {
    render(<Footer planConfig={ev2aConfig} globalMetadata={globalMetadata} city={city} serviceArea={serviceArea} />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    expect(screen.getByTestId('footer-details')).toHaveTextContent(globalMetadata.pgeEffectiveDate);
  });

  it('shows the 3CE rate sheet date', () => {
    render(<Footer planConfig={ev2aConfig} globalMetadata={globalMetadata} city={city} serviceArea={serviceArea} />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    expect(screen.getByTestId('footer-details')).toHaveTextContent(globalMetadata.cceRateSheetDate);
  });

  it('shows the base service charge per day', () => {
    render(<Footer planConfig={ev2aConfig} globalMetadata={globalMetadata} city={city} serviceArea={serviceArea} />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    // EV2-A tier 3 BSC = $0.79343/day
    expect(screen.getByTestId('footer-details')).toHaveTextContent('0.79');
  });

  it('mentions NEM / solar', () => {
    render(<Footer planConfig={ev2aConfig} globalMetadata={globalMetadata} city={city} serviceArea={serviceArea} />);
    fireEvent.click(screen.getByTestId('footer-toggle'));
    expect(screen.getByTestId('footer-details')).toHaveTextContent(/NEM|solar/i);
  });
});
