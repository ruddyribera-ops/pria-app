/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../../../components/UI/Toast';
import { AuthProvider } from '../../../context/AuthContext';
import { TOKEN_KEY, USER_KEY } from '../../../constants';
import AdminPage from '../../AdminPage';

const mockUser = { id: 1, username: 'admin', nombre: 'Admin Test', teacher_code: 'ADMIN', nivel: 'Secundaria', grado: '3er año', role: 'admin' as const };

const renderWithProviders = (ui: React.ReactElement) => {
  localStorage.setItem(TOKEN_KEY, 'admin-token');
  localStorage.setItem(USER_KEY, JSON.stringify(mockUser));

  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>{ui}</ToastProvider>
      </AuthProvider>
    </MemoryRouter>
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
    expect(screen.getByRole('button', { name: /archivos fuente/i })).toBeInTheDocument();
  });
});
