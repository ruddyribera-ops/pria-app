import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/UI/Toast';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import AppLayout from './components/Layout/AppLayout';
import ErrorBoundary from './components/UI/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import DiarioPage from './pages/DiarioPage';
import SemanalPage from './pages/SemanalPage';
import TrimestralPage from './pages/TrimestralPage';
import SlideGeneratorPage from './pages/SlideGeneratorPage';
import MaterialesPage from './pages/MaterialesPage';
import DiagnosticosPage from './pages/DiagnosticosPage';
import AdminPage from './pages/AdminPage';
import HistoryPage from './pages/HistoryPage';
import NotFoundPage from './pages/NotFoundPage';
import './App.css';

function withErrorBoundary(Component: React.FC, pageName: string) {
  return (
    <ErrorBoundary pageName={pageName}>
      <Component />
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={withErrorBoundary(LoginPage, 'Iniciar Sesión')} />

            {/* Protected — AppLayout provides sidebar + outlet */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/slides" element={withErrorBoundary(SlideGeneratorPage, 'Generar Diapositivas')} />
              <Route path="/diario" element={withErrorBoundary(DiarioPage, 'Diario')} />
              <Route path="/semanal" element={withErrorBoundary(SemanalPage, 'Plan Semanal')} />
              <Route path="/trimestral" element={withErrorBoundary(TrimestralPage, 'Planificación Trimestral')} />
              <Route path="/materiales" element={withErrorBoundary(MaterialesPage, 'Materiales')} />
              <Route path="/historial" element={withErrorBoundary(HistoryPage, 'Historial')} />
              <Route path="/diagnosticos" element={withErrorBoundary(DiagnosticosPage, 'Diagnósticos')} />
              <Route path="/admin" element={withErrorBoundary(AdminPage, 'Administración')} />
            </Route>

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/slides" replace />} />
            <Route path="*" element={withErrorBoundary(NotFoundPage, '404')} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}