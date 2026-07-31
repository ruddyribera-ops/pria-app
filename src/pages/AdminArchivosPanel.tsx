import { useState, useEffect, useCallback } from 'react';
import { getArchivos, deleteArchivo, type ArchivoEntry } from '../api/admin';
import styles from '../styles/admin.module.css';
import { useToast } from '../components/UI/Toast';

export default function AdminArchivosPanel() {
  const { showToast } = useToast();
  const [materials, setMaterials] = useState<ArchivoEntry[]>([]);
  const [diagnosticos, setDiagnosticos] = useState<ArchivoEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadArchivos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getArchivos();
      setMaterials(data.materials || []);
      setDiagnosticos(data.diagnosticos || []);
    } catch {
      showToast('Error al cargar archivos.', 'error');
      setMaterials([]);
      setDiagnosticos([]);
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { loadArchivos(); }, [loadArchivos]);

  const handleDelete = async (source: 'material' | 'diagnostico', id: number, filename: string) => {
    if (!window.confirm(`¿Eliminar "${filename}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteArchivo(source, id);
      showToast('Archivo eliminado.', 'success');
      await loadArchivos();
    } catch {
      showToast('Error al eliminar el archivo.', 'error');
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const allArchivos: Array<ArchivoEntry & { kind: string }> = [
    ...materials.map(m => ({ ...m, kind: 'material' })),
    ...diagnosticos.map(d => ({ ...d, kind: 'diagnostico' })),
  ];

  if (loading) {
    return (
      <div className={styles.adminCard} style={{ textAlign: 'center', padding: '2rem', color: '#6b6b80' }}>
        Cargando archivos...
      </div>
    );
  }

  if (allArchivos.length === 0) {
    return (
      <div className={styles.adminCard} style={{ textAlign: 'center', padding: '2rem', color: '#6b6b80' }}>
        No hay archivos registrados.
      </div>
    );
  }

  return (
    <div className={styles.adminCard}>
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e6e6eb', fontSize: '0.75rem', color: '#6b6b80', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {allArchivos.length} archivo(s) en total
      </div>
      {allArchivos.map((archivo) => (
        <div key={`${archivo.kind}-${archivo.id}`} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.75rem 1rem', borderBottom: '1px solid #e6e6eb',
          fontSize: '0.8125rem', color: '#1e1e2f',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
            <span>{archivo.kind === 'material' ? '📄' : '📋'}</span>
            <span style={{ minWidth: 0 }}>
              <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{archivo.filename}</strong>
              <span style={{ fontSize: '0.6875rem', color: '#6b6b80' }}>
                {archivo.user_nombre || archivo.user_username} · {formatSize(archivo.size)} · {new Date(archivo.created_at).toLocaleDateString('es-ES')}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleDelete(archivo.kind as 'material' | 'diagnostico', archivo.id, archivo.filename)}
            style={{ background: 'none', border: 'none', color: '#6b6b80', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8125rem', cursor: 'pointer', flexShrink: 0 }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
