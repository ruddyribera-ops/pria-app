import { useState, useCallback, useEffect } from 'react';
import { getCacheStats, clearCache } from '../api/admin';
import styles from './AdminCachePanel.module.css';

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

  const statItems = [
    { label: 'Entradas Totales', value: stats?.entries ?? 0, color: 'var(--pria-accent)' },
    { label: 'Motores en Caché', value: stats?.motores_cache ?? 0, color: '#5c6ac4' },
    { label: 'PDFs en Caché', value: stats?.pdfs_cache ?? 0, color: '#b45309' },
  ];

  return (
    <div>
      <div className={styles.card}>
        <h4 className={styles.heading}>⚡ Estado de la Caché</h4>
        {loading ? (
          <p className={styles.loadingText}>Cargando estadísticas...</p>
        ) : stats ? (
          <div className={styles.statsGrid}>
            {statItems.map(s => (
              <div key={s.label} className={styles.statCard}>
                <div className={styles.statValue} style={{ color: s.color }}>{s.value}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.errorText}>No se pudieron cargar las estadísticas.</p>
        )}
      </div>
      <button onClick={handleClear} disabled={clearing} className={styles.clearBtn}>
        {clearing ? '⏳ Limpiando...' : '🗑️ Limpiar Caché'}
      </button>
    </div>
  );
}
