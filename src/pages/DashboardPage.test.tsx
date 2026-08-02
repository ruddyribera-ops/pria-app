/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import DashboardPage from './DashboardPage';
import { renderWithProviders } from '../test-helpers';
import { AuthProvider } from '../context/AuthContext';

vi.mock('../hooks/useMotorHistory', () => {
  const emptyResponse = { data: [], total: 0, page: 1, limit: 20 };
  return {
    fetchMotorHistory: vi.fn().mockResolvedValue(emptyResponse),
  };
});

describe('DashboardPage', () => {
  test('renders Mis clases header', async () => {
    renderWithProviders(
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText(/Mis clases/i)).toBeTruthy();
    });
  });

  test('renders empty state when no classes', async () => {
    renderWithProviders(
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText(/Aún no tienes clases/i)).toBeTruthy();
    });
  });
});
