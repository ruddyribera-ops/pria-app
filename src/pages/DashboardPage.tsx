import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/UI/Toast';
import { fetchMotorHistory, type MotorHistoryEntry } from '../hooks/useMotorHistory';
import styles from './DashboardPage.module.css';

interface MotorResult extends MotorHistoryEntry {}

const MOTOR_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  synthesis: { icon: '🧠', label: 'Síntesis', color: '#3A9E5E' },
  alpha2: { icon: '📄', label: 'Extracción', color: '#7C3AED' },
  abp: { icon: '🚀', label: 'Proyecto ABP', color: '#2563EB' },
  assessment: { icon: '📊', label: 'Evaluación', color: '#9333EA' },
  plan: { icon: '📋', label: 'Plan', color: '#D97706' },
  slides: { icon: '📖', label: 'Diapositivas', color: '#059669' },
  ficha: { icon: '🎮', label: 'Ficha', color: '#DC2626' },
  quiz: { icon: '❓', label: 'Quiz', color: '#7C3AED' },
  tutor: { icon: '👩‍🏫', label: 'Tutor', color: '#0891B2' },
  pdc: { icon: '📅', label: 'PDC', color: '#6D28D9' },
  recalibrate: { icon: '🔄', label: 'Recalibrar', color: '#EA580C' },
  micro: { icon: '🎯', label: 'Micro-obj', color: '#DB2777' },
  source_narrator: { icon: '📜', label: 'Narrador', color: '#0D9488' },
};

/**
 * Extract class title from motor result preview.
 * Falls back to type name if no title found.
 */
function extractTitle(preview: string | null | undefined, motorType: string): string {
  if (!preview) return MOTOR_CONFIG[motorType]?.label || motorType;
  try {
    const parsed = JSON.parse(preview);
    // Try common title fields based on motor type
    if (parsed.titulo) return parsed.titulo;
    if (parsed.tema_clase) return parsed.tema_clase;
    if (parsed.tema) return parsed.tema;
    if (parsed.unidad_sintetizada?.temas_desarrollados?.[0]?.nombre) {
      return parsed.unidad_sintetizada.temas_desarrollados[0].nombre;
    }
    if (parsed.proyecto?.titulo) return parsed.proyecto.titulo;
    if (parsed.slides?.[0]?.titulo) return `Clase: ${parsed.slides[0].titulo}`;
    if (Array.isArray(parsed) && parsed[0]?.titulo) return `Tema: ${parsed[0].titulo}`;
    return MOTOR_CONFIG[motorType]?.label || motorType;
  } catch {
    return MOTOR_CONFIG[motorType]?.label || motorType;
  }
}

/**
 * Extract fidelity score from motor result preview if available.
 */
function extractFidelity(preview: string | null | undefined): number | null {
  if (!preview) return null;
  try {
    const parsed = JSON.parse(preview);
    if (typeof parsed.fidelity?.score === 'number') return parsed.fidelity.score;
    return null;
  } catch {
    return null;
  }
}

/**
 * Group motor results by "class" — a class is a unique (title) combination
 * representing a single teacher's planning session.
 */
function groupByClass(results: MotorResult[]) {
  const classes = new Map<string, {
    key: string;
    title: string;
    motors: MotorResult[];
    lastUpdate: string;
    avgFidelity: number | null;
  }>();

  results.forEach(r => {
    const title = extractTitle(r.result_json_preview, r.motor_type);
    // Group by normalized title
    const key = title.toLowerCase().slice(0, 50);
    if (!classes.has(key)) {
      classes.set(key, {
        key,
        title,
        motors: [],
        lastUpdate: r.created_at,
        avgFidelity: null,
      });
    }
    const cls = classes.get(key)!;
    cls.motors.push(r);
    if (new Date(r.created_at) > new Date(cls.lastUpdate)) {
      cls.lastUpdate = r.created_at;
    }
  });

  // Calculate average fidelity per class
  classes.forEach(cls => {
    const scores: number[] = [];
    cls.motors.forEach(m => {
      const score = extractFidelity(m.result_json_preview);
      if (score !== null) scores.push(score);
    });
    cls.avgFidelity = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;
  });

  // Sort by lastUpdate desc
  return Array.from(classes.values()).sort(
    (a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime()
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'hace un momento';
    if (diffMins < 60) return `hace ${diffMins} min`;
    if (diffHours < 24) return `hace ${diffHours} h`;
    if (diffDays === 1) return 'ayer';
    if (diffDays < 7) return `hace ${diffDays} días`;
    return d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });
  } catch {
    return dateStr;
  }
}

