import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useHealthCheck } from '../../hooks/useHealthCheck';

export default function AppLayout() {
  const health = useHealthCheck();

  return (
    <div className="app-layout">
      {/* Health warning banner */}
      {health.status === 'unknown' && (
        <div className="app-layout-banner">
          ⚠️ No se pudo conectar con el servidor. Verifica tu conexión.
          <button
            type="button"
            onClick={health.refetch}
            style={{ marginLeft: 'auto', padding: '0.25rem 0.75rem', background: '#fbbf24', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
          >
            Reintentar
          </button>
        </div>
      )}
      <Sidebar />
      <main className="app-layout-main">
        <Outlet />
      </main>
    </div>
  );
}
