import { useState, useEffect, useCallback } from 'react';
import Header from '../components/Layout/Header';
import { getAdminUsers } from '../api/admin';
import { useCurriculum } from '../hooks/useCurriculum';
import type { ScheduleEntry, MotorType } from '../types';
import { useMotorGenerator } from '../hooks/useMotorGenerator';
import SemanalScheduleGrid from '../components/Semanal/SemanalScheduleGrid';
import SemanalGeneratorPanel from '../components/Semanal/SemanalGeneratorPanel';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/UI/Toast';
import styles from './SemanalPage.module.css';

const ACTION_MOTOR_MAP: Record<string, MotorType> = {
  '📄 Plan': 'plan',
  '🖼️ Diapositivas': 'slides',
  '📋 Ficha': 'ficha',
  '📝 Quiz': 'quiz',
};

export default function SemanalPage() {
  const { user } = useAuth();
  const [nivel, setNivel] = useState('Secundaria');
  const [grado, setGrado] = useState('3er año');
  const [materia, setMateria] = useState('Todas las materias');
  const [paginas, setPaginas] = useState('45-62');
  const [teacherCode, setTeacherCode] = useState(user?.teacher_code || 'ADMIN');
  const [activeMotorType, setActiveMotorType] = useState<MotorType | null>(null);
  const [activeDay, setActiveDay] = useState<string>('');
  const [activeLabel, setActiveLabel] = useState('');
  const [params, setParams] = useState<Record<string, unknown>>({});
  const [teachers, setTeachers] = useState<{ code: string; name: string }[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [weekData, setWeekData] = useState<Record<string, ScheduleEntry[]>>({});
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const { curriculum: curriculumFromMaterials } = useCurriculum();
  const effectiveMotorType = activeMotorType || 'slides';
  const { showToast } = useToast();
  const motorGenerator = useMotorGenerator(effectiveMotorType, showToast);

  // Load teachers list
  useEffect(() => {
    getAdminUsers()
      .then(users => {
        const docentes = ((users as { teacher_code?: string; role?: string; nombre?: string }[]) || [])
          .filter(u => u.role === 'docente')
          .map(u => ({ code: u.teacher_code || '', name: u.nombre || u.teacher_code || 'Docente' }));
        setTeachers(docentes);
        if (user?.teacher_code && docentes.some(d => d.code === user.teacher_code)) {
          setTeacherCode(user.teacher_code);
        }
      })
      .catch(() => setTeachers([]))
      .finally(() => setTeachersLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load schedule for all days when teacher changes
  const loadWeekSchedule = useCallback(async (tCode: string) => {
    setScheduleLoading(true);
    const results: Record<string, ScheduleEntry[]> = {};
    const DAYS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES'];
    const { getScheduleByDay } = await import('../api/schedule');
    await Promise.allSettled(
      DAYS.map(async (day) => {
        try {
          const blocks = await getScheduleByDay(tCode, day);
          results[day] = blocks;
        } catch {
          results[day] = [];
        }
      })
    );
    setWeekData(results);
    setScheduleLoading(false);
  }, []);

  useEffect(() => {
    // Schedule loading updates UI state asynchronously when the teacher changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWeekSchedule(teacherCode);
  }, [teacherCode, loadWeekSchedule]);

  const handleDayAction = (day: string, action: string) => {
    const motorType = ACTION_MOTOR_MAP[action];
    if (!motorType) return;
    const topic = materia === 'Todas las materias' ? 'Matemáticas' : materia;

    setActiveMotorType(motorType);
    setActiveDay(day);
    setActiveLabel(`${action} — ${day}`);
    setParams({
      tema: topic,
      tema_clase: topic,
      materia: topic,
      nivel,
      grado,
      grado_nivel: `${grado} ${nivel}`,
      paginas,
      dia: day,
      conceptos_clave: topic,
      palabras_clave: topic,
    });
  };

  const handleGenerate = async () => { await motorGenerator.generate(params); };
  const handleRegenerate = async () => { await motorGenerator.generate(params); };
  const handleReset = () => {
    setActiveMotorType(null);
    setActiveDay('');
    setActiveLabel('');
    setParams({});
  };

  return (
    <div>
      <Header title="📅 Plan Semanal" subtitle="Planificación semanal por nivel, grado y materia" />

      {/* Hint banner */}
      {!activeMotorType && (
        <div className={styles.hintBanner}>
          {curriculumFromMaterials ? (
            <>
              <span>📋 <strong>{curriculumFromMaterials.unidad_real}</strong> — {curriculumFromMaterials.temas.length} tema(s) cargado(s): {curriculumFromMaterials.temas.slice(0, 3).join(', ')}{curriculumFromMaterials.temas.length > 3 ? '...' : ''}</span>
              <a href="/materiales" className={styles.hintLink}>Ver en Materiales →</a>
            </>
          ) : (
            <>
              <span>💡 Para generar contenido nuevo, ve a Materiales y usa los motores IA.</span>
              <a href="/materiales" className={styles.hintLink}>Ir a Materiales →</a>
            </>
          )}
        </div>
      )}

      <SemanalScheduleGrid
        nivel={nivel}
        grado={grado}
        materia={materia}
        paginas={paginas}
        teacherCode={teacherCode}
        teachers={teachers}
        teachersLoading={teachersLoading}
        weekData={weekData}
        scheduleLoading={scheduleLoading}
        isGenerating={motorGenerator.loading}
        user={user}
        onNivelChange={setNivel}
        onGradoChange={setGrado}
        onMateriaChange={setMateria}
        onTeacherCodeChange={setTeacherCode}
        onPaginasChange={setPaginas}
        onDayAction={handleDayAction}
      />

      {activeMotorType && (
        <SemanalGeneratorPanel
          activeMotorType={activeMotorType}
          activeDay={activeDay}
          activeLabel={activeLabel}
          params={params}
          motorGenerator={motorGenerator}
          onReset={handleReset}
          onGenerate={handleGenerate}
          onRegenerate={handleRegenerate}
          onParamsChange={(name, val) => setParams(p => ({ ...p, [name]: val }))}
        />
      )}
    </div>
  );
}