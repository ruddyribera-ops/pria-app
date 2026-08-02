/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-helpers';
import { AuthProvider } from '../context/AuthContext';
import WizardPage from './WizardPage';

vi.mock('../api/materials', () => ({
  listMaterials: vi.fn().mockResolvedValue([]),
  uploadMaterial: vi.fn().mockResolvedValue({ id: 1, filename: 'test.pdf' }),
}));

vi.mock('../hooks/useMotorGenerator', () => ({
  useMotorGenerator: () => ({
    result: null,
    loading: false,
    generate: vi.fn(),
    generateStreaming: vi.fn(),
  }),
}));

describe('WizardPage', () => {
  test('renders Header', () => {
    renderWithProviders(
      <AuthProvider>
        <WizardPage />
      </AuthProvider>,
    );
    expect(screen.getByText(/Crear material/i)).toBeTruthy();
  });

  test('renders step indicator', () => {
    renderWithProviders(
      <AuthProvider>
        <WizardPage />
      </AuthProvider>,
    );
    expect(screen.getByText('1. Sube')).toBeTruthy();
    expect(screen.getByText('2. Selecciona')).toBeTruthy();
    expect(screen.getByText('3. Genera')).toBeTruthy();
  });
});
