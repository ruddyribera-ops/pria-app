import { useState, useEffect, useCallback } from 'react';
import { getCacheStats, clearCache } from '../api/admin';

interface CacheStatsDisplay { entries: number; motores_cache: number; pdfs_cache: number; }

export default function AdminCachePanel() {
  const [stats, setStats] = useState<CacheStatsDisplay | null>(null);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getCacheStats() as unknown as CacheStatsDisplay;
      setStats({ entries: s.entries || 0, motores_cache: s.motores_cache || 0, pdfs_cache: s.pdfs_cache || 0 });
    } catch {
      setStats({ entries: 0, motores_cache: 0, pdfs_cache: 0 });
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const handleClear = async () => {
    if (!window.confirm('¿Limpiar caché del sistema?')) return;
    setClearing(true);
    try {
      await clearCache();
      await loadStats();
    } catch { /* noop */ }
    setClearing(false);
  };

  return (
    <div>
      <div style={{ background: '#fff', border: '1px solid #e6e6eb', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '1rem' }}>⚡ Estado de la Caché</h4>
        {loading ? <p style={{ color: '#6b6b80', fontSize: '0.8125rem' }}>Cargando estadísticas...</p>
          : stats ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {[
                { label: 'Entradas Totales', value: stats.entries, color: '#3A9E5E' },
                { label: 'Motores en Caché', value: stats.motores_cache, color: '#5c6ac4' },
                { label: 'PDFs en Caché', value: stats.pdfs_cache, color: '#b45309' },
              ].map(s => (
                <div key={s.label} style={{ background: '#f8f8ff', border: '1px solid #e6e6eb', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b6b80', marginTop: '0.25rem' }}>{s.label}</div>
                </div>
              ))}
            </div>
          ) : <p style={{ color: '#6b6b80', fontSize: '0.8125rem' }}>No se pudieron cargar las estadísticas.</p>}
      </div>
      <button onClick={handleClear} disabled={clearing} style={{ padding: '0.5rem 1.5rem', background: clearing ? '#fca5a5' : '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 500, fontSize: '0.8125rem', cursor: clearing ? 'not-allowed' : 'pointer' }}>
        {clearing ? '⏳ Limpiando...' : '🗑️ Limpiar Caché'}
      </button>
    </div>
  );
}
