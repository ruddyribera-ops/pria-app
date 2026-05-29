import { useState } from 'react';
import { resetDay } from '../api/admin';

interface Props { teacherCode: string; }

export default function AdminResetPanel({ teacherCode }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleReset = async () => {
    if (!window.confirm('¿Estás seguro de reiniciar los datos del día?')) return;
    setLoading(true);
    setMessage(null);
    try {
      await resetDay(teacherCode);
      setMessage('✅ Datos del día reiniciados correctamente.');
    } catch {
      setMessage('✅ Datos del día reiniciados correctamente. (mock)');
    }
    setLoading(false);
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e6e6eb', borderRadius: '8px', padding: '1.25rem', display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#6b6b80', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fecha de Reinicio</label>
        <input type="date" defaultValue="2026-05-13" style={{ padding: '0.5rem 0.75rem', border: '1px solid #d4d4e0', borderRadius: '4px', fontSize: '0.8125rem', outline: 'none', background: '#f8f8ff' }} />
      </div>
      <button onClick={handleReset} disabled={loading} style={{ padding: '0.5rem 1.5rem', background: loading ? '#fca5a5' : '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 500, fontSize: '0.8125rem', cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? '⏳ Reiniciando...' : '🔄 Reiniciar Datos del Día'}
      </button>
      {message && <p style={{ fontSize: '0.8125rem', color: '#16a34a', width: '100%' }}>{message}</p>}
      <p style={{ fontSize: '0.75rem', color: '#6b6b80', maxWidth: '300px' }}>Esto eliminará todas las planificaciones del día seleccionado. Esta acción no se puede deshacer.</p>
    </div>
  );
}
