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

describe('App — structure', () => {
  it('renders header, main, and footer', () => {
    render(<App />);
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
    expect(screen.getByTestId('app-main')).toBeInTheDocument();
    expect(screen.getByTestId('app-footer')).toBeInTheDocument();
  });

  it('header includes app title', () => {
    render(<App />);
    expect(screen.getByTestId('app-header')).toHaveTextContent(/ChargeRate/i);
  });

  it('renders rate badge, timeline, calculator, charging tip', () => {
    render(<App />);
    expect(screen.getByTestId('rate-badge')).toBeInTheDocument();
    expect(screen.getByTestId('timeline')).toBeInTheDocument();
    expect(screen.getByTestId('calculator')).toBeInTheDocument();
    expect(screen.getByTestId('charging-tip')).toBeInTheDocument();
  });
});

describe('App — location input', () => {
  it('renders location-input', () => {
    render(<App />);
    expect(screen.getByTestId('location-input')).toBeInTheDocument();
  });

  it('header shows Buellton, CA by default', () => {
    render(<App />);
    expect(screen.getByTestId('app-header')).toHaveTextContent('Buellton, CA');
  });

  it('resolving a new location updates the header display label', () => {
    render(<App />);
    act(() => capturedOnResolved({ serviceAreaId: 'pge-scp-son', displayLabel: 'Santa Rosa, CA', zip: '95401' }));
    expect(screen.getByTestId('app-header')).toHaveTextContent('Santa Rosa, CA');
  });

  it('resolving a location in a different service area resets planId and provider', () => {
    render(<App />);
    fireEvent.change(screen.getByTestId('plan-select'), { target: { value: 'E-ELEC' } });
    // Resolve to San José (different service area)
    act(() => capturedOnResolved({ serviceAreaId: 'pge-sjce-scc', displayLabel: 'San José, CA', zip: '95110' }));
    expect(screen.getByTestId('plan-select').value).toBe('EV2-A');
  });

  it('resolving a location in the same service area preserves planId', () => {
    render(<App />);
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
    render(<App />);
    expect(screen.getByTestId('plan-select').value).toBe('EV2-A');
  });

  it('has six options', () => {
    render(<App />);
    expect(screen.getByTestId('plan-select').querySelectorAll('option')).toHaveLength(6);
  });

  it('switching plan updates the UI', () => {
    render(<App />);
    fireEvent.change(screen.getByTestId('plan-select'), { target: { value: 'E-ELEC' } });
    expect(screen.getByTestId('plan-select').value).toBe('E-ELEC');
  });
});

describe('App — provider selector', () => {
  it('defaults to PG&E (pge)', () => {
    render(<App />);
    expect(screen.getByTestId('provider-select').value).toBe('pge');
  });

  it('switching to 3CE changes the displayed rate', () => {
    render(<App />);
    const before = screen.getByTestId('rate-value').textContent;
    fireEvent.change(screen.getByTestId('provider-select'), { target: { value: '3ce' } });
    expect(screen.getByTestId('rate-value').textContent).not.toBe(before);
  });

  it('provider persists when switching plans', () => {
    render(<App />);
    fireEvent.change(screen.getByTestId('provider-select'), { target: { value: '3ce' } });
    fireEvent.change(screen.getByTestId('plan-select'), { target: { value: 'E-ELEC' } });
    expect(screen.getByTestId('provider-select').value).toBe('3ce');
  });

  it('provider selector visible on E-TOU-C (all TOU plans support toggle)', () => {
    render(<App />);
    fireEvent.change(screen.getByTestId('plan-select'), { target: { value: 'E-TOU-C' } });
    expect(screen.getByTestId('provider-select')).toBeInTheDocument();
  });

  it('provider selector hidden for E-1 (tiered, no touPeriods)', () => {
    render(<App />);
    fireEvent.change(screen.getByTestId('plan-select'), { target: { value: 'E-1' } });
    expect(screen.queryByTestId('provider-select')).not.toBeInTheDocument();
  });
});

describe('App — CCA tier selector', () => {
  it('tier selector hidden when provider is pge', () => {
    render(<App />);
    expect(screen.queryByTestId('tier-select')).not.toBeInTheDocument();
  });

  it('tier selector appears when CCA provider selected', () => {
    render(<App />);
    fireEvent.change(screen.getByTestId('provider-select'), { target: { value: '3ce' } });
    expect(screen.getByTestId('tier-select')).toBeInTheDocument();
  });

  it('tier selector shows 3CE tiers (3cchoice, 3cprime)', () => {
    render(<App />);
    fireEvent.change(screen.getByTestId('provider-select'), { target: { value: '3ce' } });
    const tierSelect = screen.getByTestId('tier-select');
    const options = tierSelect.querySelectorAll('option');
    expect(options).toHaveLength(2);
    expect(options[0].value).toBe('3cchoice');
    expect(options[1].value).toBe('3cprime');
  });

  it('switching tier changes the displayed rate', () => {
    render(<App />);
    fireEvent.change(screen.getByTestId('provider-select'), { target: { value: '3ce' } });
    const before = screen.getByTestId('rate-value').textContent;
    fireEvent.change(screen.getByTestId('tier-select'), { target: { value: '3cprime' } });
    expect(screen.getByTestId('rate-value').textContent).not.toBe(before);
  });

  it('tier resets to default when switching to a different service area', () => {
    render(<App />);
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

  it('KCCP provider option absent on EV2-A plan (no KCCP EV2-A rates)', () => {
    render(<App />);
    act(() => capturedOnResolved({ serviceAreaId: 'pge-kccp-mon', displayLabel: 'King City, CA', zip: '93930' }));
    fireEvent.change(screen.getByTestId('plan-select'), { target: { value: 'EV2-A' } });
    // Provider select should only have PG&E (no KCCP option for EV2-A)
    const opts = screen.getByTestId('provider-select').querySelectorAll('option');
    expect([...opts].map(o => o.value)).not.toContain('kccp');
  });
});
