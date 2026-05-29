/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastProvider } from '../../../components/UI/Toast';
import AdminPage from '../../AdminPage';

const renderWithToast = (ui: React.ReactElement) => {
  return render(<ToastProvider>{ui}</ToastProvider>);
};

describe('AdminPage', () => {
  it('renders the admin page heading', () => {
    renderWithToast(<AdminPage />);
    // Text is "Panel de Administración" with accent
    expect(screen.getByText(/panel/i)).toBeInTheDocument();
  });

  it('renders file browser section', () => {
    renderWithToast(<AdminPage />);
    expect(screen.getByText(/planificaciones/i)).toBeInTheDocument();
  });
});
