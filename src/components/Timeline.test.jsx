import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ratePlans from '../data/ratePlans.json';
import Timeline from './Timeline';

const ev2aConfig = ratePlans.plans['ev2a'];
const evbConfig  = ratePlans.plans['ev-b'];

describe('Timeline — EV2-A (default)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  describe('segments', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2026-01-15T10:00:00-08:00')); // winter, off-peak
    });

    it('renders exactly 4 segments', () => {
      render(<Timeline planConfig={ev2aConfig} />);
      expect(screen.getByTestId('timeline')).toBeInTheDocument();
      // 4 segments: offPeak-0, partPeak-1, peak-2, partPeak-3
      expect(screen.getByTestId('segment-offPeak-0')).toBeInTheDocument();
      expect(screen.getByTestId('segment-partPeak-1')).toBeInTheDocument();
      expect(screen.getByTestId('segment-peak-2')).toBeInTheDocument();
      expect(screen.getByTestId('segment-partPeak-3')).toBeInTheDocument();
    });

    it('renders the "you are here" marker line', () => {
      render(<Timeline planConfig={ev2aConfig} />);
      expect(screen.getByTestId('timeline-marker')).toBeInTheDocument();
    });

    it('renders the downward caret above the bar', () => {
      render(<Timeline planConfig={ev2aConfig} />);
      expect(screen.getByTestId('timeline-marker-caret')).toBeInTheDocument();
    });

    it('caret and line share the same left position', () => {
      vi.setSystemTime(new Date('2026-01-15T12:00:00-08:00')); // noon = 50%
      render(<Timeline planConfig={ev2aConfig} />);
      const caret = screen.getByTestId('timeline-marker-caret');
      const line  = screen.getByTestId('timeline-marker');
      expect(caret.style.left).toBe(line.style.left);
    });

    it('shows winter off-peak rate $0.22', () => {
      render(<Timeline planConfig={ev2aConfig} />);
      const segment = screen.getByTestId('segment-offPeak-0');
      expect(segment).toHaveTextContent('$0.22');
    });

    it('shows winter peak rate $0.41', () => {
      render(<Timeline planConfig={ev2aConfig} />);
      const segment = screen.getByTestId('segment-peak-2');
      expect(segment).toHaveTextContent('$0.41');
    });

    it('shows summer peak rate $0.53 when in summer', () => {
      vi.setSystemTime(new Date('2026-07-15T10:00:00-07:00'));
      render(<Timeline planConfig={ev2aConfig} />);
      const segment = screen.getByTestId('segment-peak-2');
      expect(segment).toHaveTextContent('$0.53');
    });

    it('off-peak segment has correct width (62.5%)', () => {
      render(<Timeline planConfig={ev2aConfig} />);
      expect(screen.getByTestId('segment-offPeak-0')).toHaveStyle('width: 62.5%');
    });

    it('afternoon part-peak segment has correct width (4.1666...%)', () => {
      render(<Timeline planConfig={ev2aConfig} />);
      // 1 hour / 24 hours = 4.1666...%
      const seg = screen.getByTestId('segment-partPeak-1');
      const width = parseFloat(seg.style.width);
      expect(width).toBeCloseTo(4.167, 1);
    });

    it('peak segment has correct width (20.8333...%)', () => {
      render(<Timeline planConfig={ev2aConfig} />);
      // 5 hours / 24 hours = 20.8333...%
      const seg = screen.getByTestId('segment-peak-2');
      const width = parseFloat(seg.style.width);
      expect(width).toBeCloseTo(20.833, 1);
    });

    it('evening part-peak segment has correct width (12.5%)', () => {
      render(<Timeline planConfig={ev2aConfig} />);
      // 3 hours / 24 hours = 12.5%
      expect(screen.getByTestId('segment-partPeak-3')).toHaveStyle('width: 12.5%');
    });
  });

  describe('segment colors', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2026-01-15T10:00:00-08:00'));
    });

    it('off-peak segment has emerald color class', () => {
      render(<Timeline planConfig={ev2aConfig} />);
      expect(screen.getByTestId('segment-offPeak-0').className).toMatch(/emerald/);
    });

    it('afternoon part-peak segment has amber color class', () => {
      render(<Timeline planConfig={ev2aConfig} />);
      expect(screen.getByTestId('segment-partPeak-1').className).toMatch(/amber/);
    });

    it('peak segment has red color class', () => {
      render(<Timeline planConfig={ev2aConfig} />);
      expect(screen.getByTestId('segment-peak-2').className).toMatch(/red/);
    });

    it('evening part-peak segment has amber color class', () => {
      render(<Timeline planConfig={ev2aConfig} />);
      expect(screen.getByTestId('segment-partPeak-3').className).toMatch(/amber/);
    });
  });

  describe('"you are here" marker position', () => {
    it('marker is at 0% at midnight (12:00 AM)', () => {
      vi.setSystemTime(new Date('2026-01-15T00:00:00-08:00'));
      render(<Timeline planConfig={ev2aConfig} />);
      expect(screen.getByTestId('timeline-marker')).toHaveStyle('left: 0%');
    });

    it('marker is at 50% at noon (12:00 PM)', () => {
      vi.setSystemTime(new Date('2026-01-15T12:00:00-08:00'));
      render(<Timeline planConfig={ev2aConfig} />);
      expect(screen.getByTestId('timeline-marker')).toHaveStyle('left: 50%');
    });

    it('marker is at 75% at 6:00 PM', () => {
      vi.setSystemTime(new Date('2026-01-15T18:00:00-08:00'));
      render(<Timeline planConfig={ev2aConfig} />);
      expect(screen.getByTestId('timeline-marker')).toHaveStyle('left: 75%');
    });
  });

  describe('time labels', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2026-01-15T10:00:00-08:00'));
    });

    it('shows "12 AM" at left boundary', () => {
      render(<Timeline planConfig={ev2aConfig} />);
      const labels = screen.getAllByText('12 AM');
      expect(labels.length).toBeGreaterThanOrEqual(1);
    });

    it('shows "3 PM" label', () => {
      render(<Timeline planConfig={ev2aConfig} />);
      expect(screen.getByText('3 PM')).toBeInTheDocument();
    });

    it('shows "9 PM" label', () => {
      render(<Timeline planConfig={ev2aConfig} />);
      expect(screen.getByText('9 PM')).toBeInTheDocument();
    });
  });
});

