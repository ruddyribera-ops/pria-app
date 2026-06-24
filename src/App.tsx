import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/UI/Toast';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import AppLayout from './components/Layout/AppLayout';
import ErrorBoundary from './components/UI/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import ForgotPasswordPage from './pages/ForgotPassword';
import ResetPasswordPage from './pages/ResetPassword';
import './App.css';

// Lazy-load heavy pages to reduce initial bundle size
const SlideGeneratorPage = lazy(() => import('./pages/SlideGeneratorPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const MaterialesPage = lazy(() => import('./pages/MaterialesPage'));
const DiagnosticosPage = lazy(() => import('./pages/DiagnosticosPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const DiarioPage = lazy(() => import('./pages/DiarioPage'));
const SemanalPage = lazy(() => import('./pages/SemanalPage'));
const TrimestralPage = lazy(() => import('./pages/TrimestralPage'));
const WizardPage = lazy(() => import('./pages/WizardPage'));

// Lightweight fallback while chunk loads
function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', color: '#6b6b80', fontSize: '0.875rem',
    }}>
      Cargando...
    </div>
  );
}

function withErrorBoundary(page: React.ReactNode, pageName: string) {
  return (
    <ErrorBoundary pageName={pageName}>
      <Suspense fallback={<PageLoader />}>
        {page}
      </Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              {/* Public */}
              <Route path="/login" element={withErrorBoundary(<LoginPage />, 'Iniciar Sesión')} />
              <Route path="/forgot-password" element={withErrorBoundary(<ForgotPasswordPage />, 'Restablecer Contraseña')} />
              <Route path="/reset-password" element={withErrorBoundary(<ResetPasswordPage />, 'Nueva Contraseña')} />

              {/* Protected — AppLayout provides sidebar + outlet */}
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/wizard" element={withErrorBoundary(<WizardPage />, 'Crear Material')} />
                <Route path="/dashboard" element={withErrorBoundary(<DashboardPage />, 'Mis Clases')} />
                <Route path="/slides" element={withErrorBoundary(<SlideGeneratorPage />, 'Generar Diapositivas')} />
                <Route path="/diario" element={withErrorBoundary(<DiarioPage />, 'Diario')} />
                <Route path="/semanal" element={withErrorBoundary(<SemanalPage />, 'Plan Semanal')} />
                <Route path="/trimestral" element={withErrorBoundary(<TrimestralPage />, 'Planificación Trimestral')} />
                <Route path="/materiales" element={withErrorBoundary(<MaterialesPage />, 'Materiales')} />
                <Route path="/historial" element={withErrorBoundary(<HistoryPage />, 'Historial')} />
                <Route path="/diagnosticos" element={withErrorBoundary(<DiagnosticosPage />, 'Diagnósticos')} />
                <Route path="/admin" element={withErrorBoundary(<AdminPage />, 'Administración')} />
              </Route>

              {/* Redirects */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={withErrorBoundary(<NotFoundPage />, '404')} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
