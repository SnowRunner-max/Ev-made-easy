import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ratePlans from '../data/ratePlans.json';
import sceRatePlans from '../data/sceRatePlans.json';
import tdpudRatePlans from '../data/tdpudRatePlans.json';
import libertyRatePlans from '../data/libertyRatePlans.json';
import serviceAreasData from '../data/serviceAreas.json';
import Footer from './Footer';

function buildEffectiveConfig(planConfig) {
  if (!planConfig.touPeriods) {
    const r = planConfig.rates;
    return {
      ...planConfig,
      _displayProvider: 'Bundled Service',
      _flatRate: {
        combined: r.totalBundled.tier1,
        delivery: r.delivery.tier1,
        generation: r.generation.allUsage,
      },
    };
  }
  const seasons = Object.keys(planConfig.rates.delivery);
  const rates = Object.fromEntries(
    seasons.map(season => [
      season,
      Object.fromEntries(
        Object.keys(planConfig.rates.delivery[season]).map(period => {
          const delivery = planConfig.rates.delivery[season][period];
          const generation = planConfig.rates.generation[season][period];
          const combined = planConfig.rates.totalBundled[season][period];
          return [period, { combined, delivery, generation }];
        })
      ),
    ])
  );
  return { ...planConfig, rates, _displayProvider: 'PG&E Bundled Service' };
}

const ev2aConfig = buildEffectiveConfig(ratePlans.ratePlans['EV2-A']);
const sceTouDConfig = buildEffectiveConfig(sceRatePlans.ratePlans['TOU-D-4-9PM']);
const globalMetadata = ratePlans._metadata;
const city = serviceAreasData.cities[0]; // Buellton
const serviceArea = serviceAreasData.serviceAreas[city.serviceAreaId];
const sceServiceArea = serviceAreasData.serviceAreas['sce-only'];

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

  it('shows a flat TDPUD fixed rate without inventing a NaN Tier 2 row', () => {
    const tdpudFixed = buildEffectiveConfig(tdpudRatePlans.ratePlans['TDPUD-FIXED-SECONDARY']);
    const tdpudArea = serviceAreasData.serviceAreas['tdpud-truckee'];

    render(
      <Footer
        planConfig={tdpudFixed}
        globalMetadata={tdpudRatePlans._metadata}
        city={{ name: 'Truckee' }}
        serviceArea={tdpudArea}
        provider="tdpud"
      />
    );
    fireEvent.click(screen.getByTestId('footer-toggle'));

    const details = screen.getByTestId('footer-details');
    expect(details).toHaveTextContent('Flat energy rate');
    expect(details).toHaveTextContent('$0.22470');
    expect(details).not.toHaveTextContent('Tier 2');
    expect(details).not.toHaveTextContent('NaN');
  });

  it('never renders NaN rates for any bundled non-TOU service plan', () => {
    const bundledNonTouPlans = [
      [ratePlans.ratePlans['E-1'], ratePlans._metadata, serviceAreasData.serviceAreas['pge-only'], 'pge'],
      [sceRatePlans.ratePlans['D'], sceRatePlans._metadata, serviceAreasData.serviceAreas['sce-only'], 'sce'],
      [tdpudRatePlans.ratePlans['TDPUD-FIXED-PRIMARY'], tdpudRatePlans._metadata, serviceAreasData.serviceAreas['tdpud-truckee'], 'tdpud'],
      [tdpudRatePlans.ratePlans['TDPUD-FIXED-SECONDARY'], tdpudRatePlans._metadata, serviceAreasData.serviceAreas['tdpud-truckee'], 'tdpud'],
      [libertyRatePlans.ratePlans['LIBERTY-D1'], libertyRatePlans._metadata, serviceAreasData.serviceAreas['liberty-tahoe'], 'liberty'],
    ];

    for (const [plan, metadata, area, provider] of bundledNonTouPlans) {
      const { unmount } = render(
        <Footer
          planConfig={buildEffectiveConfig(plan)}
          globalMetadata={metadata}
          city={{ name: area.shortLabel }}
          serviceArea={area}
          provider={provider}
        />
      );
      fireEvent.click(screen.getByTestId('footer-toggle'));
      expect(screen.getByTestId('footer-details')).not.toHaveTextContent('NaN');
      unmount();
    }
  });

  it('shows SCE periods that only exist in one season', () => {
    render(
      <Footer
        planConfig={sceTouDConfig}
        globalMetadata={sceRatePlans._metadata}
        serviceArea={sceServiceArea}
        provider="sce"
      />
    );
    fireEvent.click(screen.getByTestId('footer-toggle'));
    expect(screen.getByTestId('footer-details')).toHaveTextContent('Mid-Peak');
    expect(screen.getByTestId('footer-details')).toHaveTextContent('Super Off-Peak');
    expect(screen.getByTestId('footer-details')).toHaveTextContent('N/A');
  });
});
