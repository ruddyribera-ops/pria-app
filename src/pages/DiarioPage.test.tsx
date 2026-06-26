/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DiarioPage from './DiarioPage';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { teacher_code: 'TEST' } }),
}));

vi.mock('../api/schedule', () => ({
  getScheduleByDay: vi.fn().mockResolvedValue([]),
}));

vi.mock('../api/admin', () => ({
  getAdminUsers: vi.fn().mockResolvedValue([]),
}));

vi.mock('../hooks/useAdmin', () => ({
  useEstadoSistema: () => ({ data: null }),
}));

describe('DiarioPage', () => {
  test('renders Header', async () => {
    render(
      <MemoryRouter>
        <DiarioPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/Diario/i)).toBeTruthy();
    });
  });
});
