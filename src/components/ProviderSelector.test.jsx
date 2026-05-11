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

describe('ProviderSelector — toggle buttons', () => {
  it('renders visible toggle buttons inside provider-toggle container', () => {
    render(<ProviderSelector provider="pge" onChange={() => {}} />);
    const toggle = screen.getByTestId('provider-toggle');
    // Two buttons inside the toggle group (one per default option)
    const buttons = toggle.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
  });

  it('clicking a toggle button calls onChange with that option\'s value', () => {
    const onChange = vi.fn();

    render(<ProviderSelector provider="pge" onChange={onChange} />);

    const toggle = screen.getByTestId('provider-toggle');
    const buttons = toggle.querySelectorAll('button');
    // Second button = '3CE (CCA)'
    fireEvent.click(buttons[1]);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('3ce');
  });

  it('clicking the first toggle button calls onChange with the first option\'s value', () => {
    const onChange = vi.fn();

    // Start with '3ce' selected
    render(<ProviderSelector provider="3ce" onChange={onChange} />);

    const toggle = screen.getByTestId('provider-toggle');
    const buttons = toggle.querySelectorAll('button');
    // First button = 'PG&E Bundled'
    fireEvent.click(buttons[0]);

    expect(onChange).toHaveBeenCalledWith('pge');
  });
});

describe('ProviderSelector — custom options', () => {
  const sceOptions = [
    { value: 'sce', label: 'SCE Bundled' },
    { value: 'sbce', label: 'SBCE' },
  ];

  it('renders exactly 2 options when passed 2 custom options', () => {
    render(<ProviderSelector provider="sce" onChange={() => {}} options={sceOptions} />);
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('renders correct labels for custom options', () => {
    render(<ProviderSelector provider="sce" onChange={() => {}} options={sceOptions} />);
    expect(screen.getByRole('option', { name: 'SCE Bundled' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'SBCE' })).toBeInTheDocument();
  });

  it('reflects the custom option value as selected', () => {
    render(<ProviderSelector provider="sbce" onChange={() => {}} options={sceOptions} />);
    expect(screen.getByTestId('provider-select').value).toBe('sbce');
  });

  it('toggle buttons show custom option labels', () => {
    render(<ProviderSelector provider="sce" onChange={() => {}} options={sceOptions} />);
    const toggle = screen.getByTestId('provider-toggle');
    expect(toggle).toHaveTextContent('SCE Bundled');
    expect(toggle).toHaveTextContent('SBCE');
  });
});
