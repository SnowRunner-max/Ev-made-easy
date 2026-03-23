import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Timeline from './Timeline';

describe('Timeline', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  describe('segments', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2026-01-15T10:00:00-08:00')); // winter, off-peak
    });

    it('renders exactly 4 segments', () => {
      render(<Timeline />);
      expect(screen.getByTestId('timeline')).toBeInTheDocument();
      // 4 segments: offPeak-0, partPeak-1, peak-2, partPeak-3
      expect(screen.getByTestId('segment-offPeak-0')).toBeInTheDocument();
      expect(screen.getByTestId('segment-partPeak-1')).toBeInTheDocument();
      expect(screen.getByTestId('segment-peak-2')).toBeInTheDocument();
      expect(screen.getByTestId('segment-partPeak-3')).toBeInTheDocument();
    });

    it('renders the "you are here" marker line', () => {
      render(<Timeline />);
      expect(screen.getByTestId('timeline-marker')).toBeInTheDocument();
    });

    it('renders the downward caret above the bar', () => {
      render(<Timeline />);
      expect(screen.getByTestId('timeline-marker-caret')).toBeInTheDocument();
    });

    it('caret and line share the same left position', () => {
      vi.setSystemTime(new Date('2026-01-15T12:00:00-08:00')); // noon = 50%
      render(<Timeline />);
      const caret = screen.getByTestId('timeline-marker-caret');
      const line  = screen.getByTestId('timeline-marker');
      expect(caret.style.left).toBe(line.style.left);
    });

    it('shows winter off-peak rate $0.22', () => {
      render(<Timeline />);
      const segment = screen.getByTestId('segment-offPeak-0');
      expect(segment).toHaveTextContent('$0.22');
    });

    it('shows winter peak rate $0.41', () => {
      render(<Timeline />);
      const segment = screen.getByTestId('segment-peak-2');
      expect(segment).toHaveTextContent('$0.41');
    });

    it('shows summer peak rate $0.53 when in summer', () => {
      vi.setSystemTime(new Date('2026-07-15T10:00:00-07:00'));
      render(<Timeline />);
      const segment = screen.getByTestId('segment-peak-2');
      expect(segment).toHaveTextContent('$0.53');
    });

    it('off-peak segment has correct width (62.5%)', () => {
      render(<Timeline />);
      expect(screen.getByTestId('segment-offPeak-0')).toHaveStyle('width: 62.5%');
    });

    it('afternoon part-peak segment has correct width (4.1666...%)', () => {
      render(<Timeline />);
      // 1 hour / 24 hours = 4.1666...%
      const seg = screen.getByTestId('segment-partPeak-1');
      const width = parseFloat(seg.style.width);
      expect(width).toBeCloseTo(4.167, 1);
    });

    it('peak segment has correct width (20.8333...%)', () => {
      render(<Timeline />);
      // 5 hours / 24 hours = 20.8333...%
      const seg = screen.getByTestId('segment-peak-2');
      const width = parseFloat(seg.style.width);
      expect(width).toBeCloseTo(20.833, 1);
    });

    it('evening part-peak segment has correct width (12.5%)', () => {
      render(<Timeline />);
      // 3 hours / 24 hours = 12.5%
      expect(screen.getByTestId('segment-partPeak-3')).toHaveStyle('width: 12.5%');
    });
  });

  describe('segment colors', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2026-01-15T10:00:00-08:00'));
    });

    it('off-peak segment has emerald color class', () => {
      render(<Timeline />);
      expect(screen.getByTestId('segment-offPeak-0').className).toMatch(/emerald/);
    });

    it('afternoon part-peak segment has amber color class', () => {
      render(<Timeline />);
      expect(screen.getByTestId('segment-partPeak-1').className).toMatch(/amber/);
    });

    it('peak segment has red color class', () => {
      render(<Timeline />);
      expect(screen.getByTestId('segment-peak-2').className).toMatch(/red/);
    });

    it('evening part-peak segment has amber color class', () => {
      render(<Timeline />);
      expect(screen.getByTestId('segment-partPeak-3').className).toMatch(/amber/);
    });
  });

  describe('"you are here" marker position', () => {
    it('marker is at 0% at midnight (12:00 AM)', () => {
      vi.setSystemTime(new Date('2026-01-15T00:00:00-08:00'));
      render(<Timeline />);
      expect(screen.getByTestId('timeline-marker')).toHaveStyle('left: 0%');
    });

    it('marker is at 50% at noon (12:00 PM)', () => {
      vi.setSystemTime(new Date('2026-01-15T12:00:00-08:00'));
      render(<Timeline />);
      expect(screen.getByTestId('timeline-marker')).toHaveStyle('left: 50%');
    });

    it('marker is at 75% at 6:00 PM', () => {
      vi.setSystemTime(new Date('2026-01-15T18:00:00-08:00'));
      render(<Timeline />);
      expect(screen.getByTestId('timeline-marker')).toHaveStyle('left: 75%');
    });
  });

  describe('time labels', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2026-01-15T10:00:00-08:00'));
    });

    it('shows "12 AM" at left boundary', () => {
      render(<Timeline />);
      const labels = screen.getAllByText('12 AM');
      expect(labels.length).toBeGreaterThanOrEqual(1);
    });

    it('shows "3 PM" label', () => {
      render(<Timeline />);
      expect(screen.getByText('3 PM')).toBeInTheDocument();
    });

    it('shows "9 PM" label', () => {
      render(<Timeline />);
      expect(screen.getByText('9 PM')).toBeInTheDocument();
    });
  });
});
