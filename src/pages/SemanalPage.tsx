import { useState, useMemo, useEffect, useCallback } from 'react';
import Header from '../components/Layout/Header';
import { getAdminUsers } from '../api/admin';
import { useCurriculum } from '../hooks/useCurriculum';
import type { ScheduleEntry, MotorType } from '../types';
import { useMultiPhaseGeneration } from '../hooks/useMultiPhaseGeneration';
import SemanalScheduleGrid from '../components/Semanal/SemanalScheduleGrid';
import SemanalGeneratorPanel from '../components/Semanal/SemanalGeneratorPanel';
import { mergePhaseResults } from '../lib/pptx/multiPhaseContent';
import { createMotorResult, updateMotorResult } from '../api/motores';
import type { MergedData } from '../components/SlideEditor/SlideEditorPanel';
import { useAuth } from '../context/AuthContext';
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
  const [showEditor, setShowEditor] = useState(false);
  const [teachers, setTeachers] = useState<{ code: string; name: string }[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [weekData, setWeekData] = useState<Record<string, ScheduleEntry[]>>({});
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [currentResultId, setCurrentResultId] = useState<number | null>(() => {
    try {
      const stored = sessionStorage.getItem('currentResultId');
      return stored ? Number(stored) : null;
    } catch {
      return null;
    }
  });

  const updateResultId = (id: number | null) => {
    setCurrentResultId(id);
    try {
      if (id !== null) sessionStorage.setItem('currentResultId', String(id));
      else sessionStorage.removeItem('currentResultId');
    } catch {
      // sessionStorage unavailable (SSR/private mode) — silently ignore
    }
  };

  const { curriculum: curriculumFromMaterials } = useCurriculum();
  const effectiveMotorType = activeMotorType || 'slides';
  const mpg = useMultiPhaseGeneration(effectiveMotorType);

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
    loadWeekSchedule(teacherCode);
  }, [teacherCode, loadWeekSchedule]);

  const handleDayAction = (day: string, action: string) => {
    const motorType = ACTION_MOTOR_MAP[action];
    if (!motorType) return;
    setActiveMotorType(motorType);
    setActiveDay(day);
    setActiveLabel(`${action} — ${day}`);
    setParams({
      tema: materia,
      materia: materia === 'Todas las materias' ? 'Matemáticas' : materia,
      nivel,
      grado,
      paginas,
      dia: day,
    });
  };

  const handleRunMultiPhase = async () => { await mpg.runMultiPhase(params); };
  const handleRegenerate = async () => { await mpg.regenerate(params); };
  const handleClearEditor = () => { setShowEditor(false); };

  const handleReset = () => {
    mpg.cancel();
    mpg.reset();
    setActiveMotorType(null);
    setActiveDay('');
    setActiveLabel('');
    setShowEditor(false);
  };

  const handleSave = useCallback(async (resultId: number, data: Record<string, unknown>) => {
    const jsonData = JSON.stringify(data);
    if (resultId && currentResultId) {
      await updateMotorResult(resultId, jsonData);
    } else {
      const created = await createMotorResult({
        motor_type: activeMotorType || 'slides',
        result_json: jsonData,
        simulated: mpg.simulated,
      });
      updateResultId(created.id);
    }
  }, [activeMotorType, currentResultId, mpg.simulated]);

  const mergedData = useMemo(() => {
    if (!mpg.allPhasesDone || !activeMotorType) return null;
    return mergePhaseResults(activeMotorType, mpg.results, params) as MergedData;
  }, [mpg.allPhasesDone, mpg.results, activeMotorType, params]);

  const currentPhaseDef = mpg.phaseDefs[mpg.currentPhase];

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
        isGenerating={mpg.isActive}
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
          showEditor={showEditor}
          currentResultId={currentResultId}
          mergedData={mergedData}
          currentPhaseDef={currentPhaseDef}
          mpg={mpg}
          onReset={handleReset}
          onRunMultiPhase={handleRunMultiPhase}
          onRegenerate={handleRegenerate}
          onClearEditor={handleClearEditor}
          onSave={handleSave}
          onParamsChange={(name, val) => setParams(p => ({ ...p, [name]: val }))}
        />
      )}
    </div>
  );
}