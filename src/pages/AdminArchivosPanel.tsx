import styles from '../styles/admin.module.css';
import { useToast } from '../components/UI/Toast';

export default function AdminArchivosPanel() {
  const { showToast } = useToast();

  return (
    <div className={styles.adminCard}>
      {[
        { name: 'planificaciones/', desc: '— 128 archivos' },
        { name: 'diagnosticos/', desc: '— 45 archivos' },
        { name: 'plantillas/', desc: '— 12 archivos' },
        { name: 'config.json', desc: '— 2.1 KB' },
        { name: 'database.sqlite', desc: '— 8.7 MB' },
      ].map((f) => (
        <div key={f.name} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.75rem 1rem', borderBottom: '1px solid #e6e6eb',
          fontSize: '0.8125rem', color: '#1e1e2f',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{f.name.includes('.') ? '📄' : '📁'}</span>
            <span><strong>{f.name}</strong> <span style={{ fontSize: '0.6875rem', color: '#6b6b80' }}>{f.desc}</span></span>
          </div>
          <button
            type="button"
            onClick={() => { if (window.confirm('¿Eliminar este archivo?')) showToast('Archivo eliminado (simulación).', 'info'); }}
            style={{ background: 'none', border: 'none', color: '#6b6b80', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8125rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
