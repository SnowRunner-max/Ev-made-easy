import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import App from './App';

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
    expect(screen.getByTestId('app-header')).toHaveTextContent(/EV Charging Cost Calculator/i);
  });

  it('renders rate badge, timeline, calculator, charging tip', () => {
    render(<App />);
    expect(screen.getByTestId('rate-badge')).toBeInTheDocument();
    expect(screen.getByTestId('timeline')).toBeInTheDocument();
    expect(screen.getByTestId('calculator')).toBeInTheDocument();
    expect(screen.getByTestId('charging-tip')).toBeInTheDocument();
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
    const before = screen.getByTestId('rate-badge').textContent;
    fireEvent.change(screen.getByTestId('provider-select'), { target: { value: '3ce' } });
    expect(screen.getByTestId('rate-badge').textContent).not.toBe(before);
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
