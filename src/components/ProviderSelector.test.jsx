import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProviderSelector from './ProviderSelector';

describe('ProviderSelector', () => {
  it('renders provider-toggle with one button per option', () => {
    render(<ProviderSelector provider="pge" onChange={() => {}} />);
    const toggle = screen.getByTestId('provider-toggle');
    expect(toggle.querySelectorAll('button')).toHaveLength(2);
  });

  it('renders a button for each default option', () => {
    render(<ProviderSelector provider="pge" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'PG&E Bundled' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3CE (CCA)' })).toBeInTheDocument();
  });

  it('marks the selected provider button as pressed', () => {
    render(<ProviderSelector provider="3ce" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: '3CE (CCA)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'PG&E Bundled' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with new value when a toggle button is clicked', () => {
    const onChange = vi.fn();
    render(<ProviderSelector provider="pge" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '3CE (CCA)' }));
    expect(onChange).toHaveBeenCalledWith('3ce');
  });
});

describe('ProviderSelector — toggle buttons', () => {
  it('clicking a toggle button calls onChange with that option\'s value', () => {
    const onChange = vi.fn();

    render(<ProviderSelector provider="pge" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '3CE (CCA)' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('3ce');
  });

  it('clicking the first toggle button calls onChange with the first option\'s value', () => {
    const onChange = vi.fn();

    // Start with '3ce' selected
    render(<ProviderSelector provider="3ce" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'PG&E Bundled' }));

    expect(onChange).toHaveBeenCalledWith('pge');
  });
});

describe('ProviderSelector — custom options', () => {
  const sceOptions = [
    { value: 'sce', label: 'SCE Bundled' },
    { value: 'sbce', label: 'SBCE' },
  ];

  it('renders exactly 2 buttons when passed 2 custom options', () => {
    render(<ProviderSelector provider="sce" onChange={() => {}} options={sceOptions} />);
    const toggle = screen.getByTestId('provider-toggle');
    expect(toggle.querySelectorAll('button')).toHaveLength(2);
  });

  it('renders correct labels for custom options', () => {
    render(<ProviderSelector provider="sce" onChange={() => {}} options={sceOptions} />);
    expect(screen.getByRole('button', { name: 'SCE Bundled' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SBCE' })).toBeInTheDocument();
  });

  it('marks the custom selected option as pressed', () => {
    render(<ProviderSelector provider="sbce" onChange={() => {}} options={sceOptions} />);
    expect(screen.getByRole('button', { name: 'SBCE' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'SCE Bundled' })).toHaveAttribute('aria-pressed', 'false');
  });
});
