import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UtilityPicker from './UtilityPicker';

// Minimal serviceAreas map covering the candidates used in tests
const SERVICE_AREAS = {
  'pge-3ce-sb': { name: 'PG&E (3CE)', utilityId: 'pge', utility: 'PG&E', cca: '3CE' },
  'sce-la':     { name: 'SCE (Los Angeles)', utilityId: 'sce', utility: 'SCE' },
  'sdge-sdcp-sd': { name: 'SDG&E + San Diego Community Power', utilityId: 'sdge', utility: 'SDG&E', cca: 'SDCP' },
  'sdge-cea-sd': { name: 'SDG&E + Clean Energy Alliance', utilityId: 'sdge', utility: 'SDG&E', cca: 'CEA' },
  'sdge-direct': { name: 'SDG&E Bundled', utilityId: 'sdge', utility: 'SDG&E' },
};

describe('UtilityPicker — prompt text', () => {
  it('renders the multi-utility prompt text', () => {
    render(
      <UtilityPicker
        candidates={['pge-3ce-sb', 'sce-la']}
        serviceAreas={SERVICE_AREAS}
        onSelect={() => {}}
      />
    );

    expect(screen.getByText(/Multiple service options may apply here/i)).toBeInTheDocument();
  });

  it('renders the CCA prompt text for same-utility CCA candidates', () => {
    render(
      <UtilityPicker
        candidates={['sdge-sdcp-sd', 'sdge-cea-sd']}
        serviceAreas={SERVICE_AREAS}
        onSelect={() => {}}
      />
    );

    expect(screen.getByText(/Multiple CCA options may apply here/i)).toBeInTheDocument();
  });
});

describe('UtilityPicker — button rendering', () => {
  it('renders one button per known candidate', () => {
    render(
      <UtilityPicker
        candidates={['pge-3ce-sb', 'sce-la']}
        serviceAreas={SERVICE_AREAS}
        onSelect={() => {}}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
  });

  it('renders all three known candidates', () => {
    render(
      <UtilityPicker
        candidates={['sdge-sdcp-sd', 'sdge-cea-sd', 'sdge-direct']}
        serviceAreas={SERVICE_AREAS}
        onSelect={() => {}}
      />
    );

    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'SDG&E + San Diego Community Power' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SDG&E + Clean Energy Alliance' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SDG&E Bundled' })).toBeInTheDocument();
  });

  it('renders button with the service area name', () => {
    render(
      <UtilityPicker
        candidates={['pge-3ce-sb']}
        serviceAreas={SERVICE_AREAS}
        onSelect={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: 'PG&E (3CE)' })).toBeInTheDocument();
  });

  it('skips (renders null for) unknown serviceAreaIds not present in serviceAreas', () => {
    render(
      <UtilityPicker
        candidates={['pge-3ce-sb', 'unknown-area-xyz', 'sce-la']}
        serviceAreas={SERVICE_AREAS}
        onSelect={() => {}}
      />
    );

    // Only 2 known candidates — the unknown one is skipped
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    expect(screen.queryByText('unknown-area-xyz')).not.toBeInTheDocument();
  });

  it('renders zero buttons when all candidates are unknown', () => {
    render(
      <UtilityPicker
        candidates={['does-not-exist']}
        serviceAreas={SERVICE_AREAS}
        onSelect={() => {}}
      />
    );

    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

describe('UtilityPicker — onSelect callback', () => {
  it('calls onSelect with the correct serviceAreaId when a button is clicked', () => {
    const onSelect = vi.fn();

    render(
      <UtilityPicker
        candidates={['pge-3ce-sb', 'sce-la']}
        serviceAreas={SERVICE_AREAS}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'SCE (Los Angeles)' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('sce-la');
  });

  it('calls onSelect with the first candidate id when its button is clicked', () => {
    const onSelect = vi.fn();

    render(
      <UtilityPicker
        candidates={['pge-3ce-sb', 'sce-la']}
        serviceAreas={SERVICE_AREAS}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'PG&E (3CE)' }));

    expect(onSelect).toHaveBeenCalledWith('pge-3ce-sb');
  });
});