function StatCard({ icon, label, value, accent }: {
  icon: string;
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className={styles.statCard} style={accent ? { borderTop: `3px solid ${accent}` } : undefined}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

function ClassCard({ title, motors, lastUpdate, avgFidelity }: {
  title: string;
  motors: MotorResult[];
  lastUpdate: string;
  avgFidelity: number | null;
}) {
  // Get unique motor types in this class
  const motorTypes = Array.from(new Set(motors.map(m => m.motor_type)));
  const allReal = motors.every(m => !m.simulated);

  const fidelityColor = avgFidelity === null
    ? '#9CA3AF'
    : avgFidelity >= 90
      ? '#10B981'
      : avgFidelity >= 70
        ? '#F59E0B'
        : '#EF4444';

  return (
    <div className={styles.classCard}>
      <div className={styles.classCardHeader}>
        <h3 className={styles.classTitle}>{title}</h3>
        {avgFidelity !== null && (
          <div
            className={styles.fidelityBadge}
            style={{ background: fidelityColor }}
            title={`Fidelity promedio: ${avgFidelity}/100`}
          >
            {avgFidelity}
          </div>
        )}
      </div>

      <div className={styles.classMeta}>
        <span>🕒 {formatDate(lastUpdate)}</span>
        <span>·</span>
        <span>{motors.length} {motors.length === 1 ? 'motor' : 'motores'}</span>
        {!allReal && <span className={styles.simulatedTag}>vista previa</span>}
      </div>

      <div className={styles.motorChips}>
        {motorTypes.slice(0, 6).map(mt => {
          const cfg = MOTOR_CONFIG[mt];
          if (!cfg) return null;
          return (
            <span
              key={mt}
              className={styles.motorChip}
              style={{ background: cfg.color }}
              title={cfg.label}
            >
              {cfg.icon}
            </span>
          );
        })}
        {motorTypes.length > 6 && (
          <span className={styles.motorChipMore}>+{motorTypes.length - 6}</span>
        )}
      </div>

      <div className={styles.classActions}>
        <Link
          to={`/materiales?clase=${encodeURIComponent(title)}`}
          className={styles.actionBtn}
        >
          Abrir
        </Link>
        <Link
          to={`/slides?clase=${encodeURIComponent(title)}`}
          className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
        >
          Regenerar
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { showToast } = useToast();
  const [results, setResults] = useState<MotorResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'real' | 'preview'>('all');
  const [motorFilter, setMotorFilter] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const data = await fetchMotorHistory({ motor_type: motorFilter || undefined, limit: 100 });
        if (!cancelled) {
          setResults((data.data || []) as MotorResult[]);
        }
      } catch (err: any) {
        if (!cancelled) showToast?.('Error al cargar el dashboard', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [motorFilter, showToast]);

  const filteredResults = useMemo(() => {
    let r = results;
    if (filter === 'real') r = r.filter(x => !x.simulated);
    if (filter === 'preview') r = r.filter(x => x.simulated);
    return r;
  }, [results, filter]);

  const classes = useMemo(() => groupByClass(filteredResults), [filteredResults]);

  // Stats
  const stats = useMemo(() => {
    const totalClasses = classes.length;
    const totalOutputs = results.length;
    const avgFidelityAll = (() => {
      const scores: number[] = [];
      results.forEach(r => {
        const s = extractFidelity(r.result_json_preview);
        if (s !== null) scores.push(s);
      });
      return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    })();
    const realOutputs = results.filter(r => !r.simulated).length;
    const lastWeek = results.filter(r => {
      const d = new Date(r.created_at);
      const week = 7 * 24 * 60 * 60 * 1000;
      return Date.now() - d.getTime() < week;
    }).length;

    return { totalClasses, totalOutputs, avgFidelityAll, realOutputs, lastWeek };
  }, [results, classes]);

  return (
    <div className={styles.page}>
      {/* Hero header */}
      <header className={styles.hero}>
        <div>
          <h1 className={styles.heroTitle}>Mis clases</h1>
          <p className={styles.heroSubtitle}>
            Vista general de tus planificaciones y materiales generados
          </p>
        </div>
        <Link to="/wizard" className={styles.heroCTA}>
          ✨ Crear nueva clase
        </Link>
      </header>

      {/* Stats row */}
      <div className={styles.statsRow}>
        <StatCard icon="📚" label="Clases únicas" value={stats.totalClasses} />
        <StatCard icon="📊" label="Outputs generados" value={stats.totalOutputs} />
        <StatCard
          icon="✓"
          label="Fidelity promedio"
          value={stats.avgFidelityAll !== null ? `${stats.avgFidelityAll}/100` : '—'}
          accent={stats.avgFidelityAll !== null && stats.avgFidelityAll >= 90 ? '#10B981' : undefined}
        />
        <StatCard icon="🔥" label="Esta semana" value={stats.lastWeek} accent="#F59E0B" />
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Tipo:</span>
          <button
            className={`${styles.filterChip} ${filter === 'all' ? styles.filterChipActive : ''}`}
            onClick={() => setFilter('all')}
            type="button"
          >
            Todos ({results.length})
          </button>
          <button
            className={`${styles.filterChip} ${filter === 'real' ? styles.filterChipActive : ''}`}
            onClick={() => setFilter('real')}
            type="button"
          >
            <span style={{ color: '#10B981' }}>●</span> Reales ({stats.realOutputs})
          </button>
          <button
            className={`${styles.filterChip} ${filter === 'preview' ? styles.filterChipActive : ''}`}
            onClick={() => setFilter('preview')}
            type="button"
          >
            <span style={{ color: '#F59E0B' }}>●</span> Vista previa ({results.length - stats.realOutputs})
          </button>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="motor-filter-select" className={styles.filterLabel}>Motor:</label>
          <select
            id="motor-filter-select"
            className={styles.filterSelect}
            value={motorFilter}
            onChange={(e) => setMotorFilter(e.target.value)}
          >
            <option value="">Todos</option>
            {Object.entries(MOTOR_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Classes grid */}
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} aria-hidden="true" />
          <span>Cargando tus clases...</span>
        </div>
      ) : classes.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📭</div>
          <h2>Aún no tienes clases</h2>
          <p>Genera tu primera clase con PRIA para verla aquí.</p>
          <Link to="/wizard" className={styles.heroCTA}>
            ✨ Crear primera clase
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {classes.map(cls => (
            <ClassCard
              key={cls.key}
              title={cls.title}
              motors={cls.motors}
              lastUpdate={cls.lastUpdate}
              avgFidelity={cls.avgFidelity}
            />
          ))}
        </div>
      )}
    </div>
  );
}
