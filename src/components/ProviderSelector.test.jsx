import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProviderSelector from './ProviderSelector';

describe('ProviderSelector', () => {
  it('renders a select element with data-testid="provider-select"', () => {
    render(<ProviderSelector provider="pge" onChange={() => {}} />);
    expect(screen.getByTestId('provider-select')).toBeInTheDocument();
  });

  it('renders two provider options', () => {
    render(<ProviderSelector provider="pge" onChange={() => {}} />);
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('includes a PG&E Bundled option', () => {
    render(<ProviderSelector provider="pge" onChange={() => {}} />);
    expect(screen.getByRole('option', { name: /PG&E.*Bundled/i })).toBeInTheDocument();
  });

  it('includes a Central Coast Community Energy (3CE) option', () => {
    render(<ProviderSelector provider="pge" onChange={() => {}} />);
    expect(screen.getByRole('option', { name: /Central Coast Community Energy/i })).toBeInTheDocument();
  });

  it('shows pge as selected when provider is "pge"', () => {
    render(<ProviderSelector provider="pge" onChange={() => {}} />);
    expect(screen.getByTestId('provider-select').value).toBe('pge');
  });

  it('shows 3ce as selected when provider is "3ce"', () => {
    render(<ProviderSelector provider="3ce" onChange={() => {}} />);
    expect(screen.getByTestId('provider-select').value).toBe('3ce');
  });

  it('calls onChange with "3ce" when 3CE option is selected', () => {
    const handleChange = vi.fn();
    render(<ProviderSelector provider="pge" onChange={handleChange} />);
    fireEvent.change(screen.getByTestId('provider-select'), { target: { value: '3ce' } });
    expect(handleChange).toHaveBeenCalledWith('3ce');
  });

  it('calls onChange with "pge" when PG&E option is selected', () => {
    const handleChange = vi.fn();
    render(<ProviderSelector provider="3ce" onChange={handleChange} />);
    fireEvent.change(screen.getByTestId('provider-select'), { target: { value: 'pge' } });
    expect(handleChange).toHaveBeenCalledWith('pge');
  });

  it('renders a label describing the selection purpose', () => {
    render(<ProviderSelector provider="pge" onChange={() => {}} />);
    expect(screen.getByText(/generation provider/i)).toBeInTheDocument();
  });
});
