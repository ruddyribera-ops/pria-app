import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { TOKEN_KEY, USER_KEY } from '../../constants';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated: authReady, isLoading } = useAuth();
  // Also check localStorage directly — handles the timing gap between setState and re-render
  const hasStoredSession = !!localStorage.getItem(TOKEN_KEY) && !!localStorage.getItem(USER_KEY);
  const isAuthenticated = authReady || hasStoredSession;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#1c1e24', color: '#b3b3cc' }}>
        Cargando...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
