import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ChargingTip from './ChargingTip';

// All PST test dates use January 15, 2026 (-08:00) to avoid DST ambiguity.

describe('ChargingTip — rendering', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T10:00:00-08:00')); // off-peak
  });
  afterEach(() => vi.useRealTimers());

  it('renders the charging-tip container', () => {
    render(<ChargingTip />);
    expect(screen.getByTestId('charging-tip')).toBeInTheDocument();
  });

  it('renders a tip message', () => {
    render(<ChargingTip />);
    expect(screen.getByTestId('tip-message')).toBeInTheDocument();
  });
});

describe('ChargingTip — off-peak (10 AM)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T10:00:00-08:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('shows a positive message during off-peak', () => {
    render(<ChargingTip />);
    expect(screen.getByTestId('tip-message')).toHaveTextContent(/cheapest|best time|off.peak/i);
  });

  it('does not suggest waiting during off-peak', () => {
    render(<ChargingTip />);
    expect(screen.getByTestId('tip-message')).not.toHaveTextContent(/wait|consider/i);
  });

  it('shows the off-peak icon or indicator', () => {
    render(<ChargingTip />);
    expect(screen.getByTestId('charging-tip').className).toMatch(/emerald|green/);
  });
});

describe('ChargingTip — peak (5 PM)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T17:00:00-08:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('mentions that rates are expensive during peak', () => {
    render(<ChargingTip />);
    expect(screen.getByTestId('tip-message')).toHaveTextContent(/expensive|peak|most/i);
  });

  it('suggests waiting until 9 PM (part-peak)', () => {
    render(<ChargingTip />);
    expect(screen.getByTestId('tip-message')).toHaveTextContent(/9.?pm/i);
  });

  it('suggests waiting until midnight (off-peak)', () => {
    render(<ChargingTip />);
    expect(screen.getByTestId('tip-message')).toHaveTextContent(/midnight|12.?am/i);
  });

  it('shows a savings percentage or dollar amount', () => {
    render(<ChargingTip />);
    expect(screen.getByTestId('tip-message')).toHaveTextContent(/%|\$/);
  });

  it('shows the peak icon or indicator', () => {
    render(<ChargingTip />);
    expect(screen.getByTestId('charging-tip').className).toMatch(/red|orange/);
  });
});

describe('ChargingTip — part-peak afternoon (3 PM)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T15:00:00-08:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('warns that peak is approaching', () => {
    render(<ChargingTip />);
    expect(screen.getByTestId('tip-message')).toHaveTextContent(/peak|4.?pm/i);
  });

  it('suggests waiting until midnight for off-peak', () => {
    render(<ChargingTip />);
    expect(screen.getByTestId('tip-message')).toHaveTextContent(/midnight|12.?am/i);
  });

  it('shows a savings percentage or dollar amount', () => {
    render(<ChargingTip />);
    expect(screen.getByTestId('tip-message')).toHaveTextContent(/%|\$/);
  });

  it('shows the amber/part-peak indicator', () => {
    render(<ChargingTip />);
    expect(screen.getByTestId('charging-tip').className).toMatch(/amber|yellow/);
  });
});

describe('ChargingTip — part-peak evening (9 PM)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T21:00:00-08:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('mentions that midnight brings cheaper rates', () => {
    render(<ChargingTip />);
    expect(screen.getByTestId('tip-message')).toHaveTextContent(/midnight|12.?am/i);
  });

  it('shows savings for waiting until off-peak', () => {
    render(<ChargingTip />);
    expect(screen.getByTestId('tip-message')).toHaveTextContent(/%|\$/);
  });

  it('shows the amber/part-peak indicator', () => {
    render(<ChargingTip />);
    expect(screen.getByTestId('charging-tip').className).toMatch(/amber|yellow/);
  });
});

describe('ChargingTip — summer peak (5 PM July)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T17:00:00-07:00')); // PDT
  });
  afterEach(() => vi.useRealTimers());

  it('still shows peak tip in summer', () => {
    render(<ChargingTip />);
    expect(screen.getByTestId('tip-message')).toHaveTextContent(/expensive|peak|most/i);
  });

  it('shows the peak indicator in summer', () => {
    render(<ChargingTip />);
    expect(screen.getByTestId('charging-tip').className).toMatch(/red|orange/);
  });
});
