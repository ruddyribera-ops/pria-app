/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import MaterialesPage from './MaterialesPage';
import { renderWithProviders } from '../test-helpers';

vi.mock('../components/Materials/MaterialesUpload', () => ({
  default: () => <div data-testid="upload">Upload</div>,
}));

vi.mock('../components/Materials/MaterialesMotorPanel', () => ({
  default: () => <div data-testid="motor-panel">Motor Panel</div>,
}));

vi.mock('../components/Materials/MaterialesExportPanel', () => ({
  default: () => <div data-testid="export-panel">Export Panel</div>,
}));

vi.mock('../hooks/useCurriculum', () => ({
  useCurriculum: () => ({ saveCurriculum: vi.fn(), curriculum: null }),
}));

vi.mock('../hooks/useMotorGenerator', () => ({
  useMotorGenerator: () => ({
    result: null,
    loading: false,
    generate: vi.fn(),
    generateStreaming: vi.fn(),
  }),
}));

vi.mock('../api/materials', () => ({
  listMaterials: vi.fn().mockResolvedValue([]),
  uploadMaterial: vi.fn().mockResolvedValue({}),
  deleteMaterial: vi.fn().mockResolvedValue(undefined),
}));

describe('MaterialesPage', () => {
  test('renders Header', async () => {
    renderWithProviders(<MaterialesPage />);
    await waitFor(() => {
      expect(screen.getByText(/Materiales/)).toBeTruthy();
    });
  });

  test('renders upload area', async () => {
    renderWithProviders(<MaterialesPage />);
    await waitFor(() => {
      expect(screen.getByTestId('upload')).toBeTruthy();
    });
  });

  test('renders motor panel', async () => {
    renderWithProviders(<MaterialesPage />);
    await waitFor(() => {
      expect(screen.getByTestId('motor-panel')).toBeTruthy();
    });
  });
});
