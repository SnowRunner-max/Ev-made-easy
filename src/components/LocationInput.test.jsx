import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LocationInput from './LocationInput';

// Mock the hook so component tests are isolated from lookup logic
const mockHook = {
  inputValue: '',
  status: 'idle',
  errorCode: null,
  result: null,
  resolved: null,
  setInput: vi.fn(),
  clearInput: vi.fn(),
};

vi.mock('../hooks/useLocationLookup', () => ({
  useLocationLookup: () => mockHook,
}));

function setHookState(overrides) {
  Object.assign(mockHook, { inputValue: '', status: 'idle', errorCode: null, result: null, resolved: null }, overrides);
  // Auto-populate result from errorCode when not explicitly provided
  if (overrides.errorCode && overrides.result === undefined) {
    mockHook.result = { errorCode: overrides.errorCode };
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  setHookState({});
});

describe('LocationInput — idle state', () => {
  it('renders location-input with placeholder', () => {
    render(<LocationInput onLocationResolved={() => {}} onLocationCleared={() => {}} />);
    const input = screen.getByTestId('location-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Enter city or zip code');
  });

  it('shows hint text in status area', () => {
    render(<LocationInput onLocationResolved={() => {}} onLocationCleared={() => {}} />);
    expect(screen.getByTestId('location-status')).toHaveTextContent('Works with California zip codes and city names');
  });

  it('does not show the clear button when input is empty', () => {
    render(<LocationInput onLocationResolved={() => {}} onLocationCleared={() => {}} />);
    expect(screen.queryByTestId('location-clear')).not.toBeInTheDocument();
  });

  it('status element has role=status and aria-live=polite', () => {
    render(<LocationInput onLocationResolved={() => {}} onLocationCleared={() => {}} />);
    const status = screen.getByTestId('location-status');
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('input has aria-describedby pointing to location-status', () => {
    render(<LocationInput onLocationResolved={() => {}} onLocationCleared={() => {}} />);
    const input = screen.getByTestId('location-input');
    expect(input).toHaveAttribute('aria-describedby', 'location-status');
  });
});

describe('LocationInput — resolving state', () => {
  it('shows ellipsis indicator when resolving', () => {
    setHookState({ inputValue: '934', status: 'resolving' });
    render(<LocationInput onLocationResolved={() => {}} onLocationCleared={() => {}} />);
    expect(screen.getByTestId('location-status')).toHaveTextContent('…');
  });
});

describe('LocationInput — valid state', () => {
  beforeEach(() => {
    setHookState({
      inputValue: 'Buellton, CA',
      status: 'valid',
      resolved: { serviceAreaId: 'pge-3ce-sbco', displayLabel: 'Buellton, CA', zip: '93427' },
    });
  });

  it('shows PGE territory message in status area', () => {
    render(<LocationInput onLocationResolved={() => {}} onLocationCleared={() => {}} />);
    expect(screen.getByTestId('location-status')).toHaveTextContent('PG&E territory');
  });

  it('input does not have aria-invalid', () => {
    render(<LocationInput onLocationResolved={() => {}} onLocationCleared={() => {}} />);
    const input = screen.getByTestId('location-input');
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('calls onLocationResolved when status transitions to valid', () => {
    const onResolved = vi.fn();
    render(<LocationInput onLocationResolved={onResolved} onLocationCleared={() => {}} />);
    expect(onResolved).toHaveBeenCalledWith({
      serviceAreaId: 'pge-3ce-sbco',
      displayLabel: 'Buellton, CA',
      zip: '93427',
    });
  });
});

describe('LocationInput — error states', () => {
  it('shows invalid_input message', () => {
    setHookState({ inputValue: 'xyz', status: 'error', errorCode: 'invalid_input' });
    render(<LocationInput onLocationResolved={() => {}} onLocationCleared={() => {}} />);
    expect(screen.getByTestId('location-status')).toHaveTextContent('Enter a valid zipcode or California city name');
  });

  it('shows not_ca message', () => {
    setHookState({ inputValue: '10001', status: 'error', errorCode: 'not_ca' });
    render(<LocationInput onLocationResolved={() => {}} onLocationCleared={() => {}} />);
    expect(screen.getByTestId('location-status')).toHaveTextContent('Only California locations are supported');
  });

  it('shows not_supported message', () => {
    setHookState({ inputValue: '90001', status: 'error', errorCode: 'not_supported' });
    render(<LocationInput onLocationResolved={() => {}} onLocationCleared={() => {}} />);
    expect(screen.getByTestId('location-status')).toHaveTextContent('This area is not yet supported');
  });

  it('shows UtilityPicker for multi_utility result', () => {
    setHookState({
      inputValue: '93101',
      status: 'error',
      errorCode: 'multi_utility',
      result: {
        errorCode: 'multi_utility',
        candidates: ['pge-3ce-sb', 'sce-3ce-sb'],
        displayLabel: 'Santa Barbara, CA',
        zip: '93101',
      },
    });
    render(<LocationInput onLocationResolved={() => {}} onLocationCleared={() => {}} />);
    // Should render utility picker buttons, not a plain error message
    expect(screen.getByTestId('location-status')).not.toHaveTextContent('Multiple utilities serve this area');
    expect(screen.getByRole('button', { name: /PG&E|SCE|Central Coast|Clean Power/i })).toBeInTheDocument();
  });

  it('input has aria-invalid=true on error', () => {
    setHookState({ inputValue: '90001', status: 'error', errorCode: 'not_supported' });
    render(<LocationInput onLocationResolved={() => {}} onLocationCleared={() => {}} />);
    expect(screen.getByTestId('location-input')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('LocationInput — clear button', () => {
  it('shows clear button when input is non-empty', () => {
    setHookState({ inputValue: '93427', status: 'resolving' });
    render(<LocationInput onLocationResolved={() => {}} onLocationCleared={() => {}} />);
    expect(screen.getByTestId('location-clear')).toBeInTheDocument();
  });

  it('clicking clear button calls clearInput and onLocationCleared', () => {
    const onCleared = vi.fn();
    setHookState({ inputValue: '93427', status: 'resolving' });
    render(<LocationInput onLocationResolved={() => {}} onLocationCleared={onCleared} />);
    fireEvent.click(screen.getByTestId('location-clear'));
    expect(mockHook.clearInput).toHaveBeenCalled();
    expect(onCleared).toHaveBeenCalled();
  });
});

describe('LocationInput — typing calls setInput', () => {
  it('calls setInput when user types', () => {
    render(<LocationInput onLocationResolved={() => {}} onLocationCleared={() => {}} />);
    fireEvent.change(screen.getByTestId('location-input'), { target: { value: '93427' } });
    expect(mockHook.setInput).toHaveBeenCalledWith('93427');
  });
});
