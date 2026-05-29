/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MotorButton from './MotorButton';

describe('MotorButton', () => {
  test('renders label text when not loading', () => {
    render(<MotorButton label="Generar" loadingLabel="Generando..." color="#22c55e" onClick={() => {}} loading={false} />);
    expect(screen.getByRole('button', { name: /Generar/i })).toBeTruthy();
  });

  test('shows loading spinner when loading=true', () => {
    render(<MotorButton label="Generar" loadingLabel="Generando..." color="#22c55e" onClick={() => {}} loading={true} />);
    // Button exists with loading label
    expect(screen.getByRole('button', { name: /Generando/i })).toBeTruthy();
  });

  test('does NOT fire onClick when loading', () => {
    const handleClick = vi.fn();
    render(<MotorButton label="Generar" loadingLabel="Generando..." color="#22c55e" onClick={handleClick} loading={true} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('fires onClick when not loading', () => {
    const handleClick = vi.fn();
    render(<MotorButton label="Generar" loadingLabel="Generando..." color="#22c55e" onClick={handleClick} loading={false} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});