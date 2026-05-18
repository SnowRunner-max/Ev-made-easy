import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import App from './App';

// Capture callbacks so tests can simulate location resolution
let capturedOnResolved;
let capturedOnCleared;

vi.mock('./components/LocationInput', () => ({
  default: ({ onLocationResolved, onLocationCleared }) => {
    capturedOnResolved = onLocationResolved;
    capturedOnCleared = onLocationCleared;
    return (
      <div>
        <input data-testid="location-input" readOnly />
        <div data-testid="location-status" role="status" aria-live="polite" />
      </div>
    );
  },
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-15T10:00:00-08:00'));
});
afterEach(() => vi.useRealTimers());

const DEFAULT_LOCATION = { serviceAreaId: 'pge-3ce-sbco', displayLabel: 'Buellton, CA', zip: '93427' };

function renderWithLocation(location = DEFAULT_LOCATION) {
  render(<App />);
  act(() => capturedOnResolved(location));
}

describe('App — structure', () => {
  it('renders header, main, and footer', () => {
    render(<App />);
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
    expect(screen.getByTestId('app-main')).toBeInTheDocument();
    expect(screen.getByTestId('app-footer')).toBeInTheDocument();
  });

  it('header includes app title', () => {
    render(<App />);
    expect(screen.getByTestId('app-header')).toHaveTextContent(/My EV Rate/i);
  });

  it('renders rate badge, timeline, calculator, charging tip', () => {
    renderWithLocation();
    expect(screen.getByTestId('rate-badge')).toBeInTheDocument();
    expect(screen.getByTestId('timeline')).toBeInTheDocument();
    expect(screen.getByTestId('calculator')).toBeInTheDocument();
    expect(screen.getByTestId('charging-tip')).toBeInTheDocument();
  });

  it('does not expose default pricing before a valid location is selected', () => {
    render(<App />);
    expect(screen.queryByText(/Total Estimated Cost/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('rate-badge')).not.toBeInTheDocument();
    expect(screen.getByTestId('app-footer')).toHaveTextContent('Enter a location to see rate details and sources.');
    expect(screen.queryByTestId('footer-toggle')).not.toBeInTheDocument();
  });
});

describe('App — location input', () => {
  it('renders location-input', () => {
    render(<App />);
    expect(screen.getByTestId('location-input')).toBeInTheDocument();
  });

  it('header shows placeholder when no location selected', () => {
    render(<App />);
    expect(screen.getByTestId('app-header')).toHaveTextContent('—');
    expect(screen.getByTestId('app-header')).not.toHaveTextContent('Buellton');
  });

  it('resolving a new location updates the header display label', () => {
    render(<App />);
    act(() => capturedOnResolved({ serviceAreaId: 'pge-scp-son', displayLabel: 'Santa Rosa, CA', zip: '95401' }));
    expect(screen.getByTestId('app-header')).toHaveTextContent('Santa Rosa, CA');
  });

  it('resolving a location in a different service area resets planId and provider', () => {
    renderWithLocation();
    fireEvent.change(screen.getByTestId('plan-select'), { target: { value: 'E-ELEC' } });
    // Resolve to San José (different service area)
    act(() => capturedOnResolved({ serviceAreaId: 'pge-sjce-scc', displayLabel: 'San José, CA', zip: '95110' }));
    expect(screen.getByTestId('plan-select').value).toBe('EV2-A');
  });

  it('resolving a location in the same service area preserves planId', () => {
    renderWithLocation();
    fireEvent.change(screen.getByTestId('plan-select'), { target: { value: 'E-ELEC' } });
    // Resolve to Solvang — same pge-3ce-sbco service area as Buellton
    act(() => capturedOnResolved({ serviceAreaId: 'pge-3ce-sbco', displayLabel: 'Solvang, CA', zip: '93463' }));
    expect(screen.getByTestId('plan-select').value).toBe('E-ELEC');
  });

  it('clearing location preserves last-known location in header', () => {
    render(<App />);
    act(() => capturedOnResolved({ serviceAreaId: 'pge-scp-son', displayLabel: 'Santa Rosa, CA', zip: '95401' }));
    expect(screen.getByTestId('app-header')).toHaveTextContent('Santa Rosa, CA');
    act(() => capturedOnCleared());
    // Still shows Santa Rosa — app stays functional on last resolved location
    expect(screen.getByTestId('app-header')).toHaveTextContent('Santa Rosa, CA');
  });
});

describe('App — plan selector', () => {
  it('defaults to EV2-A', () => {
    renderWithLocation();
    expect(screen.getByTestId('plan-select').value).toBe('EV2-A');
  });

  it('switching plan updates the UI', () => {
    renderWithLocation();
    fireEvent.change(screen.getByTestId('plan-select'), { target: { value: 'E-ELEC' } });
    expect(screen.getByTestId('plan-select').value).toBe('E-ELEC');
  });
});

describe('App — provider selector', () => {
  it('defaults to PG&E (pge)', () => {
    renderWithLocation();
    expect(screen.getByTestId('provider-select').value).toBe('pge');
  });

  it('switching to 3CE changes the displayed rate', () => {
    renderWithLocation();
    const before = screen.getByTestId('rate-value').textContent;
    fireEvent.change(screen.getByTestId('provider-select'), { target: { value: '3ce' } });
    expect(screen.getByTestId('rate-value').textContent).not.toBe(before);
  });

  it('provider persists when switching plans', () => {
    renderWithLocation();
    fireEvent.change(screen.getByTestId('provider-select'), { target: { value: '3ce' } });
    fireEvent.change(screen.getByTestId('plan-select'), { target: { value: 'E-ELEC' } });
    expect(screen.getByTestId('provider-select').value).toBe('3ce');
  });

  it('provider selector visible on E-TOU-C (all TOU plans support toggle)', () => {
    renderWithLocation();
    fireEvent.change(screen.getByTestId('plan-select'), { target: { value: 'E-TOU-C' } });
    expect(screen.getByTestId('provider-select')).toBeInTheDocument();
  });

  it('provider selector hidden for E-1 (tiered, no touPeriods)', () => {
    renderWithLocation();
    fireEvent.change(screen.getByTestId('plan-select'), { target: { value: 'E-1' } });
    expect(screen.queryByTestId('provider-select')).not.toBeInTheDocument();
  });
});

describe('App — CCA tier selector', () => {
  it('tier selector hidden when provider is pge', () => {
    renderWithLocation();
    expect(screen.queryByTestId('tier-select')).not.toBeInTheDocument();
  });

  it('tier selector appears when CCA provider selected', () => {
    renderWithLocation();
    fireEvent.change(screen.getByTestId('provider-select'), { target: { value: '3ce' } });
    expect(screen.getByTestId('tier-select')).toBeInTheDocument();
  });

  it('tier selector shows 3CE tiers (3cchoice, 3cprime)', () => {
    renderWithLocation();
    fireEvent.change(screen.getByTestId('provider-select'), { target: { value: '3ce' } });
    const tierSelect = screen.getByTestId('tier-select');
    const options = tierSelect.querySelectorAll('option');
    expect(options).toHaveLength(2);
    expect(options[0].value).toBe('3cchoice');
    expect(options[1].value).toBe('3cprime');
  });

  it('switching tier changes the displayed rate', () => {
    renderWithLocation();
    fireEvent.change(screen.getByTestId('provider-select'), { target: { value: '3ce' } });
    const before = screen.getByTestId('rate-value').textContent;
    fireEvent.change(screen.getByTestId('tier-select'), { target: { value: '3cprime' } });
    expect(screen.getByTestId('rate-value').textContent).not.toBe(before);
  });

  it('tier resets to default when switching to a different service area', () => {
    renderWithLocation();
    fireEvent.change(screen.getByTestId('provider-select'), { target: { value: '3ce' } });
    fireEvent.change(screen.getByTestId('tier-select'), { target: { value: '3cprime' } });
    // Switch location to San José (different service area) — resets provider + tier
    act(() => capturedOnResolved({ serviceAreaId: 'pge-sjce-scc', displayLabel: 'San José, CA', zip: '95110' }));
    // Provider should reset to pge, tier select should be hidden
    expect(screen.queryByTestId('tier-select')).not.toBeInTheDocument();
  });

  it('KCCP service area shows tier selector hidden (single tier)', () => {
    render(<App />);
    act(() => capturedOnResolved({ serviceAreaId: 'pge-kccp-mon', displayLabel: 'King City, CA', zip: '93930' }));
    // KCCP defaults to E-TOU-C plan — switch provider to kccp
    fireEvent.change(screen.getByTestId('provider-select'), { target: { value: 'kccp' } });
    // KCCP has only 1 tier → tier selector should not appear
    expect(screen.queryByTestId('tier-select')).not.toBeInTheDocument();
  });

  it('hides provider selector on EV2-A when KCCP is unavailable and only bundled remains', () => {
    render(<App />);
    act(() => capturedOnResolved({ serviceAreaId: 'pge-kccp-mon', displayLabel: 'King City, CA', zip: '93930' }));
    fireEvent.change(screen.getByTestId('plan-select'), { target: { value: 'EV2-A' } });
    expect(screen.queryByTestId('provider-select')).not.toBeInTheDocument();
  });
});

describe('App — SBCE service area (SCE + Santa Barbara Clean Energy)', () => {
  it('resolving to sce-sbce-sb shows SCE plans and SBCE provider option', () => {
    render(<App />);
    act(() => capturedOnResolved({ serviceAreaId: 'sce-sbce-sb', displayLabel: 'Santa Barbara, CA', zip: '93101' }));
    // Default plan should be TOU-D-4-9PM
    expect(screen.getByTestId('plan-select').value).toBe('TOU-D-4-9PM');
    // Provider should default to sbce
    expect(screen.getByTestId('provider-select').value).toBe('sbce');
    // Provider options: SCE Bundled + SBCE
    const opts = [...screen.getByTestId('provider-select').querySelectorAll('option')].map(o => o.value);
    expect(opts).toContain('sce');
    expect(opts).toContain('sbce');
  });

  it('SBCE provider shows tier selector with green-start and 100-green', () => {
    render(<App />);
    act(() => capturedOnResolved({ serviceAreaId: 'sce-sbce-sb', displayLabel: 'Santa Barbara, CA', zip: '93101' }));
    const tierSelect = screen.getByTestId('tier-select');
    const tiers = [...tierSelect.querySelectorAll('option')].map(o => o.value);
    expect(tiers).toContain('green-start');
    expect(tiers).toContain('100-green');
  });

  it('switching from SBCE area to PG&E area resets plan and provider', () => {
    render(<App />);
    act(() => capturedOnResolved({ serviceAreaId: 'sce-sbce-sb', displayLabel: 'Santa Barbara, CA', zip: '93101' }));
    expect(screen.getByTestId('plan-select').value).toBe('TOU-D-4-9PM');
    // Switch to Buellton (PG&E)
    act(() => capturedOnResolved({ serviceAreaId: 'pge-3ce-sbco', displayLabel: 'Buellton, CA', zip: '93427' }));
    expect(screen.getByTestId('plan-select').value).toBe('EV2-A');
    expect(screen.getByTestId('provider-select').value).toBe('pge');
  });

  it('SBCE tier switch changes displayed rate', () => {
    render(<App />);
    act(() => capturedOnResolved({ serviceAreaId: 'sce-sbce-sb', displayLabel: 'Santa Barbara, CA', zip: '93101' }));
    const before = screen.getByTestId('rate-value').textContent;
    fireEvent.change(screen.getByTestId('tier-select'), { target: { value: '100-green' } });
    expect(screen.getByTestId('rate-value').textContent).not.toBe(before);
  });

  it('uses SCE delivery labels instead of PG&E labels in SCE territory', () => {
    render(<App />);
    act(() => capturedOnResolved({ serviceAreaId: 'sce-sbce-sb', displayLabel: 'Santa Barbara, CA', zip: '93101' }));
    expect(screen.getByText('SCE Delivery')).toBeInTheDocument();
    expect(screen.queryByText('PG&E Delivery')).not.toBeInTheDocument();
  });
});

describe('App — Tahoe utilities', () => {
  it('resolving Olympic Valley selects Liberty Tahoe EV TOU rates and computes cost', () => {
    render(<App />);
    act(() => capturedOnResolved({ serviceAreaId: 'liberty-tahoe', displayLabel: 'Olympic Valley, CA', zip: '96146' }));

    expect(screen.getByTestId('plan-select').value).toBe('LIBERTY-D1-TOU-EV');
    expect(screen.queryByTestId('provider-select')).not.toBeInTheDocument();
    expect(screen.getByTestId('rate-value')).toHaveTextContent(/\$0\.\d{2}/);
    expect(screen.getByText(/Charging Cost Estimate/i).parentElement).toHaveTextContent(/\$\d+\.\d{2}/);
  });

  it('selecting TDPUD Truckee uses TDPUD TOU plans and computes cost', () => {
    render(<App />);
    act(() => capturedOnResolved({ serviceAreaId: 'tdpud-truckee', displayLabel: 'Truckee, CA', zip: '96161' }));

    expect(screen.getByTestId('plan-select').value).toBe('TDPUD-TOU-PRIMARY');
    expect(screen.queryByTestId('provider-select')).not.toBeInTheDocument();
    expect(screen.getByTestId('rate-value')).toHaveTextContent('$0.16');
    expect(screen.getByText(/Charging Cost Estimate/i).parentElement).toHaveTextContent(/\$\d+\.\d{2}/);
  });
});
