/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import DashboardPage from './DashboardPage';
import { renderWithProviders } from '../test-helpers';

vi.mock('../hooks/useMotorHistory', () => {
  const emptyResponse = { data: [], total: 0, page: 1, limit: 20 };
  return {
    fetchMotorHistory: vi.fn().mockResolvedValue(emptyResponse),
  };
});

describe('DashboardPage', () => {
  test('renders Mis clases header', async () => {
    renderWithProviders(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Mis clases')).toBeTruthy();
    });
  });

  test('renders empty state when no classes', async () => {
    renderWithProviders(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/Aún no tienes clases/i)).toBeTruthy();
    });
  });
});
