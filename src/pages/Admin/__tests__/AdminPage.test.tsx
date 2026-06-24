/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastProvider } from '../../../components/UI/Toast';
import { AuthProvider } from '../../../context/AuthContext';
import AdminPage from '../../AdminPage';

// mockUser intentionally unused — reserved for future test scenarios
void ({ id: 1, username: 'admin', nombre: 'Admin Test', teacher_code: 'ADMIN', nivel: 'Secundaria', grado: '3er año', role: 'admin' as const });

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <AuthProvider>
      <ToastProvider>{ui}</ToastProvider>
    </AuthProvider>
  );
};

describe('AdminPage', () => {
  it('renders the admin page heading', () => {
    renderWithProviders(<AdminPage />);
    // Text is "Panel de Administración" with accent
    expect(screen.getByText(/panel/i)).toBeInTheDocument();
  });

  it('renders file browser section', () => {
    renderWithProviders(<AdminPage />);
    expect(screen.getByText(/planificaciones/i)).toBeInTheDocument();
  });
});
