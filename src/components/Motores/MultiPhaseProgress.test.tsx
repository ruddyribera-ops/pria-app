/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MultiPhaseProgress from './MultiPhaseProgress';
import type { PhaseType } from '../../hooks/useMultiPhaseGeneration';

// Mock CSS module
vi.mock('./MultiPhaseProgress.module.css', () => ({
  __esModule: true,
  default: {
    container: 'container',
    headerRow: 'headerRow',
    headerLabel: 'headerLabel',
    cancelBtn: 'cancelBtn',
    errorBox: 'errorBox',
    progressSection: 'progressSection',
    progressLabels: 'progressLabels',
    progressTrack: 'progressTrack',
    progressFill: 'progressFill',
    phaseList: 'phaseList',
    phasePill: 'phasePill',
    phasePillDone: 'phasePillDone',
    phasePillActive: 'phasePillActive',
    phasePillIdle: 'phasePillIdle',
  },
}));

describe('MultiPhaseProgress', () => {
  const defaultProps = {
    currentPhaseName: null as PhaseType | null,
    phaseProgress: 0,
    completedPhases: [] as PhaseType[],
    error: null as string | null,
    onCancel: vi.fn(),
  };

  test('renders nothing when no state', () => {
    const { container } = render(<MultiPhaseProgress {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders progress bar when active', () => {
    const { container } = render(
      <MultiPhaseProgress
        {...defaultProps}
        currentPhaseName="synthesis"
        phaseProgress={50}
      />
    );
    expect(container.firstChild).not.toBeNull();
  });

  test('shows current phase name', () => {
    render(
      <MultiPhaseProgress
        {...defaultProps}
        currentPhaseName="synthesis"
        phaseProgress={50}
      />
    );
    
    expect(screen.getByText('⚡ Síntesis')).toBeTruthy();
  });

  test('shows progress percentage', () => {
    render(
      <MultiPhaseProgress
        {...defaultProps}
        currentPhaseName="synthesis"
        phaseProgress={75}
      />
    );
    
    expect(screen.getByText('75%')).toBeTruthy();
  });

  test('shows cancel button when active', () => {
    const onCancel = vi.fn();
    render(
      <MultiPhaseProgress
        {...defaultProps}
        currentPhaseName="synthesis"
        phaseProgress={50}
        onCancel={onCancel}
      />
    );
    
    expect(screen.getByRole('button', { name: /Cancelar/ })).toBeTruthy();
  });

  test('cancel button calls onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <MultiPhaseProgress
        {...defaultProps}
        currentPhaseName="synthesis"
        phaseProgress={50}
        onCancel={onCancel}
      />
    );
    
    await user.click(screen.getByRole('button', { name: /Cancelar/ }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('shows error state', () => {
    render(
      <MultiPhaseProgress
        {...defaultProps}
        error="Something went wrong"
      />
    );
    
    expect(screen.getByText('❌ Error')).toBeTruthy();
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  test('shows completed state', () => {
    render(
      <MultiPhaseProgress
        {...defaultProps}
        completedPhases={['synthesis', 'abp']}
      />
    );
    
    expect(screen.getByText('✅ Completado')).toBeTruthy();
  });

  test('shows phase pills', () => {
    render(
      <MultiPhaseProgress
        {...defaultProps}
        currentPhaseName="synthesis"
        phaseProgress={50}
      />
    );
    
    expect(screen.getByText('Alpha-2')).toBeTruthy();
    expect(screen.getByText('Síntesis')).toBeTruthy();
    expect(screen.getByText('ABP')).toBeTruthy();
    expect(screen.getByText('Evaluación')).toBeTruthy();
  });

  test('highlights active phase', () => {
    render(
      <MultiPhaseProgress
        {...defaultProps}
        currentPhaseName="abp"
        phaseProgress={30}
      />
    );
    
    // Should show "⏳" for active phase
    expect(screen.getByText('⏳')).toBeTruthy();
  });

  test('shows checkmarks for completed phases', () => {
    render(
      <MultiPhaseProgress
        {...defaultProps}
        completedPhases={['synthesis']}
        currentPhaseName="abp"
        phaseProgress={50}
      />
    );
    
    expect(screen.getByText('✅')).toBeTruthy();
  });
});
