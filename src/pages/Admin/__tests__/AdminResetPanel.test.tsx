/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminResetPanel from '../../AdminResetPanel';

describe('AdminResetPanel', () => {
  beforeEach(() => {
    // Freeze the clock so the component's `new Date().toISOString().slice(0,10)`
    // produces a deterministic "today" string. Noon UTC guarantees the date
    // slice is stable across all local timezones.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-13T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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
