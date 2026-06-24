import { useState } from 'react';
import { useMotorHistory } from '../hooks/useMotorHistory';
import { useToast } from '../components/UI/Toast';
import styles from './HistoryPage.module.css';

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

const MOTOR_OPTIONS = [
  { value: '', label: 'Todos los motores' },
  { value: 'synthesis', label: '🧠 Síntesis Curricular' },
  { value: 'alpha2', label: '📄 Extracción de Currículo' },
  { value: 'abp', label: '🚀 Proyecto ABP' },
  { value: 'assessment', label: '📊 Evaluación' },
  { value: 'plan', label: '📋 Plan de Clase' },
  { value: 'slides', label: '🎨 Diapositivas' },
  { value: 'ficha', label: '🎮 Ficha Gamificada' },
  { value: 'quiz', label: '❓ Pop Quiz' },
  { value: 'tutor', label: '👩‍🏫 Panel del Tutor' },
  { value: 'pdc', label: '📅 PDC Trimestral' },
  { value: 'recalibrate', label: '🔄 Recalibración' },
  { value: 'micro', label: '🎯 Micro-Objetivos' },
];

const PAGE_SIZE = 20;

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
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [motorType, setMotorType] = useState<string>('');
  const { showToast } = useToast();
  const { data, isLoading, error } = useMotorHistory({ page, limit: PAGE_SIZE, motor_type: motorType || null });

  const entries = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (error && entries.length === 0) {
    showToast('Error al cargar historial', 'error');
  }

  const handleMotorTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMotorType(e.target.value);
    setPage(1); // Reset to page 1 when filter changes
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>📁 Historial de Generación</h1>
        <p className={styles.subtitle}>
          {total > 0 ? `${total} contenidos generados` : 'Historial de contenidos generados con los motores IA'}
        </p>
      </div>

      {/* Filter controls */}
      <div className={styles.filterBar}>
        <label className={styles.filterLabel}>
          Filtrar por tipo:
          <select
            value={motorType}
            onChange={handleMotorTypeChange}
            className={styles.filterSelect}
          >
            {MOTOR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
      </div>

      {isLoading && (
        <div className={styles.loadingState}>
          <div className={styles.loadingIcon}>⏳</div>
          <div className={styles.loadingText}>Cargando historial...</div>
        </div>
      )}

      {error && entries.length === 0 && (
        <div className={styles.errorState}>
          Error al cargar historial. Intenta de nuevo.
        </div>
      )}

      {!isLoading && entries.length === 0 && !error && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📭</div>
          <div className={styles.emptyTitle}>Aún no has generado ningún contenido</div>
          <div className={styles.emptyText}>
            Ve a <strong>Materiales</strong> y genera tu primer motor.
          </div>
        </div>
      )}

      {!isLoading && entries.length > 0 && (
        <>
          <div className={styles.entryList}>
            {entries.map((entry) => {
              const icon = MOTOR_ICONS[entry.motor_type] ?? '⚙️';
              const label = MOTOR_LABELS[entry.motor_type] ?? entry.motor_type;
              const isExpanded = expandedId === entry.id;
              const isSimulated = entry.simulated === true;

              return (
                <div key={entry.id} className={styles.entryCard}>
                  {/* Row header */}
                  <div
                    className={styles.entryHeader}
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setExpandedId(isExpanded ? null : entry.id)}
                    aria-expanded={isExpanded}
                    aria-label={`${label}, ${formatDate(entry.created_at)}`}
                  >
                    <span className={styles.entryIcon}>{icon}</span>
                    <div className={styles.entryInfo}>
                      <div className={styles.entryLabel}>{label}</div>
                      <div className={styles.entryDate}>{formatDate(entry.created_at)}</div>
                    </div>
                    <div className={styles.entryActions}>
                      {isSimulated ? (
                        <span className={`${styles.badge} ${styles.badgeSimulated}`}>
                          ⚠️ Simulado
                        </span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeReal}`}>
                          ✅ Real
                        </span>
                      )}
                      <span className={styles.expandIcon}>
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded JSON preview */}
                  {isExpanded && (
                    <div className={styles.expandedContent}>
                      <div className={styles.expandedMeta}>
                        ID: {entry.id} · Tipo: {entry.motor_type} · Status: {entry.status}
                        {isSimulated
                          ? ' · ⚠️ Generado sin IA (contenido simulado)'
                          : ' · Motor IA'}
                      </div>
                      <div className={styles.jsonPreview}>
                        {entry.result_json_preview || '{ "error": "Sin contenido disponible" }'}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={styles.paginationButton}
              >
                ◀ Anterior
              </button>
              <span className={styles.paginationInfo}>
                Página {page} de {totalPages} ({total} total)
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className={styles.paginationButton}
              >
                Siguiente ▶
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
