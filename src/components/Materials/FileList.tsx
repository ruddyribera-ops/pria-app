import type { Material } from '../../types';
import { formatFileSize } from '../../api/materials';

interface FileListProps {
  materials: Material[];
  loading: boolean;
  onDelete: (id: number) => void;
}

export default function FileList({ materials, loading, onDelete }: FileListProps) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e6e6eb', borderRadius: '8px', overflow: 'hidden',
    }}>
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{
            width: '32px', height: '32px', border: '3px solid #e6e6eb', borderTop: '3px solid #3A9E5E',
            borderRadius: '50%', animation: 'spin0.8s linear infinite', margin: '0 auto 0.75rem',
          }} />
          <div style={{ color: '#6b6b80', fontSize: '0.8125rem' }}>Cargando materiales...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : materials.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📂</div>
          <div style={{ color: '#1e1e2f', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            No hay materiales subidos
          </div>
          <div style={{ color: '#6b6b80', fontSize: '0.8125rem' }}>
            Sube tu primer PDF para comenzar
          </div>
        </div>
      ) : (
        materials.map((m) => (
          <div key={m.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.75rem 1rem', borderBottom: '1px solid #e6e6eb', fontSize: '0.8125rem', color: '#1e1e2f',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📗</span>
              <span>
                <strong>{m.filename}</strong>
                {m.size && <span style={{ fontSize: '0.6875rem', color: '#6b6b80' }}> — {formatFileSize(m.size)}</span>}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onDelete(m.id)}
              style={{
                background: 'none', border: 'none', color: '#6b6b80', padding: '0.25rem 0.5rem',
                borderRadius: '4px', fontSize: '0.8125rem', cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        ))
      )}
    </div>
  );
}
