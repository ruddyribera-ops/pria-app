import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useHealthCheck } from '../../hooks/useHealthCheck';

export default function AppLayout() {
  const [nivel, setNivel] = useState('Primaria');
  const [grado, setGrado] = useState('5to primaria');
  const health = useHealthCheck();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Health warning banner */}
      {health.status === 'unknown' && (
        <div style={{
          position: 'fixed', top: 0, left: '260px', right: 0, zIndex: 200,
          background: '#fef3c7', borderBottom: '1px solid #fbbf24',
          padding: '0.5rem 1.5rem', fontSize: '0.8125rem', color: '#92400e',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          ⚠️ No se pudo conectar con el servidor. Verifica tu conexión.
          <button
            onClick={health.refetch}
            style={{ marginLeft: 'auto', padding: '0.25rem 0.75rem', background: '#fbbf24', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
          >
            Reintentar
          </button>
        </div>
      )}
      <Sidebar
        nivel={nivel}
        grado={grado}
        onNivelChange={setNivel}
        onGradoChange={setGrado}
      />
      <main style={{
        marginLeft: '260px', padding: '1.75rem 2.25rem',
        minHeight: '100vh', background: '#ffffff', flex: 1, boxSizing: 'border-box',
      }}>
        <Outlet context={{ nivel, grado, setNivel, setGrado }} />
      </main>
    </div>
  );
}
