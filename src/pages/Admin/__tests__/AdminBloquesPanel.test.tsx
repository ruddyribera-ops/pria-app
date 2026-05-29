/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminBloquesPanel from '../../AdminBloquesPanel';

describe('AdminBloquesPanel', () => {
  it('renders loading state on mount', () => {
    render(<AdminBloquesPanel teacherCode="TEST01" showToast={() => {}} />);
    expect(screen.getByText(/cargando bloques/i)).toBeInTheDocument();
  });

  it('renders create block button', () => {
    render(<AdminBloquesPanel teacherCode="TEST01" showToast={() => {}} />);
    expect(screen.getByRole('button', { name: /crear bloque/i })).toBeInTheDocument();
  });

  it('renders at least one day selector', () => {
    render(<AdminBloquesPanel teacherCode="TEST01" showToast={() => {}} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
  });
});
