import type { ScheduleEntry } from '../../types';
import { DAYS } from '../../api/schedule';
import styles from '../../styles/SemanalCommon.module.css';

const DAY_LABELS: Record<string, string> = {
  LUNES: 'LUNES',
  MARTES: 'MARTES',
  MIÉRCOLES: 'MIÉRCOLES',
  JUEVES: 'JUEVES',
  VIERNES: 'VIERNES',
};

interface Props {
  nivel: string;
  grado: string;
  materia: string;
  paginas: string;
  teacherCode: string;
  teachers: { code: string; name: string }[];
  teachersLoading: boolean;
  weekData: Record<string, ScheduleEntry[]>;
  scheduleLoading: boolean;
  isGenerating: boolean;
  user: { teacher_code?: string; nombre?: string } | null;
  onNivelChange: (v: string) => void;
  onGradoChange: (v: string) => void;
  onMateriaChange: (v: string) => void;
  onTeacherCodeChange: (v: string) => void;
  onPaginasChange: (v: string) => void;
  onDayAction: (day: string, action: string) => void;
}

export default function SemanalScheduleGrid({
  nivel, grado, materia, paginas, teacherCode,
  teachers, teachersLoading, weekData, scheduleLoading,
  isGenerating, user, onNivelChange, onGradoChange,
  onMateriaChange, onTeacherCodeChange, onPaginasChange, onDayAction,
}: Props) {
  const getMateriaIcon = (name: string): string => {
    if (name.includes('Matemáticas')) return '📐';
    if (name.includes('Lenguaje')) return '📖';
    if (name.includes('Ciencias')) return '🔬';
    if (name.includes('Historia')) return '📜';
    if (name.includes('Educación')) return '⚽';
    return '📝';
  };

  return (
    <>
      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label htmlFor="sem-nivel" className={styles.filterLabel}>Nivel</label>
          <select
            id="sem-nivel"
            value={nivel}
            onChange={(e) => onNivelChange(e.target.value)}
            disabled={isGenerating}
            className={styles.filterSelect}
          >
            <option>Secundaria</option><option>Primaria</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="sem-grado" className={styles.filterLabel}>Grado</label>
          <select
            id="sem-grado"
            value={grado}
            onChange={(e) => onGradoChange(e.target.value)}
            disabled={isGenerating}
            className={styles.filterSelect}
          >
            <option>3er año</option><option>2do año</option><option>1er año</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="sem-materia" className={styles.filterLabel}>Materia</label>
          <select
            id="sem-materia"
            value={materia}
            onChange={(e) => onMateriaChange(e.target.value)}
            disabled={isGenerating}
            className={styles.filterSelect}
          >
            <option>Todas las materias</option><option>Matemáticas</option><option>Lenguaje</option><option>Cs. Naturales</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="sem-teacher" className={styles.filterLabel}>Docente</label>
          <select
            id="sem-teacher"
            value={teacherCode}
            onChange={(e) => onTeacherCodeChange(e.target.value)}
            disabled={isGenerating || teachersLoading}
            className={styles.filterSelect}
          >
            {teachersLoading ? (
              <option>Cargando docentes...</option>
            ) : teachers.length === 0 ? (
              <option value={teacherCode}>{user?.nombre || teacherCode}</option>
            ) : (
              teachers.map((t) => (
                <option key={t.code} value={t.code}>{t.name} ({t.code})</option>
              ))
            )}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="sem-paginas" className={styles.filterLabel}>Paginas del Libro</label>
          <input
            id="sem-paginas"
            type="text"
            value={paginas}
            onChange={(e) => onPaginasChange(e.target.value)}
            disabled={isGenerating}
            placeholder="Ej: 45-62"
            className={styles.filterInput}
          />
        </div>
      </div>

      {/* Schedule Loading */}
      {scheduleLoading && (
        <div style={{ textAlign: 'center', padding: '1rem', color: '#6b6b80', fontSize: '0.875rem' }}>
          Cargando horarios...
        </div>
      )}

      {/* Week Grid */}
      <div className={styles.weekGrid}>
        {DAYS.map((day) => {
          const dayEntries = weekData[day] || [];
          return (
            <div key={day} className={styles.dayCard}>
              <h4 className={styles.dayTitle}>{DAY_LABELS[day] || day}</h4>
              {dayEntries.filter((e: ScheduleEntry) => e.tipo !== 'recess').map((entry: ScheduleEntry) => (
                <div key={`${day}-${entry.hora}-${entry.materia}`} className={styles.dayEntry}>
                  <div className={styles.entryMateria}>{getMateriaIcon(entry.materia)} {entry.materia}</div>
                  <div className={styles.entryHora}>{entry.hora}</div>
                </div>
              ))}
              {dayEntries.length === 0 && !scheduleLoading && (
                <div className={styles.dayEmpty}>Sin clases</div>
              )}
              <div className={styles.dayActions}>
                {['📄 Plan', '🖼️ Diapositivas', '📋 Ficha', '📝 Quiz'].map((action) => (
                  <button
                    key={`${day}-${action}`}
                    type="button"
                    onClick={() => onDayAction(day, action)}
                    disabled={isGenerating}
                    className={styles.dayActionBtn}
                    aria-busy={isGenerating}
                    aria-label={`Generar ${action.replace('📄 ', '').replace('🖼️ ', '').replace('📋 ', '').replace('📝 ', '')} para ${day}`}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}