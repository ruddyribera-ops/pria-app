import type { ReactNode } from 'react';
import type { MotorStatus } from '../../hooks/useMotorGeneration';

interface MotorResultPanelProps {
  status: MotorStatus;
  children?: ReactNode;
  error?: string | null;
  onReset?: () => void;
}

export default function MotorResultPanel({ status, children, error, onReset }: MotorResultPanelProps) {
  if (status === 'idle') return null;

  return (
    <div style={{
      marginTop: '1.25rem',
      border: '1px solid #e6e6eb',
      borderRadius: '8px',
      padding: '1.25rem',
      background: status === 'error' ? '#fef2f2' : status === 'done' ? '#f0fdf4' : '#fff',
    }}>
      {status === 'generating' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>⏳</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#1e1e2f' }}>Generando...</div>
            <div style={{ fontSize: '0.75rem', color: '#6b6b80' }}>El motor AI está procesando tu solicitud</div>
          </div>
        </div>
      )}
      {status === 'polling' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🔄</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#1e1e2f' }}>Esperando resultado...</div>
            <div style={{ fontSize: '0.75rem', color: '#6b6b80' }}>La generación está en progreso</div>
          </div>
        </div>
      )}
      {status === 'done' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ color: '#3A9E5E', fontWeight: 600, fontSize: '0.8125rem' }}>✅ Generación completada</span>
            {onReset && (
              <button onClick={onReset} style={{
                marginLeft: 'auto', padding: '0.25rem 0.75rem', border: '1px solid #e6e6eb',
                borderRadius: '4px', background: '#fff', fontSize: '0.75rem', cursor: 'pointer',
                color: '#6b6b80',
              }}>
                ✕ Cerrar
              </button>
            )}
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#1e1e2f', whiteSpace: 'pre-wrap' }}>
            {children}
          </div>
        </div>
      )}
      {status === 'error' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.8125rem' }}>❌ Error</span>
            {onReset && (
              <button onClick={onReset} style={{
                marginLeft: 'auto', padding: '0.25rem 0.75rem', border: '1px solid #e6e6eb',
                borderRadius: '4px', background: '#fff', fontSize: '0.75rem', cursor: 'pointer',
                color: '#6b6b80',
              }}>
                ✕ Cerrar
              </button>
            )}
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#dc2626' }}>
            {error || 'Error desconocido'}
          </div>
        </div>
      )}
    </div>
  );
}
