import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import App from './App';

// Pin to a known off-peak time so all child components render deterministically.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-15T10:00:00-08:00'));
});
afterEach(() => vi.useRealTimers());

describe('App — structure', () => {
  it('renders the app header', () => {
    render(<App />);
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
  });

  it('renders the main content area', () => {
    render(<App />);
    expect(screen.getByTestId('app-main')).toBeInTheDocument();
  });

  it('renders the app footer', () => {
    render(<App />);
    expect(screen.getByTestId('app-footer')).toBeInTheDocument();
  });

  it('header includes the app title', () => {
    render(<App />);
    expect(screen.getByTestId('app-header')).toHaveTextContent(/EV Charging Cost Calculator/i);
  });

  it('header includes Buellton location branding', () => {
    render(<App />);
    expect(screen.getByTestId('app-header')).toHaveTextContent(/Buellton/i);
  });

  it('footer mentions rate source (PG&E or 3CE)', () => {
    render(<App />);
    expect(screen.getByTestId('app-footer')).toHaveTextContent(/PG&E|3CE/i);
  });

  it('footer notes the base services charge is excluded', () => {
    render(<App />);
    expect(screen.getByTestId('app-footer')).toHaveTextContent(/base service|daily charge|\$0\.79/i);
  });
});

describe('App — component order', () => {
  it('renders RateDisplay before Timeline in the DOM', () => {
    render(<App />);
    const main = screen.getByTestId('app-main');
    const rate = screen.getByTestId('rate-badge');
    const timeline = screen.getByTestId('timeline');
    expect(main.compareDocumentPosition(rate) & Node.DOCUMENT_POSITION_CONTAINED_BY).toBeTruthy();
    expect(main.compareDocumentPosition(timeline) & Node.DOCUMENT_POSITION_CONTAINED_BY).toBeTruthy();
    expect(rate.compareDocumentPosition(timeline) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders Timeline before Calculator in the DOM', () => {
    render(<App />);
    const timeline = screen.getByTestId('timeline');
    const calculator = screen.getByTestId('calculator');
    expect(timeline.compareDocumentPosition(calculator) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders ChargingTip after Calculator in the DOM', () => {
    render(<App />);
    const calculator = screen.getByTestId('calculator');
    const tip = screen.getByTestId('charging-tip');
    expect(calculator.compareDocumentPosition(tip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('App — all components present', () => {
  it('renders the rate badge', () => {
    render(<App />);
    expect(screen.getByTestId('rate-badge')).toBeInTheDocument();
  });

  it('renders the countdown', () => {
    render(<App />);
    expect(screen.getByTestId('countdown')).toBeInTheDocument();
  });

  it('renders the timeline', () => {
    render(<App />);
    expect(screen.getByTestId('timeline')).toBeInTheDocument();
  });

  it('renders the calculator', () => {
    render(<App />);
    expect(screen.getByTestId('calculator')).toBeInTheDocument();
  });

  it('renders the charging tip', () => {
    render(<App />);
    expect(screen.getByTestId('charging-tip')).toBeInTheDocument();
  });
});
