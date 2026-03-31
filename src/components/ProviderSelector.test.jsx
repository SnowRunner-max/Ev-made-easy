import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProviderSelector from './ProviderSelector';

describe('ProviderSelector', () => {
  it('renders provider-select', () => {
    render(<ProviderSelector provider="pge" onChange={() => {}} />);
    expect(screen.getByTestId('provider-select')).toBeInTheDocument();
  });

  it('has two options (PG&E Bundled and 3CE)', () => {
    render(<ProviderSelector provider="pge" onChange={() => {}} />);
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('shows selected provider', () => {
    render(<ProviderSelector provider="3ce" onChange={() => {}} />);
    expect(screen.getByTestId('provider-select').value).toBe('3ce');
  });

  it('calls onChange with new value', () => {
    const onChange = vi.fn();
    render(<ProviderSelector provider="pge" onChange={onChange} />);
    fireEvent.change(screen.getByTestId('provider-select'), { target: { value: '3ce' } });
    expect(onChange).toHaveBeenCalledWith('3ce');
  });
});
