import { useState, useMemo } from 'react';
import Header from '../components/Layout/Header';
import { DAYS } from '../api/schedule';
import { useCurriculum } from '../hooks/useCurriculum';
import type { ScheduleEntry } from '../types';
import { useMultiPhaseGeneration } from '../hooks/useMultiPhaseGeneration';
import type { MotorType } from '../hooks/useMotorGeneration';
import PhaseStepper from '../components/Motores/PhaseStepper';
import PhaseNavigation from '../components/Motores/PhaseNavigation';
import SlideEditorPanel from '../components/SlideEditor/SlideEditorPanel';
import ResultPreview from '../components/SlideEditor/ResultPreview';
import { mergePhaseResults } from '../lib/pptx/multiPhaseContent';
import type { PhaseField } from '../lib/pptx/phaseDefinitions';
import styles from './SemanalPage.module.css';

const DAY_LABELS: Record<string, string> = {
  LUNES: 'LUNES',
  MARTES: 'MARTES',
  MIÉRCOLES: 'MIÉRCOLES',
  JUEVES: 'JUEVES',
  VIERNES: 'VIERNES',
};

const ACTION_MOTOR_MAP: Record<string, MotorType> = {
  '📄 Plan': 'plan',
  '🖼️ Diapositivas': 'slides',
  '📋 Ficha': 'ficha',
  '📝 Quiz': 'quiz',
};

const MOTOR_LABELS: Record<MotorType, string> = {
  plan: 'Plan de Clase',
  slides: 'Diapositivas',
  ficha: 'Ficha Gamificada',
  quiz: 'Pop Quiz',
  synthesis: 'Síntesis',
  pdc: 'PDC',
  alpha2: '',
  abp: '',
  assessment: '',
  tutor: '',
  recalibrate: '',
  micro: '',
};

