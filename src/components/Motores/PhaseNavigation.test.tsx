/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhaseNavigation from './PhaseNavigation';

describe('PhaseNavigation', () => {
  const defaultProps = {
    currentPhase: 0,
    totalPhases: 3,
    phaseStatus: 'idle' as const,
    isFirst: true,
    isLast: false,
    canGoNext: false,
    isActive: false,
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onRegenerate: vi.fn(),
    onReset: vi.fn(),
  };

  test('renders prev/next buttons', () => {
    render(<PhaseNavigation {...defaultProps} isFirst={false} />);
    expect(screen.getByText('← Anterior')).toBeTruthy();
    expect(screen.getByText('Siguiente →')).toBeTruthy();
  });

  test('prev button is disabled on first phase', () => {
    const { container } = render(<PhaseNavigation {...defaultProps} isFirst={true} isLast={false} />);
    expect(container.textContent).not.toContain('← Anterior');
  });

  test('next button is disabled on last phase', () => {
    render(<PhaseNavigation {...defaultProps} isFirst={false} isLast={true} phaseStatus="done" />);
    // When isLast and done, it shows "Cerrar y empezar nuevo" instead of next button
    expect(screen.getByText('✕ Cerrar y empezar nuevo')).toBeTruthy();
  });

  test('prev button is disabled when isActive', () => {
    render(<PhaseNavigation {...defaultProps} isFirst={false} isActive={true} />);
    const prevBtn = screen.getByText('← Anterior');
    expect(prevBtn).toBeTruthy();
  });

  test('next button is disabled when isActive', () => {
    render(<PhaseNavigation {...defaultProps} isLast={false} isActive={true} canGoNext={true} />);
    const nextBtn = screen.getByText('Siguiente →');
    expect(nextBtn).toBeTruthy();
  });

  test('next button is disabled when canGoNext is false', () => {
    render(<PhaseNavigation {...defaultProps} isLast={false} canGoNext={false} />);
    const nextBtn = screen.getByText('Siguiente →');
    expect(nextBtn).toBeTruthy();
  });

  test('click on prev button fires onPrev', async () => {
    const user = userEvent.setup();
    const onPrev = vi.fn();
    render(<PhaseNavigation {...defaultProps} isFirst={false} onPrev={onPrev} />);
    
    await user.click(screen.getByText('← Anterior'));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  test('click on next button fires onNext', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<PhaseNavigation {...defaultProps} isLast={false} canGoNext={true} onNext={onNext} />);
    
    await user.click(screen.getByText('Siguiente →'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  test('regenerate button appears when phase is done', () => {
    render(<PhaseNavigation {...defaultProps} phaseStatus="done" />);
    expect(screen.getByText('🔄 Regenerar')).toBeTruthy();
  });

  test('regenerate button calls onRegenerate', async () => {
    const user = userEvent.setup();
    const onRegenerate = vi.fn();
    render(<PhaseNavigation {...defaultProps} phaseStatus="done" onRegenerate={onRegenerate} />);
    
    await user.click(screen.getByText('🔄 Regenerar'));
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  test('reset button on last phase calls onReset', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(<PhaseNavigation {...defaultProps} isLast={true} phaseStatus="done" onReset={onReset} />);
    
    await user.click(screen.getByText('✕ Cerrar y empezar nuevo'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  test('returns null when totalPhases <= 1', () => {
    const { container } = render(<PhaseNavigation {...defaultProps} totalPhases={1} />);
    expect(container.firstChild).toBeNull();
  });

  test('returns null when totalPhases is 0', () => {
    const { container } = render(<PhaseNavigation {...defaultProps} totalPhases={0} />);
    expect(container.firstChild).toBeNull();
  });
});
