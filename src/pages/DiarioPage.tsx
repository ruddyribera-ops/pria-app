import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Layout/Header';
import ProgressBar from '../components/UI/ProgressBar';
import LoadingSkeleton from '../components/UI/LoadingSkeleton';
import { getScheduleByDay } from '../api/schedule';
import { getAdminUsers } from '../api/admin';
import { useEstadoSistema } from '../hooks/useAdmin';
import type { ScheduleEntry } from '../types';
import styles from './DiarioPage.module.css';

const DAYS_ES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function formatDate(date: Date): string {
  return `📅 ${DAYS_ES[date.getDay()]}, ${date.getDate()} de ${MONTHS_ES[date.getMonth()]} de ${date.getFullYear()}`;
}

const DAY_NAME_MAP = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

function dateToDia(date: Date): string {
  return DAY_NAME_MAP[date.getDay()];
}

export default function DiarioPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherCode, setTeacherCode] = useState(user?.teacher_code || 'ADMIN');
  const [teachers, setTeachers] = useState<{code: string; name: string}[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [progressInfo] = useState({ current: 33, total: 51 });
  const { data: estadoData } = useEstadoSistema();

  // Load teachers list (docentes only)
  useEffect(() => {
    getAdminUsers()
      .then(users => {
        const docentes = (users as {teacher_code?: string; role?: string; nombre?: string}[])
          .filter(u => u.role === 'docente')
          .map(u => ({ code: u.teacher_code || '', name: u.nombre || u.teacher_code || 'Docente' }));
        setTeachers(docentes);
      })
      .catch(() => setTeachers([]))
      .finally(() => setTeachersLoading(false));
  }, []);

  const loadSchedule = useCallback(async (code: string, date: Date) => {
    setLoading(true);
    try {
      const dia = dateToDia(date);
      const data = await getScheduleByDay(code, dia);
      setSchedule(data);
    } catch {
      setSchedule([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSchedule(teacherCode, currentDate);
  }, [teacherCode, currentDate, loadSchedule]);

  const navigateDay = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const goToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div>
      <Header title="📅 Diario" subtitle="Vista diaria de tu planificación académica" />

      {/* Date Navigation */}
      <div className={styles.dateNav}>
        <button
          type="button"
          onClick={() => navigateDay(-1)}
          className={styles.navBtn}
          aria-label="Día anterior"
        >
          ◀ Ayer
        </button>
        <span className={styles.dateLabel} aria-live="polite">
          {formatDate(currentDate)}
        </span>
        <button
          type="button"
          onClick={() => navigateDay(1)}
          className={styles.navBtn}
          aria-label="Día siguiente"
        >
          Mañana ▶
        </button>
        <button
          type="button"
          onClick={goToday}
          className={`${styles.navBtn} ${styles.todayBtn}`}
        >
          📅 Hoy
        </button>
      </div>

      {/* Teacher Selector */}
      <div>
        <label htmlFor="teacher-select" className={styles.teacherLabel}>
          Docente:
        </label>
        <select
          id="teacher-select"
          value={teacherCode}
          onChange={(e) => setTeacherCode(e.target.value)}
          className={styles.teacherSelect}
          disabled={teachersLoading}
        >
          {teachersLoading ? (
            <option>Cargando...</option>
          ) : teachers.length === 0 ? (
            <option value={teacherCode}>{user?.nombre || user?.teacher_code || 'ADMIN'}</option>
          ) : (
            teachers.map((t) => (
              <option key={t.code} value={t.code}>{t.name} ({t.code})</option>
            ))
          )}
        </select>
      </div>

      <div className={styles.progressWrap}>
        <ProgressBar current={progressInfo.current} total={progressInfo.total} />
      </div>

      {/* Section Title */}
      <div className={styles.sectionTitle}>
        Tu Ruta del Día
        <span className={styles.sectionBadge}>
          3er año · Secundaria
        </span>
      </div>

      {/* Schedule Table */}
      {loading ? (
        <LoadingSkeleton type="table" rows={6} />
      ) : (
        <table className={styles.scheduleTable} aria-label="Horario del día">
          <thead>
            <tr>
              {['HORA', 'MATERIA', 'GRADO', 'NIVEL', 'DOCENTE'].map((h) => (
                <th key={h} className={styles.tableHead}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedule.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.emptyRow}>
                  No hay clases para este día
                </td>
              </tr>
            ) : (
              schedule.map((entry) => (
                <tr key={`${entry.hora}-${entry.materia}`} style={entry.tipo === 'recess' ? { background: '#fffbeb' } : undefined}>
                  <td className={`${styles.tableCell} ${entry.tipo === 'recess' ? styles.tableCellRecess : ''}`}>
                    {entry.hora}
                  </td>
                  <td className={`${styles.tableCell} ${entry.tipo === 'recess' ? styles.tableCellRecess : ''}`}>
                    {entry.materia}
                  </td>
                  <td className={`${styles.tableCell} ${entry.tipo === 'recess' ? styles.tableCellRecess : ''}`}>
                    {entry.grado}
                  </td>
                  <td className={`${styles.tableCell} ${entry.tipo === 'recess' ? styles.tableCellRecess : ''}`}>
                    {entry.nivel || ''}
                  </td>
                  <td className={`${styles.tableCell} ${entry.tipo === 'recess' ? styles.tableCellRecess : ''}`}>
                    {entry.docente || ''}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Estado Sistema indicator */}
      {estadoData && (
        <div className={styles.estadoIndicator}>
          📊 Estado: {Object.keys(estadoData.motors || {}).length} motores activos
        </div>
      )}
    </div>
  );
}