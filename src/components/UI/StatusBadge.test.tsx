/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  test('Renders status text', () => {
    render(<StatusBadge status="activo" />);
    expect(screen.getByText('● Activo')).toBeTruthy();
  });

  test('Different statuses have different colors', () => {
    const { rerender } = render(<StatusBadge status="activo" />);
    const activoBadge = screen.getByText('● Activo');
    expect(activoBadge).toHaveStyle({ color: '#3A9E5E' });

    rerender(<StatusBadge status="pendiente" />);
    const pendienteBadge = screen.getByText('● Pendiente');
    expect(pendienteBadge).toHaveStyle({ color: '#f59e0b' });

    rerender(<StatusBadge status="inactivo" />);
    const inactivoBadge = screen.getByText('● Inactivo');
    expect(inactivoBadge).toHaveStyle({ color: '#ef4444' });
  });

  test('Unknown status uses default color', () => {
    render(<StatusBadge status="desconocido" />);
    const badge = screen.getByText('● desconocido');
    expect(badge).toHaveStyle({ color: '#b3b3cc' });
  });

  test('Boolean true maps to activo green', () => {
    render(<StatusBadge status={true} />);
    expect(screen.getByText('● Activo')).toHaveStyle({ color: '#3A9E5E' });
  });

  test('Boolean false maps to pendiente yellow', () => {
    render(<StatusBadge status={false} />);
    expect(screen.getByText('● Pendiente')).toHaveStyle({ color: '#f59e0b' });
  });
});
