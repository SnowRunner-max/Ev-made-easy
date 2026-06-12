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
  it('renders header and main', () => {
    render(<App />);
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
    expect(screen.getByTestId('app-main')).toBeInTheDocument();
  });

  it('header includes app title', () => {
    render(<App />);
    expect(screen.getByTestId('app-header')).toHaveTextContent(/MyEVRate/i);
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
    expect(screen.getByRole('button', { name: 'PG&E Bundled' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switching to 3CE changes the displayed rate', () => {
    renderWithLocation();
    const before = screen.getByTestId('rate-value').textContent;
    fireEvent.click(screen.getByRole('button', { name: /Central Coast Community Energy/i }));
    expect(screen.getByTestId('rate-value').textContent).not.toBe(before);
  });

  it('provider persists when switching plans', () => {
    renderWithLocation();
    fireEvent.click(screen.getByRole('button', { name: /Central Coast Community Energy/i }));
    fireEvent.change(screen.getByTestId('plan-select'), { target: { value: 'E-ELEC' } });
    expect(screen.getByRole('button', { name: /Central Coast Community Energy/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('provider selector visible on E-TOU-C (all TOU plans support toggle)', () => {
    renderWithLocation();
    fireEvent.change(screen.getByTestId('plan-select'), { target: { value: 'E-TOU-C' } });
    expect(screen.getByTestId('provider-toggle')).toBeInTheDocument();
  });

  it('provider selector hidden for E-1 (tiered, no touPeriods)', () => {
    renderWithLocation();
    fireEvent.change(screen.getByTestId('plan-select'), { target: { value: 'E-1' } });
    expect(screen.queryByTestId('provider-toggle')).not.toBeInTheDocument();
  });
});

describe('App — CCA tier selector', () => {
  it('tier selector hidden when provider is pge', () => {
    renderWithLocation();
    expect(screen.queryByTestId('tier-select')).not.toBeInTheDocument();
  });

  it('tier selector appears when CCA provider selected', () => {
    renderWithLocation();
    fireEvent.click(screen.getByRole('button', { name: /Central Coast Community Energy/i }));
    expect(screen.getByTestId('tier-select')).toBeInTheDocument();
  });

  it('tier selector shows 3CE tiers (3cchoice, 3cprime)', () => {
    renderWithLocation();
    fireEvent.click(screen.getByRole('button', { name: /Central Coast Community Energy/i }));
    const tierSelect = screen.getByTestId('tier-select');
    const options = tierSelect.querySelectorAll('option');
    expect(options).toHaveLength(2);
    expect(options[0].value).toBe('3cchoice');
    expect(options[1].value).toBe('3cprime');
  });

  it('switching tier changes the displayed rate', () => {
    renderWithLocation();
    fireEvent.click(screen.getByRole('button', { name: /Central Coast Community Energy/i }));
    const before = screen.getByTestId('rate-value').textContent;
    fireEvent.change(screen.getByTestId('tier-select'), { target: { value: '3cprime' } });
    expect(screen.getByTestId('rate-value').textContent).not.toBe(before);
  });

  it('tier resets to default when switching to a different service area', () => {
    renderWithLocation();
    fireEvent.click(screen.getByRole('button', { name: /Central Coast Community Energy/i }));
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
    fireEvent.click(screen.getByRole('button', { name: /King City Community Power/i }));
    // KCCP has only 1 tier → tier selector should not appear
    expect(screen.queryByTestId('tier-select')).not.toBeInTheDocument();
  });

  it('hides provider selector on EV2-A when KCCP is unavailable and only bundled remains', () => {
    render(<App />);
    act(() => capturedOnResolved({ serviceAreaId: 'pge-kccp-mon', displayLabel: 'King City, CA', zip: '93930' }));
    fireEvent.change(screen.getByTestId('plan-select'), { target: { value: 'EV2-A' } });
    expect(screen.queryByTestId('provider-toggle')).not.toBeInTheDocument();
  });
});

describe('App — SBCE service area (SCE + Santa Barbara Clean Energy)', () => {
  it('resolving to sce-sbce-sb shows SCE plans and SBCE provider option', () => {
    render(<App />);
    act(() => capturedOnResolved({ serviceAreaId: 'sce-sbce-sb', displayLabel: 'Santa Barbara, CA', zip: '93101' }));
    // Default plan should be TOU-D-4-9PM
    expect(screen.getByTestId('plan-select').value).toBe('TOU-D-4-9PM');
    // Provider should default to SBCE
    expect(screen.getByRole('button', { name: /Santa Barbara Clean Energy/i })).toHaveAttribute('aria-pressed', 'true');
    // Provider options: SCE Bundled + SBCE
    expect(screen.getByRole('button', { name: 'SCE Bundled' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Santa Barbara Clean Energy/i })).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'PG&E Bundled' })).toHaveAttribute('aria-pressed', 'true');
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
    fireEvent.click(screen.getByText('See cost breakdown'));
    expect(screen.getByText('SCE Delivery')).toBeInTheDocument();
    expect(screen.queryByText('PG&E Delivery')).not.toBeInTheDocument();
  });
});

describe('App — Tahoe utilities', () => {
  it('resolving Olympic Valley selects Liberty Tahoe EV TOU rates and computes cost', () => {
    render(<App />);
    act(() => capturedOnResolved({ serviceAreaId: 'liberty-tahoe', displayLabel: 'Olympic Valley, CA', zip: '96146' }));

    expect(screen.getByTestId('plan-select').value).toBe('LIBERTY-D1-TOU-EV');
    expect(screen.queryByTestId('provider-toggle')).not.toBeInTheDocument();
    expect(screen.getByTestId('rate-value')).toHaveTextContent(/\$0\.\d{2}/);
    expect(screen.getByTestId('cost-estimate-section')).toHaveTextContent(/\$\d+\.\d{2}/);
  });

  it('selecting TDPUD Truckee uses TDPUD TOU plans and computes cost', () => {
    render(<App />);
    act(() => capturedOnResolved({ serviceAreaId: 'tdpud-truckee', displayLabel: 'Truckee, CA', zip: '96161' }));

    expect(screen.getByTestId('plan-select').value).toBe('TDPUD-TOU-PRIMARY');
    expect(screen.queryByTestId('provider-toggle')).not.toBeInTheDocument();
    expect(screen.getByTestId('rate-value')).toHaveTextContent('$0.16');
    expect(screen.getByTestId('cost-estimate-section')).toHaveTextContent(/\$\d+\.\d{2}/);
  });
});

describe('App — TOU boundary recompute', () => {
  it('updates the rate badge and cost estimate after crossing the 4 PM peak boundary (EV2-A summer)', () => {
    // Just before the 3pm-4pm part-peak window ends on a summer day
    vi.setSystemTime(new Date('2026-07-15T15:59:00-07:00'));
    render(<App />);
    act(() => capturedOnResolved(DEFAULT_LOCATION));

    expect(screen.getByTestId('rate-badge')).toHaveTextContent('Part-Peak');
    const beforeCost = screen.getByTestId('to80-cost-now').textContent;

    // Advance past the 4 PM boundary
    act(() => vi.advanceTimersByTime(2 * 60_000));

    expect(screen.getByTestId('rate-badge')).toHaveTextContent('Peak');
    const afterCost = screen.getByTestId('to80-cost-now').textContent;
    expect(afterCost).not.toBe(beforeCost);

    // A fresh render at the post-boundary time should match the live-updated value
    render(<App />);
    act(() => capturedOnResolved(DEFAULT_LOCATION));
    const freshCost = screen.getAllByTestId('to80-cost-now')[1].textContent;
    expect(afterCost).toBe(freshCost);
  });
});
