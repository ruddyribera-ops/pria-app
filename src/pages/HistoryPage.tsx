import { useState, useEffect } from 'react';
import client from '../api/client';
import { useToast } from '../components/UI/Toast';

const MOTOR_ICONS: Record<string, string> = {
  synthesis: '🧠',
  alpha2: '📄',
  abp: '🚀',
  assessment: '📊',
  plan: '📋',
  slides: '🎨',
  ficha: '🎮',
  quiz: '❓',
  tutor: '👩‍🏫',
  pdc: '📅',
  recalibrate: '🔄',
  micro: '🎯',
};

const MOTOR_LABELS: Record<string, string> = {
  synthesis: 'Síntesis Curricular',
  alpha2: 'Extracción de Currículo',
  abp: 'Proyecto ABP',
  assessment: 'Evaluación',
  plan: 'Plan de Clase',
  slides: 'Diapositivas',
  ficha: 'Ficha Gamificada',
  quiz: 'Pop Quiz',
  tutor: 'Panel del Tutor',
  pdc: 'PDC Trimestral',
  recalibrate: 'Recalibración',
  micro: 'Micro-Objetivos',
};

interface HistoryEntry {
  id: number;
  motor_type: string;
  status: string;
  simulated: boolean | null;
  created_at: string;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    client.get('/motores/history')
      .then((res) => {
        setEntries(res.data.data ?? []);
        setLoading(false);
      })
      .catch((err) => {
        const msg = err?.response?.data?.error || err?.message || 'Error al cargar historial';
        setError(msg);
        setLoading(false);
        showToast(msg, 'error');
      });
  }, []);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e1e2f', margin: 0 }}>
          📁 Historial de Generación
        </h1>
        <p style={{ fontSize: '0.8125rem', color: '#6b6b80', margin: '0.25rem 0 0' }}>
          Últimos 20 contenidos generados con los motores IA
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b6b80' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
          <div style={{ fontSize: '0.875rem' }}>Cargando historial...</div>
        </div>
      )}

      {!loading && error && (
        <div style={{
          padding: '1rem', background: '#FEE2E2', border: '1px solid #FCA5A5',
          borderRadius: '8px', color: '#991B1B', fontSize: '0.875rem', textAlign: 'center',
        }}>
          {error}
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div style={{
          padding: '3rem', textAlign: 'center', background: '#f8f8fa',
          borderRadius: '12px', color: '#6b6b80',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
          <div style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            Aún no has generado ningún contenido
          </div>
          <div style={{ fontSize: '0.8125rem' }}>
            Ve a <strong>Materiales</strong> y genera tu primer motor.
          </div>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {entries.map((entry) => {
            const icon = MOTOR_ICONS[entry.motor_type] ?? '⚙️';
            const label = MOTOR_LABELS[entry.motor_type] ?? entry.motor_type;
            const isExpanded = expandedId === entry.id;
            const isSimulated = entry.simulated === true;

            return (
              <div
                key={entry.id}
                style={{
                  background: '#fff',
                  border: '1px solid #e6e6eb',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.15s',
                }}
              >
                {/* Row header */}
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.875rem 1rem', cursor: 'pointer',
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setExpandedId(isExpanded ? null : entry.id)}
                >
                  <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e1e2f' }}>
                      {label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b6b80' }}>
                      {formatDate(entry.created_at)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                    {isSimulated ? (
                      <span style={{
                        fontSize: '0.6875rem', fontWeight: 600,
                        background: '#FEF3C7', color: '#92400E',
                        padding: '0.2rem 0.6rem', borderRadius: '99px',
                      }}>
                        ⚠️ Simulado
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '0.6875rem', fontWeight: 600,
                        background: '#D1FAE5', color: '#065F46',
                        padding: '0.2rem 0.6rem', borderRadius: '99px',
                      }}>
                        ✅ Real
                      </span>
                    )}
                    <span style={{ fontSize: '0.875rem', color: '#6b6b80' }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* Expanded JSON preview */}
                {isExpanded && (
                  <div style={{
                    padding: '0.75rem 1rem',
                    borderTop: '1px solid #f0f0f5',
                    background: '#fafafa',
                  }}>
                    <div style={{
                      fontSize: '0.75rem', color: '#6b6b80', marginBottom: '0.5rem',
                    }}>
                      ID: {entry.id} · Tipo: {entry.motor_type} · Status: {entry.status}
                      {isSimulated ? ' · ⚠️ Generado sin IA (contenido simulado)'
                        : ' · Motor IA'}
                    </div>
                    <div style={{
                      fontSize: '0.6875rem', fontFamily: 'monospace',
                      background: '#1e1e2f', color: '#a5f3fc',
                      padding: '0.75rem', borderRadius: '6px',
                      overflowX: 'auto', maxHeight: '200px', overflowY: 'auto',
                      whiteSpace: 'pre',
                    }}>
                      {'{\n  "id": ' + entry.id + ',\n  "motor_type": "' + entry.motor_type + '",\n  "status": "' + entry.status + '",\n  "simulated": ' + (isSimulated ? 'true' : 'false') + ',\n  "created_at": "' + entry.created_at + '"\n}'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}