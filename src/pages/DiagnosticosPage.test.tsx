/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import DiagnosticosPage from './DiagnosticosPage';
import { renderWithProviders } from '../test-helpers';

vi.mock('../api/diagnosticos', () => ({
  listDiagnosticos: vi.fn().mockResolvedValue([]),
  uploadDiagnostico: vi.fn().mockResolvedValue({}),
  deleteDiagnostico: vi.fn().mockResolvedValue(undefined),
}));

describe('DiagnosticosPage', () => {
  test('renders Header', () => {
    renderWithProviders(<DiagnosticosPage />);
    expect(screen.getByText('🩺 Diagnósticos')).toBeTruthy();
  });

  test('renders upload zone', async () => {
    renderWithProviders(<DiagnosticosPage />);
    await waitFor(() => {
      expect(screen.getByText(/Subir archivo de diagnóstico/i)).toBeTruthy();
    });
  });
});
