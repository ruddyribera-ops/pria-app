import { useState, useMemo } from 'react';
import Header from '../components/Layout/Header';
import { getMockWeekSchedule, DAYS } from '../api/schedule';
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

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '0.6875rem', fontWeight: 600, color: '#6b6b80',
  textTransform: 'uppercase', letterSpacing: '0.04em',
};

export default function SemanalPage() {
  const [nivel, setNivel] = useState('Secundaria');
  const [grado, setGrado] = useState('3er año');
  const [materia, setMateria] = useState('Todas las materias');
  const [paginas, setPaginas] = useState('45-62');

  // Multi-phase state
  const [activeMotorType, setActiveMotorType] = useState<MotorType | null>(null);
  const [activeDay, setActiveDay] = useState<string>('');
  const [activeLabel, setActiveLabel] = useState('');
  const [params, setParams] = useState<Record<string, unknown>>({});
  const [showEditor, setShowEditor] = useState(false);

  // Load curriculum from API (replaces localStorage)
  const { curriculum: curriculumFromMaterials } = useCurriculum();

  // Always create the hook with a valid motor type
  const effectiveMotorType = activeMotorType || 'slides';
  const mpg = useMultiPhaseGeneration(effectiveMotorType);

  const weekData = getMockWeekSchedule();

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

  const handleSubmit = async () => {
    await mpg.submit(params);
  };

  const handleRegenerate = async () => {
    await mpg.regenerate(params);
  };

  /** Merged data for editor */
  const mergedData = useMemo(() => {
    if (!mpg.allPhasesDone || !activeMotorType) return null;
    return mergePhaseResults(activeMotorType, mpg.results, params) as any;
  }, [mpg.allPhasesDone, mpg.results, activeMotorType, params]);

  const handleClearEditor = () => {
    setShowEditor(false);
  };

  const handleReset = () => {
    mpg.reset();
    setActiveMotorType(null);
    setActiveDay('');
    setActiveLabel('');
    setShowEditor(false);
  };

  const renderField = (field: PhaseField, val: unknown) => {
    const value = (val !== undefined && val !== '') ? val : field.default ?? '';

    if (field.type === 'select') {
      return (
        <select
          value={value as string}
          onChange={(e) => setParams(p => ({ ...p, [field.name]: e.target.value }))}
          disabled={mpg.isActive}
          style={{
            padding: '0.5rem 0.75rem', border: '1px solid #d4d4e0', borderRadius: '4px',
            fontSize: '0.8125rem', outline: 'none', background: '#f8f8ff', width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {(field.options || []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={value === true || value === 'true'}
            onChange={(e) => setParams(p => ({ ...p, [field.name]: e.target.checked }))}
            disabled={mpg.isActive}
            style={{ width: '18px', height: '18px', accentColor: '#3A9E5E' }}
          />
          <label style={{ fontSize: '0.8125rem', color: '#1e1e2f' }}>{field.label}</label>
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
          style={{
            padding: '0.5rem 0.75rem', border: '1px solid #d4d4e0', borderRadius: '4px',
            fontSize: '0.8125rem', outline: 'none', background: '#f8f8ff', width: '100%',
            minHeight: '80px', resize: 'vertical', boxSizing: 'border-box',
          }}
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
        style={{
          padding: '0.5rem 0.75rem', border: '1px solid #d4d4e0', borderRadius: '4px',
          fontSize: '0.8125rem', outline: 'none', background: '#f8f8ff', width: '100%',
          boxSizing: 'border-box',
        }}
      />
    );
  };

  const currentPhaseDef = mpg.phaseDefs[mpg.currentPhase];

  return (
    <div>
      <Header title="📅 Plan Semanal" subtitle="Planificación semanal por nivel, grado y materia" />

      {/* Hint banner when no active generation */}
      {!activeMotorType && (
        <div style={{
          padding: '0.75rem 1rem', background: '#f0fdf4', borderRadius: '8px',
          marginBottom: '1rem', fontSize: '0.75rem', color: '#166534',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {curriculumFromMaterials ? (
            <>
              <span>📋 <strong>{curriculumFromMaterials.unidad_real}</strong> — {curriculumFromMaterials.temas.length} tema(s) cargado(s): {curriculumFromMaterials.temas.slice(0, 3).join(', ')}{curriculumFromMaterials.temas.length > 3 ? '...' : ''}</span>
              <a href="/materiales" style={{ color: '#3A9E5E', fontWeight: 600, textDecoration: 'none' }}>Ver en Materiales →</a>
            </>
          ) : (
            <>
              <span>💡 Para generar contenido nuevo, ve a Materiales y usa los motores IA.</span>
              <a href="/materiales" style={{ color: '#3A9E5E', fontWeight: 600, textDecoration: 'none' }}>Ir a Materiales →</a>
            </>
          )}
        </div>
      )}

      {/* Filters */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem',
        background: '#fff', border: '1px solid #e6e6eb', borderRadius: '8px',
        padding: '1rem 1.25rem', alignItems: 'flex-end',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={LABEL_STYLE}>Nivel</label>
          <select value={nivel} onChange={(e) => setNivel(e.target.value)}
            disabled={mpg.isActive}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #d4d4e0', borderRadius: '4px', fontSize: '0.8125rem', outline: 'none', background: '#f8f8ff' }}>
            <option>Secundaria</option><option>Primaria</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={LABEL_STYLE}>Grado</label>
          <select value={grado} onChange={(e) => setGrado(e.target.value)}
            disabled={mpg.isActive}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #d4d4e0', borderRadius: '4px', fontSize: '0.8125rem', outline: 'none', background: '#f8f8ff' }}>
            <option>3er año</option><option>2do año</option><option>1er año</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={LABEL_STYLE}>Materia</label>
          <select value={materia} onChange={(e) => setMateria(e.target.value)}
            disabled={mpg.isActive}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #d4d4e0', borderRadius: '4px', fontSize: '0.8125rem', outline: 'none', background: '#f8f8ff' }}>
            <option>Todas las materias</option><option>Matemáticas</option><option>Lenguaje</option><option>Cs. Naturales</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={LABEL_STYLE}>Páginas del Libro</label>
          <input type="text" value={paginas} onChange={(e) => setPaginas(e.target.value)}
            disabled={mpg.isActive} placeholder="Ej: 45-62"
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #d4d4e0', borderRadius: '4px', fontSize: '0.8125rem', outline: 'none', background: '#f8f8ff' }} />
        </div>
      </div>

      {/* Week Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
        {DAYS.map((day) => {
          const dayEntries = weekData[day] || [];
          return (
            <div key={day} style={{
              background: '#fff', border: '1px solid #e6e6eb', borderRadius: '8px',
              padding: '1rem', minHeight: '220px',
            }}>
              <h4 style={{
                fontSize: '0.6875rem', fontWeight: 600, color: '#1e1e2f',
                textTransform: 'uppercase', letterSpacing: '0.04em',
                marginBottom: '0.5rem', paddingBottom: '0.5rem',
                borderBottom: '2px solid #e6e6eb', textAlign: 'center',
              }}>{DAY_LABELS[day] || day}</h4>
              {dayEntries.filter((e: ScheduleEntry) => e.tipo !== 'recess').map((entry: ScheduleEntry, i: number) => (
                <div key={i} style={{
                  padding: '0.5rem', marginBottom: '0.375rem', borderRadius: '4px',
                  fontSize: '0.6875rem', background: '#f8f8ff', borderLeft: '3px solid #3A9E5E',
                }}>
                  <div style={{ fontWeight: 600, color: '#1e1e2f' }}>{getMateriaIcon(entry.materia)} {entry.materia}</div>
                  <div style={{ fontSize: '0.625rem', color: '#6b6b80' }}>{entry.hora}</div>
                </div>
              ))}
              {dayEntries.length === 0 && (
                <div style={{ fontSize: '0.75rem', color: '#6b6b80', textAlign: 'center', padding: '1rem 0' }}>Sin clases</div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>
                {['📄 Plan', '🖼️ Diapositivas', '📋 Ficha', '📝 Quiz'].map((action, i) => (
                  <button key={i}
                    onClick={() => handleDayAction(day, action)}
                    disabled={mpg.isActive}
                    style={{
                      padding: '0.25rem 0.5rem', borderRadius: '4px',
                      border: '1px solid #e6e6eb', background: '#fff',
                      fontSize: '0.625rem', fontWeight: 500, color: mpg.isActive ? '#ccc' : '#6b6b80',
                      cursor: mpg.isActive ? 'not-allowed' : 'pointer',
                    }}>
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
        <div style={{
          marginTop: '1.5rem', background: '#fff', border: '1px solid #e6e6eb',
          borderRadius: '8px', padding: '1.25rem',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '1rem',
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b6b80' }}>
                Generación activa · {activeLabel}
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e1e2f' }}>
                {MOTOR_LABELS[activeMotorType]} en {mpg.totalPhases} fases
              </div>
            </div>
            <button onClick={handleReset}
              style={{
                padding: '0.375rem 0.75rem', border: '1px solid #e6e6eb', borderRadius: '4px',
                background: '#fff', fontSize: '0.75rem', cursor: 'pointer', color: '#6b6b80',
              }}>
              ✕ Cancelar
            </button>
          </div>

          {/* Phase Stepper */}
          <PhaseStepper
            phases={mpg.phaseDefs}
            currentPhase={mpg.currentPhase}
            phaseStatuses={mpg.phaseStatuses}
            allPhasesDone={mpg.allPhasesDone}
            onPhaseClick={(i) => { if (mpg.phaseStatuses[i] === 'done') mpg.goToPhase(i); }}
          />

          {/* Current phase form */}
          {!mpg.phaseStatuses[mpg.currentPhase]?.includes('done') && currentPhaseDef && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{
                fontSize: '0.75rem', color: '#6b6b80', marginBottom: '0.25rem',
              }}>
                {currentPhaseDef.subtitle}
              </div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e1e2f', margin: '0 0 0.25rem' }}>
                {currentPhaseDef.label}
              </h4>
              <p style={{ fontSize: '0.75rem', color: '#6b6b80', margin: '0 0 1rem' }}>
                {currentPhaseDef.description}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                {currentPhaseDef.fields.map(field => (
                  <div key={field.name}>
                    {field.type !== 'checkbox' && <label style={LABEL_STYLE}>{field.label}</label>}
                    <div style={{ marginTop: field.type !== 'checkbox' ? '0.25rem' : 0 }}>
                      {renderField(field, params[field.name])}
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={handleSubmit} disabled={mpg.isActive}
                style={{
                  padding: '0.6rem 1.5rem', background: mpg.isActive ? '#b3b3cc' : '#3A9E5E',
                  color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600,
                  fontSize: '0.875rem', cursor: mpg.isActive ? 'not-allowed' : 'pointer',
                }}>
                {mpg.isActive ? '⏳ Generando...' : `⚡ Generar ${currentPhaseDef.label}`}
              </button>
            </div>
          )}

          {/* Current phase result */}
          {mpg.phaseStatuses[mpg.currentPhase] === 'done' && mpg.currentResult && (
            <div style={{
              padding: '0.75rem', background: '#f0fdf4', borderRadius: '4px',
              border: '1px solid #bbf7d0', marginBottom: '0.75rem',
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534', marginBottom: '0.375rem' }}>
                ✅ {currentPhaseDef?.label} completado
              </div>
              <ResultPreview data={mpg.currentResult} />
            </div>
          )}

          {/* Phase Navigation */}
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

          {/* All phases done — show editor or prompt */}
          {mpg.allPhasesDone && mergedData && (
            <div style={{ marginTop: '1rem' }}>
              {!showEditor ? (
                <div style={{
                  padding: '1rem', background: '#f0fdf4',
                  border: '1px solid #bbf7d0', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#166534' }}>
                      🎉 {MOTOR_LABELS[activeMotorType]} completo
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b6b80' }}>
                      {mpg.totalPhases} fases generadas para {activeLabel}
                    </div>
                  </div>
                  <button onClick={() => setShowEditor(true)}
                    style={{
                      padding: '0.5rem 1rem', background: '#3A9E5E',
                      color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600,
                      fontSize: '0.8125rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                    }}>
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
