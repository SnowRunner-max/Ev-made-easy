import { render, screen, fireEvent, act } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-02T10:00:00-08:00'));
  window.location.hash = '#setup';
});
afterEach(() => vi.useRealTimers());
async function enterZip(zip) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Location — city or zip code' }), {
    target: { value: zip },
  });
  await act(async () => vi.advanceTimersByTime(450));
}
describe('redesign with real ZIP lookup and tariff engine', () => {
  it('resolves 93427, prices 3CE, preserves inputs between tabs, then replaces provider choices for 94103', async () => {
    render(<App />);
    await enterZip('93427');
    expect(screen.getByTestId('app-header')).toHaveTextContent('Buellton, CA');
    fireEvent.click(screen.getByRole('button', { name: /Central Coast Community Energy/i }));
    fireEvent.change(screen.getByLabelText('PCIA vintage'), { target: { value: '2021' } });
    fireEvent.change(screen.getByLabelText('Charging efficiency percent'), {
      target: { value: '90' },
    });
    fireEvent.click(screen.getByRole('link', { name: 'Charging', exact: true }));
    expect(screen.getByTestId('session-cost')).toHaveTextContent('11.13');
    expect(screen.getByTestId('rate-value')).toHaveTextContent('27.81¢');
    expect(screen.getByText('Your setup')).not.toBeVisible();
    fireEvent.change(screen.getByLabelText('Charging window start'), {
      target: { value: '21:00' },
    });
    fireEvent.change(screen.getByLabelText('Charging window end'), { target: { value: '06:00' } });
    expect(screen.getByLabelText('Charging window end on chart')).toHaveAttribute(
      'aria-valuetext',
      '6 AM next day',
    );
    fireEvent.click(screen.getByRole('link', { name: 'Setup', exact: true }));
    expect(screen.getByRole('textbox', { name: 'Location — city or zip code' })).toHaveValue(
      '93427',
    );
    await enterZip('94103');
    expect(screen.getByTestId('app-header')).toHaveTextContent('San Francisco, CA');
    expect(
      screen.queryByRole('button', { name: /Central Coast Community Energy/i }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /CleanPowerSF/i }));
    fireEvent.click(screen.getByRole('link', { name: 'Charging', exact: true }));
    expect(screen.getByLabelText('Charging window start')).toHaveValue('21:00');
    // At 7.7 kW, the first 23.1 kWh use the evening rate; the remaining 16.9 use the morning rate.
    expect(screen.getByTestId('session-cost').textContent).toBe(
      (23.1 * (0.27534 + 0.12015) + 16.9 * (0.13012 + 0.09818)).toFixed(2),
    );
    fireEvent.change(screen.getByLabelText('Charging window start'), {
      target: { value: '00:00' },
    });
    expect(screen.getByTestId('session-cost').textContent).toBe('9.13');
    expect(screen.getByTestId('rate-value')).toHaveTextContent('22.83¢');
    expect(screen.getByRole('img', { name: /Prices for/ })).toHaveAccessibleName(
      /cents per kilowatt-hour/,
    );
  });
  it('supports chart keyboard controls, target changes, short windows and invalid ZIP input', async () => {
    render(<App />);
    await enterZip('94103');
    fireEvent.click(screen.getByRole('button', { name: 'PG&E Bundled' }));
    fireEvent.click(screen.getByRole('link', { name: 'Charging', exact: true }));
    fireEvent.keyDown(screen.getByLabelText('Charging window end on chart'), { key: 'ArrowRight' });
    expect(screen.getByLabelText('Charging window end')).toHaveValue('06:15');
    fireEvent.change(screen.getByLabelText('Charging window end'), { target: { value: '01:00' } });
    expect(screen.getByText(/Reaches .*window too short/)).toBeVisible();
    const short = screen.getByTestId('session-cost').textContent;
    fireEvent.click(screen.getByRole('button', { name: '100%', exact: true }));
    expect(screen.getByTestId('session-cost')).toHaveTextContent(short);
    fireEvent.change(screen.getByLabelText('Charging window end'), { target: { value: '12:00' } });
    expect(Number(screen.getByTestId('session-cost').textContent)).toBeGreaterThan(Number(short));
    fireEvent.click(screen.getByRole('link', { name: 'Setup', exact: true }));
    await enterZip('00000');
    expect(screen.getByRole('textbox', { name: 'Location — city or zip code' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByTestId('app-header')).toHaveTextContent('San Francisco, CA');
  });
});


it('keeps both midnight chart endpoints reachable by keyboard', async () => {
  render(<App />);
  await enterZip('94103');
  fireEvent.click(screen.getByRole('link', { name: 'Charging', exact: true }));
  const handle = screen.getByLabelText('Charging window end on chart');
  fireEvent.keyDown(handle, { key: 'Home' });
  expect(handle).toHaveAttribute('aria-valuenow', '0');
  expect(handle).toHaveStyle({ left: '0%' });
  expect(screen.getByLabelText('Charging window end')).toHaveValue('00:00');
  fireEvent.keyDown(handle, { key: 'ArrowRight' });
  expect(screen.getByLabelText('Charging window end')).toHaveValue('00:15');
  fireEvent.keyDown(handle, { key: 'End' });
  expect(handle).toHaveAttribute('aria-valuenow', '24');
  expect(handle).toHaveStyle({ left: '100%' });
  fireEvent.keyDown(handle, { key: 'ArrowLeft' });
  expect(screen.getByLabelText('Charging window end')).toHaveValue('23:45');
});


it('preserves left-edge midnight while dragging the end handle', async () => {
  render(<App />);
  await enterZip('94103');
  fireEvent.click(screen.getByRole('link', { name: 'Charging', exact: true }));
  const handle = screen.getByLabelText('Charging window end on chart');
  const plot = handle.parentElement;
  vi.spyOn(plot, 'getBoundingClientRect').mockReturnValue({ width: 240 });
  handle.setPointerCapture = vi.fn();
  function pointer(type, clientX) {
    const event = new Event(type, { bubbles: true });
    Object.defineProperties(event, {
      clientX: { value: clientX }, button: { value: 0 }, pointerId: { value: 1 },
    });
    fireEvent(handle, event);
  }
  pointer('pointerdown', 60);
  pointer('pointermove', 0);
  expect(handle).toHaveAttribute('aria-valuenow', '0');
  expect(handle).toHaveStyle({ left: '0%' });
  pointer('pointermove', 2.5);
  expect(screen.getByLabelText('Charging window end')).toHaveValue('00:15');
  pointer('pointerup', 2.5);
  expect(handle.setPointerCapture).toHaveBeenCalledWith(1);
});
