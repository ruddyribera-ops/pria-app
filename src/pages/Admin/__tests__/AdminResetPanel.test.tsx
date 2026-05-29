/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminResetPanel from '../../AdminResetPanel';

describe('AdminResetPanel', () => {
  it('renders reset button', () => {
    render(<AdminResetPanel teacherCode="TEST01" />);
    expect(screen.getByRole('button', { name: /reiniciar datos del/i })).toBeInTheDocument();
  });

  it('renders date input', () => {
    render(<AdminResetPanel teacherCode="TEST01" />);
    expect(screen.getByDisplayValue('2026-05-13')).toBeInTheDocument();
  });

  it('renders irreversibility warning', () => {
    render(<AdminResetPanel teacherCode="TEST01" />);
    expect(screen.getByText(/no se puede deshacer/i)).toBeInTheDocument();
  });
});
