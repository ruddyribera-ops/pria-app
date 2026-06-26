/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import HistoryPage from './HistoryPage';
import { renderWithProviders } from '../test-helpers';

const emptyResponse = { data: [], total: 0, page: 1, limit: 20 };

vi.mock('../hooks/useMotorHistory', () => ({
  useMotorHistory: () => ({ data: emptyResponse, isLoading: false, error: null }),
}));

describe('HistoryPage', () => {
  test('renders header', async () => {
    renderWithProviders(<HistoryPage />);
    await waitFor(() => {
      expect(screen.getByText(/Historial de Generación/i)).toBeTruthy();
    });
  });

  test('renders empty state', async () => {
    renderWithProviders(<HistoryPage />);
    await waitFor(() => {
      expect(screen.getByText(/Aún no has generado ningún contenido/i)).toBeTruthy();
    });
  });
});
