import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TierSelector from './TierSelector';

describe('TierSelector', () => {
  it('renders a select element with data-testid="tier-select"', () => {
    render(<TierSelector tier="3cchoice" onChange={() => {}} />);
    expect(screen.getByTestId('tier-select')).toBeInTheDocument();
  });

  it('renders two tier options', () => {
    render(<TierSelector tier="3cchoice" onChange={() => {}} />);
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('includes a 3Cchoice option', () => {
    render(<TierSelector tier="3cchoice" onChange={() => {}} />);
    expect(screen.getByRole('option', { name: /3Cchoice/i })).toBeInTheDocument();
  });

  it('includes a 3Cprime option', () => {
    render(<TierSelector tier="3cchoice" onChange={() => {}} />);
    expect(screen.getByRole('option', { name: /3Cprime/i })).toBeInTheDocument();
  });

  it('shows 3cchoice as selected when tier is "3cchoice"', () => {
    render(<TierSelector tier="3cchoice" onChange={() => {}} />);
    expect(screen.getByTestId('tier-select').value).toBe('3cchoice');
  });

  it('shows 3cprime as selected when tier is "3cprime"', () => {
    render(<TierSelector tier="3cprime" onChange={() => {}} />);
    expect(screen.getByTestId('tier-select').value).toBe('3cprime');
  });

  it('calls onChange with "3cprime" when 3Cprime option is selected', () => {
    const handleChange = vi.fn();
    render(<TierSelector tier="3cchoice" onChange={handleChange} />);
    fireEvent.change(screen.getByTestId('tier-select'), { target: { value: '3cprime' } });
    expect(handleChange).toHaveBeenCalledWith('3cprime');
  });

  it('calls onChange with "3cchoice" when 3Cchoice option is selected', () => {
    const handleChange = vi.fn();
    render(<TierSelector tier="3cprime" onChange={handleChange} />);
    fireEvent.change(screen.getByTestId('tier-select'), { target: { value: '3cchoice' } });
    expect(handleChange).toHaveBeenCalledWith('3cchoice');
  });

  it('renders a label describing the selection purpose', () => {
    render(<TierSelector tier="3cchoice" onChange={() => {}} />);
    expect(screen.getByText(/3CE tier/i)).toBeInTheDocument();
  });
});
