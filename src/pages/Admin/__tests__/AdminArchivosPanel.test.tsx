/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastProvider } from '../../../components/UI/Toast';
import AdminArchivosPanel from '../../AdminArchivosPanel';
import * as adminApi from '../../../api/admin';

const renderWithToast = (ui: React.ReactElement) => {
  return render(<ToastProvider>{ui}</ToastProvider>);
};

const mockArchivos = {
  materials: [
    { id: 1, user_id: 1, filename: 'material-test.pdf', tipo: 'textbook', size: 1024, created_at: '2026-01-15T10:00:00Z', user_nombre: 'Juan Pérez', user_username: 'juanp', source: 'material' as const },
  ],
  diagnosticos: [
    { id: 1, user_id: 1, filename: 'diag-test.pdf', tipo: 'evaluacion', created_at: '2026-01-14T10:00:00Z', user_nombre: 'Juan Pérez', user_username: 'juanp', source: 'diagnostico' as const },
  ],
};

describe('AdminArchivosPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders archivo entries from API', async () => {
    vi.spyOn(adminApi, 'getArchivos').mockResolvedValue(mockArchivos);
    renderWithToast(<AdminArchivosPanel />);
    const filename = await screen.findByText('material-test.pdf');
    expect(filename).toBeInTheDocument();
  });

  it('shows diagnostico entries', async () => {
    vi.spyOn(adminApi, 'getArchivos').mockResolvedValue(mockArchivos);
    renderWithToast(<AdminArchivosPanel />);
    const diagFile = await screen.findByText('diag-test.pdf');
    expect(diagFile).toBeInTheDocument();
  });

  it('shows empty state when no files', async () => {
    vi.spyOn(adminApi, 'getArchivos').mockResolvedValue({ materials: [], diagnosticos: [] });
    renderWithToast(<AdminArchivosPanel />);
    const empty = await screen.findByText(/no hay archivos/i);
    expect(empty).toBeInTheDocument();
  });
});
