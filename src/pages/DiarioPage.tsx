import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Layout/Header';
import ProgressBar from '../components/UI/ProgressBar';
import LoadingSkeleton from '../components/UI/LoadingSkeleton';
import { getMockDaySchedule, getMockTeachers, getScheduleByDay } from '../api/schedule';
import { getEstadoSistema } from '../api/admin';
import type { ScheduleEntry } from '../types';

const DAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function formatDate(date: Date): string {
  return `📅 ${DAYS_ES[date.getDay()]}, ${date.getDate()} de ${MONTHS_ES[date.getMonth()]} de ${date.getFullYear()}`;
}

const DAY_NAME_MAP = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

function dateToDia(date: Date): string {
  // The API works with day names (LUNES, MARTES, etc.) not dates
  return DAY_NAME_MAP[date.getDay()];
}

export default function DiarioPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherCode, setTeacherCode] = useState(user?.teacher_code || 'ADMIN');
  const [progressInfo] = useState({ current: 33, total: 51 });
  const [estado, setEstado] = useState<Record<string, string> | null>(null);

  const loadSchedule = useCallback(async (code: string, date: Date) => {
    setLoading(true);
    try {
      const dia = dateToDia(date);
      const data = await getScheduleByDay(code, dia);
      setSchedule(data);
    } catch {
      setSchedule(getMockDaySchedule());
    }
    try {
      const sysEstado = await getEstadoSistema();
      setEstado(sysEstado as unknown as Record<string, string>);
    } catch {
      // ignore
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

  const teachers = getMockTeachers();

  return (
    <div>
      <Header title="📅 Diario" subtitle="Vista diaria de tu planificación académica" />

      {/* Date Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <button
          onClick={() => navigateDay(-1)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem',
            border: '1px solid #e6e6eb', borderRadius: '4px', background: '#fff',
            fontSize: '0.8125rem', fontWeight: 500, color: '#6b6b80', cursor: 'pointer',
          }}
        >
          ◀ Ayer
        </button>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e1e2f', minWidth: '200px', textAlign: 'center' }}>
          {formatDate(currentDate)}
        </span>
        <button
          onClick={() => navigateDay(1)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem',
            border: '1px solid #e6e6eb', borderRadius: '4px', background: '#fff',
            fontSize: '0.8125rem', fontWeight: 500, color: '#6b6b80', cursor: 'pointer',
          }}
        >
          Mañana ▶
        </button>
        <button
          onClick={goToday}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem',
            background: '#3A9E5E', color: '#fff', border: 'none', borderRadius: '4px',
            fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', marginLeft: 'auto',
          }}
        >
          📅 Hoy
        </button>
      </div>

      {/* Teacher Selector */}
      <div style={{ marginBottom: '1.25rem' }}>
        <select
          value={teacherCode}
          onChange={(e) => setTeacherCode(e.target.value)}
          style={{
            padding: '0.5rem 1rem', border: '1px solid #d4d4e0', borderRadius: '4px',
            background: '#f8f8ff', fontSize: '0.8125rem', minWidth: '250px', outline: 'none',
          }}
        >
          {teachers.map((t) => (
            <option key={t.code} value={t.code}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Section Title */}
      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '0.75rem' }}>
        Tu Ruta del Día
        <span style={{
          display: 'inline-block', background: 'rgba(92,106,196,0.08)', color: '#5c6ac4',
          fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '4px',
          fontWeight: 500, marginLeft: '0.5rem',
        }}>
          3er año · Secundaria
        </span>
      </div>

      {/* Schedule Table */}
      {loading ? (
        <LoadingSkeleton type="table" rows={6} />
      ) : (
        <table style={{
          width: '100%', borderCollapse: 'collapse', background: '#fff',
          border: '1px solid #e6e6eb', borderRadius: '8px', overflow: 'hidden',
        }}>
          <thead>
            <tr>
              {['HORA', 'MATERIA', 'GRADO', 'NIVEL', 'DOCENTE'].map((h) => (
                <th key={h} style={{
                  padding: '0.75rem 1rem', fontSize: '0.6875rem', fontWeight: 600,
                  color: '#6b6b80', textTransform: 'uppercase', letterSpacing: '0.04em',
                  textAlign: 'left', borderBottom: '2px solid #e6e6eb', background: '#fff',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedule.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#6b6b80', fontSize: '0.8125rem' }}>
                  No hay clases para este día
                </td>
              </tr>
            ) : (
              schedule.map((entry, i) => (
                <tr key={i} style={entry.tipo === 'recess' ? { background: '#fffbeb' } : undefined}>
                  <td style={{
                    padding: '0.75rem 1rem', fontSize: '0.8125rem', color: entry.tipo === 'recess' ? '#b45309' : '#1e1e2f',
                    borderBottom: '1px solid #e6e6eb', fontWeight: entry.tipo === 'recess' ? 500 : 400,
                    borderLeft: entry.tipo === 'recess' ? '3px solid #f59e0b' : 'none',
                  }}>
                    {entry.hora}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: entry.tipo === 'recess' ? '#b45309' : '#1e1e2f', borderBottom: '1px solid #e6e6eb' }}>
                    {entry.materia}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: entry.tipo === 'recess' ? '#b45309' : '#1e1e2f', borderBottom: '1px solid #e6e6eb' }}>
                    {entry.grado}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: entry.tipo === 'recess' ? '#b45309' : '#1e1e2f', borderBottom: '1px solid #e6e6eb' }}>
                    {entry.nivel}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: entry.tipo === 'recess' ? '#b45309' : '#1e1e2f', borderBottom: '1px solid #e6e6eb' }}>
                    {entry.docente}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Progress */}
      <ProgressBar current={progressInfo.current} total={progressInfo.total} />

      {/* Estado Motor */}
      {estado && (
        <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#6b6b80' }}>
          Estado motores: {Object.entries(estado).map(([k, v]) => `${k}: ${v}`).join(', ')}
        </div>
      )}
    </div>
  );
}
