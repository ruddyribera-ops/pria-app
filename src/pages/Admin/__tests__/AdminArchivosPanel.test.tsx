/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastProvider } from '../../../components/UI/Toast';
import AdminArchivosPanel from '../../AdminArchivosPanel';

const renderWithToast = (ui: React.ReactElement) => {
  return render(<ToastProvider>{ui}</ToastProvider>);
};

describe('AdminArchivosPanel', () => {
  it('renders archivo entries', () => {
    renderWithToast(<AdminArchivosPanel />);
    const archivos = screen.getAllByText(/archivos/i);
    expect(archivos.length).toBeGreaterThan(0);
  });

  it('renders folder entries', () => {
    renderWithToast(<AdminArchivosPanel />);
    const folders = screen.getAllByText('📁');
    expect(folders.length).toBeGreaterThan(0);
  });
});
