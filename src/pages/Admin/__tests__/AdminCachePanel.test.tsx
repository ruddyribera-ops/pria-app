/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminCachePanel from '../../AdminCachePanel';

describe('AdminCachePanel', () => {
  it('renders loading state on mount', () => {
    render(<AdminCachePanel />);
    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it('renders clear cache button', () => {
    render(<AdminCachePanel />);
    expect(screen.getByRole('button', { name: /limpiar/i })).toBeInTheDocument();
  });

  it('renders cache section heading', () => {
    render(<AdminCachePanel />);
    // Text is "Estado de la Caché" with accent — use partial match
    expect(screen.getByText(/estado/i)).toBeInTheDocument();
  });
});