export default function SemanalPage() {
  const [nivel, setNivel] = useState('Secundaria');
  const [grado, setGrado] = useState('3er año');
  const [materia, setMateria] = useState('Todas las materias');
  const [paginas, setPaginas] = useState('45-62');
  const [activeMotorType, setActiveMotorType] = useState<MotorType | null>(null);
  const [activeDay, setActiveDay] = useState<string>('');
  const [activeLabel, setActiveLabel] = useState('');
  const [params, setParams] = useState<Record<string, unknown>>({});
  const [showEditor, setShowEditor] = useState(false);

  const { curriculum: curriculumFromMaterials } = useCurriculum();
  const effectiveMotorType = activeMotorType || 'slides';
  const mpg = useMultiPhaseGeneration(effectiveMotorType);

  const weekData: Record<string, any> = {};

  const getMateriaIcon = (name: string): string => {
    if (name.includes('Matemáticas')) return '📐';
    if (name.includes('Lenguaje')) return '📖';
    if (name.includes('Ciencias')) return '🔬';
    if (name.includes('Historia')) return '📜';
    if (name.includes('Educación')) return '⚽';
    return '📝';
  };

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

  const handleSubmit = async () => { await mpg.submit(params); };
  const handleRegenerate = async () => { await mpg.regenerate(params); };
  const handleClearEditor = () => { setShowEditor(false); };

  const handleReset = () => {
    mpg.reset();
    setActiveMotorType(null);
    setActiveDay('');
    setActiveLabel('');
    setShowEditor(false);
  };

  const mergedData = useMemo(() => {
    if (!mpg.allPhasesDone || !activeMotorType) return null;
    return mergePhaseResults(activeMotorType, mpg.results, params) as any;
  }, [mpg.allPhasesDone, mpg.results, activeMotorType, params]);

  const renderField = (field: PhaseField, val: unknown) => {
    const value = (val !== undefined && val !== '') ? val : field.default ?? '';

    if (field.type === 'select') {
      return (
        <select
          value={value as string}
          onChange={(e) => setParams(p => ({ ...p, [field.name]: e.target.value }))}
          disabled={mpg.isActive}
          className={styles.filterSelect}
          aria-label={field.label}
        >
          {(field.options || []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <div className={styles.checkboxField}>
          <input
            type="checkbox"
            id={`sem-field-${field.name}`}
            checked={value === true || value === 'true'}
            onChange={(e) => setParams(p => ({ ...p, [field.name]: e.target.checked }))}
            disabled={mpg.isActive}
            className={styles.checkboxInput}
            aria-label={field.label}
          />
          <label htmlFor={`sem-field-${field.name}`} className={styles.checkboxLabel}>{field.label}</label>
        </div>
      );
    }

    if (field.type === 'textarea') {
      return (
        <textarea
          value={value as string}
          onChange={(e) => setParams(p => ({ ...p, [field.name]: e.target.value }))}
          disabled={mpg.isActive}
          placeholder={field.placeholder}
          className={styles.textareaInput}
          aria-label={field.label}
        />
      );
    }

    return (
      <input
        type="text"
        value={value as string}
        onChange={(e) => setParams(p => ({ ...p, [field.name]: e.target.value }))}
        disabled={mpg.isActive}
        placeholder={field.placeholder}
        className={styles.filterInput}
        aria-label={field.label}
      />
    );
  };

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

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label htmlFor="sem-nivel" className={styles.filterLabel}>Nivel</label>
          <select id="sem-nivel" value={nivel} onChange={(e) => setNivel(e.target.value)} disabled={mpg.isActive} className={styles.filterSelect}>
            <option>Secundaria</option><option>Primaria</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="sem-grado" className={styles.filterLabel}>Grado</label>
          <select id="sem-grado" value={grado} onChange={(e) => setGrado(e.target.value)} disabled={mpg.isActive} className={styles.filterSelect}>
            <option>3er año</option><option>2do año</option><option>1er año</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="sem-materia" className={styles.filterLabel}>Materia</label>
          <select id="sem-materia" value={materia} onChange={(e) => setMateria(e.target.value)} disabled={mpg.isActive} className={styles.filterSelect}>
            <option>Todas las materias</option><option>Matemáticas</option><option>Lenguaje</option><option>Cs. Naturales</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="sem-paginas" className={styles.filterLabel}>Páginas del Libro</label>
          <input id="sem-paginas" type="text" value={paginas} onChange={(e) => setPaginas(e.target.value)} disabled={mpg.isActive} placeholder="Ej: 45-62" className={styles.filterInput} />
        </div>
      </div>

      {/* Week Grid */}
      <div className={styles.weekGrid}>
        {DAYS.map((day) => {
          const dayEntries = weekData[day] || [];
          return (
            <div key={day} className={styles.dayCard}>
              <h4 className={styles.dayTitle}>{DAY_LABELS[day] || day}</h4>
              {dayEntries.filter((e: ScheduleEntry) => e.tipo !== 'recess').map((entry: ScheduleEntry, i: number) => (
                <div key={i} className={styles.dayEntry}>
                  <div className={styles.entryMateria}>{getMateriaIcon(entry.materia)} {entry.materia}</div>
                  <div className={styles.entryHora}>{entry.hora}</div>
                </div>
              ))}
              {dayEntries.length === 0 && (
                <div className={styles.dayEmpty}>Sin clases</div>
              )}
              <div className={styles.dayActions}>
                {['📄 Plan', '🖼️ Diapositivas', '📋 Ficha', '📝 Quiz'].map((action, i) => (
                  <button
                    key={i}
                    onClick={() => handleDayAction(day, action)}
                    disabled={mpg.isActive}
                    className={styles.dayActionBtn}
                    aria-busy={mpg.isActive}
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

      {/* Multi-phase generation panel */}
      {activeMotorType && (
        <div className={styles.genPanel}>
          <div className={styles.genPanelHeader}>
            <div>
              <div className={styles.genPanelMeta}>Generación activa · {activeLabel}</div>
              <div className={styles.genPanelTitle}>{MOTOR_LABELS[activeMotorType]} en {mpg.totalPhases} fases</div>
            </div>
            <button onClick={handleReset} className={styles.cancelBtn} aria-label="Cancelar generación">
              ✕ Cancelar
            </button>
          </div>

          <PhaseStepper
            phases={mpg.phaseDefs}
            currentPhase={mpg.currentPhase}
            phaseStatuses={mpg.phaseStatuses}
            allPhasesDone={mpg.allPhasesDone}
            onPhaseClick={(i) => { if (mpg.phaseStatuses[i] === 'done') mpg.goToPhase(i); }}
          />

          {mpg.phaseStatuses[mpg.currentPhase] !== 'done' && currentPhaseDef && (
            <div>
              <div className={styles.phaseMetaInfo}>{currentPhaseDef.subtitle}</div>
              <h4 className={styles.phaseTitle}>{currentPhaseDef.label}</h4>
              <p className={styles.phaseDesc}>{currentPhaseDef.description}</p>

              <div className={styles.fieldList}>
                {currentPhaseDef.fields.map(field => (
                  <div key={field.name} className={styles.fieldItem}>
                    {field.type !== 'checkbox' && (
                      <label className={styles.filterLabel}>{field.label}</label>
                    )}
                    <div className={field.type !== 'checkbox' ? styles.fieldMarginTop : ''}>
                      {renderField(field, params[field.name])}
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={handleSubmit} disabled={mpg.isActive} className={styles.genSubmitBtn} aria-busy={mpg.isActive}>
                {mpg.isActive ? '⏳ Generando...' : `⚡ Generar ${currentPhaseDef.label}`}
              </button>
            </div>
          )}

          {mpg.phaseStatuses[mpg.currentPhase] === 'done' && mpg.currentResult && (
            <div className={styles.phaseResult}>
              <div className={styles.phaseResultTitle}>✅ {currentPhaseDef?.label} completado</div>
              <ResultPreview data={mpg.currentResult} />
            </div>
          )}

          <PhaseNavigation
            currentPhase={mpg.currentPhase}
            totalPhases={mpg.totalPhases}
            phaseStatus={mpg.phaseStatus}
            isFirst={mpg.currentPhase === 0}
            isLast={mpg.currentPhase >= mpg.totalPhases - 1}
            canGoNext={mpg.phaseStatus === 'done'}
            isActive={mpg.isActive}
            onPrev={mpg.prevPhase}
            onNext={mpg.nextPhase}
            onRegenerate={handleRegenerate}
            onReset={handleReset}
          />

          {mpg.allPhasesDone && mergedData && (
            <div>
              {!showEditor ? (
                <div className={styles.completeCard}>
                  <div>
                    <div className={styles.completeTitle}>🎉 {MOTOR_LABELS[activeMotorType]} completo</div>
                    <div className={styles.completeSubtitle}>{mpg.totalPhases} fases generadas para {activeLabel}</div>
                  </div>
                  <button onClick={() => setShowEditor(true)} className={styles.openEditorBtn}>
                    🎬 Abrir Editor Visual
                  </button>
                </div>
              ) : (
                <SlideEditorPanel
                  mergedData={mergedData}
                  typeLabel={MOTOR_LABELS[activeMotorType!]}
                  motorType={activeMotorType! as 'slides' | 'plan' | 'ficha' | 'quiz' | 'pdc' | 'synthesis'}
                  filenameExtra={activeDay}
                  onClear={handleClearEditor}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}