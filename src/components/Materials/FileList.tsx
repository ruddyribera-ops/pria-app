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
        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6b6b80', fontSize: '0.8125rem' }}>
          Cargando materiales...
        </div>
      ) : materials.length === 0 ? (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6b6b80', fontSize: '0.8125rem' }}>
          No hay materiales subidos
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