// EV-B weekday: January 6, 2026 is a Tuesday
describe('Timeline — EV-B weekday (5 segments)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-06T10:00:00-08:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('renders exactly 5 segments', () => {
    render(<Timeline planConfig={evbConfig} />);
    expect(screen.getAllByTestId(/^segment-/).length).toBe(5);
  });

  it('has offPeak-0, partPeak-1, peak-2, partPeak-3, offPeak-4', () => {
    render(<Timeline planConfig={evbConfig} />);
    expect(screen.getByTestId('segment-offPeak-0')).toBeInTheDocument();
    expect(screen.getByTestId('segment-partPeak-1')).toBeInTheDocument();
    expect(screen.getByTestId('segment-peak-2')).toBeInTheDocument();
    expect(screen.getByTestId('segment-partPeak-3')).toBeInTheDocument();
    expect(screen.getByTestId('segment-offPeak-4')).toBeInTheDocument();
  });

  it('peak starts at 2 PM (14/24 = 58.33% position implies peak width = 7h/24 = 29.17%)', () => {
    render(<Timeline planConfig={evbConfig} />);
    const seg = screen.getByTestId('segment-peak-2');
    const width = parseFloat(seg.style.width);
    expect(width).toBeCloseTo((7 / 24) * 100, 1); // 7h peak window
  });

  it('shows "7 AM" label (EV-B weekday part-peak starts at 7)', () => {
    render(<Timeline planConfig={evbConfig} />);
    expect(screen.getByText('7 AM')).toBeInTheDocument();
  });

  it('shows "2 PM" label (EV-B weekday peak starts at 14)', () => {
    render(<Timeline planConfig={evbConfig} />);
    expect(screen.getByText('2 PM')).toBeInTheDocument();
  });
});

// EV-B weekend: January 10, 2026 is a Saturday
describe('Timeline — EV-B weekend (3 segments)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-10T10:00:00-08:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('renders exactly 3 segments', () => {
    render(<Timeline planConfig={evbConfig} />);
    expect(screen.getAllByTestId(/^segment-/).length).toBe(3);
  });

  it('has offPeak-0, peak-1, offPeak-2', () => {
    render(<Timeline planConfig={evbConfig} />);
    expect(screen.getByTestId('segment-offPeak-0')).toBeInTheDocument();
    expect(screen.getByTestId('segment-peak-1')).toBeInTheDocument();
    expect(screen.getByTestId('segment-offPeak-2')).toBeInTheDocument();
  });

  it('shows "3 PM" label (EV-B weekend peak starts at 15)', () => {
    render(<Timeline planConfig={evbConfig} />);
    expect(screen.getByText('3 PM')).toBeInTheDocument();
  });
});
