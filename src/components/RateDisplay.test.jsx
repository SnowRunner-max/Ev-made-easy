import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ratePlans from '../data/ratePlans.json';
import RateDisplay from './RateDisplay';

const ev2aConfig = ratePlans.plans['ev2a'];

describe('RateDisplay', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  describe('off-peak (Jan 15, 2:00 AM PST — winter)', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2026-01-15T02:00:00-08:00'));
    });

    it('displays the rate formatted as $X.XX', () => {
      render(<RateDisplay planConfig={ev2aConfig} />);
      expect(screen.getByTestId('rate-value')).toHaveTextContent('$0.22/kWh');
    });

    it('shows "Off-Peak" period label', () => {
      render(<RateDisplay planConfig={ev2aConfig} />);
      expect(screen.getByText('Off-Peak')).toBeInTheDocument();
    });

    it('shows "Winter Rates" season tag', () => {
      render(<RateDisplay planConfig={ev2aConfig} />);
      expect(screen.getByText('Winter Rates')).toBeInTheDocument();
    });

    it('badge has emerald color class', () => {
      render(<RateDisplay planConfig={ev2aConfig} />);
      expect(screen.getByTestId('rate-badge').className).toMatch(/emerald/);
    });
  });

  describe('part-peak (Jan 15, 3:30 PM PST — winter)', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2026-01-15T15:30:00-08:00'));
    });

    it('shows "Part-Peak" period label', () => {
      render(<RateDisplay planConfig={ev2aConfig} />);
      expect(screen.getByText('Part-Peak')).toBeInTheDocument();
    });

    it('badge has amber color class', () => {
      render(<RateDisplay planConfig={ev2aConfig} />);
      expect(screen.getByTestId('rate-badge').className).toMatch(/amber/);
    });
  });

  describe('peak (Jan 15, 6:00 PM PST — winter)', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2026-01-15T18:00:00-08:00'));
    });

    it('shows "Peak" period label', () => {
      render(<RateDisplay planConfig={ev2aConfig} />);
      expect(screen.getByText('Peak')).toBeInTheDocument();
    });

    it('badge has red color class', () => {
      render(<RateDisplay planConfig={ev2aConfig} />);
      expect(screen.getByTestId('rate-badge').className).toMatch(/red/);
    });

    it('displays the winter peak rate', () => {
      render(<RateDisplay planConfig={ev2aConfig} />);
      expect(screen.getByTestId('rate-value')).toHaveTextContent('$0.41/kWh');
    });
  });

  describe('summer peak (Jul 15, 6:00 PM PDT)', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2026-07-15T18:00:00-07:00'));
    });

    it('shows "Summer Rates" season tag', () => {
      render(<RateDisplay planConfig={ev2aConfig} />);
      expect(screen.getByText('Summer Rates')).toBeInTheDocument();
    });

    it('displays the summer peak rate', () => {
      render(<RateDisplay planConfig={ev2aConfig} />);
      expect(screen.getByTestId('rate-value')).toHaveTextContent('$0.53/kWh');
    });
  });

  describe('countdown timer', () => {
    it('shows time until next change at 2:45 PM (15m until part-peak)', () => {
      vi.setSystemTime(new Date('2026-01-15T14:45:00-08:00'));
      render(<RateDisplay planConfig={ev2aConfig} />);
      expect(screen.getByTestId('countdown')).toHaveTextContent('15m');
    });

    it('shows correct label and direction at 2:45 PM (off-peak → part-peak)', () => {
      vi.setSystemTime(new Date('2026-01-15T14:45:00-08:00'));
      render(<RateDisplay planConfig={ev2aConfig} />);
      const countdown = screen.getByTestId('countdown');
      expect(countdown).toHaveTextContent('Part-peak starts in');
      expect(countdown).toHaveTextContent('rises to');
    });

    it('shows time until next change at 3:30 PM (30m until peak)', () => {
      vi.setSystemTime(new Date('2026-01-15T15:30:00-08:00'));
      render(<RateDisplay planConfig={ev2aConfig} />);
      expect(screen.getByTestId('countdown')).toHaveTextContent('30m');
    });

    it('shows correct label and direction at 3:30 PM (part-peak → peak)', () => {
      vi.setSystemTime(new Date('2026-01-15T15:30:00-08:00'));
      render(<RateDisplay planConfig={ev2aConfig} />);
      const countdown = screen.getByTestId('countdown');
      expect(countdown).toHaveTextContent('Peak starts in');
      expect(countdown).toHaveTextContent('rises to');
    });

    it('shows time until next change at 8:30 PM (30m until part-peak)', () => {
      vi.setSystemTime(new Date('2026-01-15T20:30:00-08:00'));
      render(<RateDisplay planConfig={ev2aConfig} />);
      expect(screen.getByTestId('countdown')).toHaveTextContent('30m');
    });

    it('shows correct label and direction at 8:30 PM (peak → part-peak)', () => {
      vi.setSystemTime(new Date('2026-01-15T20:30:00-08:00'));
      render(<RateDisplay planConfig={ev2aConfig} />);
      const countdown = screen.getByTestId('countdown');
      expect(countdown).toHaveTextContent('Part-peak starts in');
      expect(countdown).toHaveTextContent('drops to');
    });

    it('shows time until next change at 11:00 PM (1h 0m until off-peak)', () => {
      vi.setSystemTime(new Date('2026-01-15T23:00:00-08:00'));
      render(<RateDisplay planConfig={ev2aConfig} />);
      expect(screen.getByTestId('countdown')).toHaveTextContent('1h 0m');
    });

    it('shows correct label and direction at 11:00 PM (part-peak → off-peak)', () => {
      vi.setSystemTime(new Date('2026-01-15T23:00:00-08:00'));
      render(<RateDisplay planConfig={ev2aConfig} />);
      const countdown = screen.getByTestId('countdown');
      expect(countdown).toHaveTextContent('Off-peak starts in');
      expect(countdown).toHaveTextContent('drops to');
    });

    it('shows next rate amount in the countdown', () => {
      vi.setSystemTime(new Date('2026-01-15T14:45:00-08:00')); // → part-peak
      render(<RateDisplay planConfig={ev2aConfig} />);
      expect(screen.getByTestId('countdown')).toHaveTextContent('$0.39/kWh');
    });
  });
});
