import type { MotorType } from '../../types';
import { getPhaseDefs } from '../../lib/pptx/phaseDefinitions';
import type { PhaseDef } from '../../lib/pptx/phaseDefinitions';
import PhaseFieldRenderer from '../Motores/PhaseFieldRenderer';
import ResultPreview from '../SlideEditor/ResultPreview';
import styles from '../../styles/SemanalCommon.module.css';

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

export interface SemanalMotorGenerator {
  result: unknown;
  loading: boolean;
  error: string | null;
  simulated: boolean;
}

interface Props {
  activeMotorType: MotorType | null;
  activeDay: string;
  activeLabel: string;
  params: Record<string, unknown>;
  motorGenerator: SemanalMotorGenerator;
  onReset: () => void;
  onGenerate: () => void | Promise<void>;
  onRegenerate: () => void | Promise<void>;
  onParamsChange: (name: string, val: unknown) => void;
}

function PhaseFields({
  phase,
  params,
  disabled,
  onParamsChange,
}: {
  phase: PhaseDef;
  params: Record<string, unknown>;
  disabled: boolean;
  onParamsChange: (name: string, val: unknown) => void;
}) {
  return (
    <section>
      <div className={styles.phaseMetaInfo}>{phase.subtitle}</div>
      <h4 className={styles.phaseTitle}>{phase.label}</h4>
      <p className={styles.phaseDesc}>{phase.description}</p>

      <div className={styles.fieldList}>
        {phase.fields.map(field => (
          <div key={`${phase.id}-${field.name}`} className={styles.fieldItem}>
            {field.type !== 'checkbox' && (
              <span className={styles.filterLabel}>{field.label}</span>
            )}
            <div className={field.type !== 'checkbox' ? styles.fieldMarginTop : ''}>
              <PhaseFieldRenderer
                field={field}
                value={params[field.name]}
                onChange={onParamsChange}
                disabled={disabled}
                idPrefix={phase.id}
                textClass={styles.filterInput}
                selectClass={styles.filterSelect}
                textareaClass={styles.textareaInput}
                checkboxFieldClass={styles.checkboxField}
                checkboxInputClass={styles.checkboxInput}
                checkboxLabelClass={styles.checkboxLabel}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function SemanalGeneratorPanel({
  activeMotorType,
  activeDay,
  activeLabel,
  params,
  motorGenerator,
  onReset,
  onGenerate,
  onRegenerate,
  onParamsChange,
}: Props) {
  const motorLabel = MOTOR_LABELS[activeMotorType ?? 'slides'];
  const phases = activeMotorType ? getPhaseDefs(activeMotorType) : [];

  return (
    <div className={styles.genPanel}>
      <div className={styles.genPanelHeader}>
        <div>
          <div className={styles.genPanelMeta}>Generación activa · {activeLabel}</div>
          <div className={styles.genPanelTitle}>{motorLabel} · generación directa</div>
        </div>
        <button onClick={onReset} className={styles.cancelBtn} type="button" aria-label="Cancelar generación">
          ✕ Cancelar
        </button>
      </div>

      <div className={styles.phaseMetaInfo}>
        {phases.length} bloque{phases.length === 1 ? '' : 's'} de configuración para {activeDay}
      </div>

      {phases.map(phase => (
        <PhaseFields
          key={phase.id}
          phase={phase}
          params={params}
          disabled={motorGenerator.loading}
          onParamsChange={onParamsChange}
        />
      ))}

      <button
        onClick={() => { void onGenerate(); }}
        disabled={motorGenerator.loading}
        className={styles.genSubmitBtn}
        type="button"
        aria-busy={motorGenerator.loading}
      >
        {motorGenerator.loading ? '⏳ Generando...' : `⚡ Generar ${motorLabel}`}
      </button>

      {motorGenerator.error && (
        <div role="alert" style={{ marginTop: '0.75rem', color: '#b42318' }}>
          {motorGenerator.error}
        </div>
      )}

      {motorGenerator.result !== null && (
        <div className={styles.phaseResult}>
          <div className={styles.phaseResultTitle}>✅ {motorLabel} generado</div>
          {motorGenerator.simulated && (
            <div style={{
              marginBottom: '0.75rem',
              padding: '0.5rem 0.75rem',
              background: '#FFF3CD',
              border: '1px solid #FFC107',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: '#856404',
            }}>
              ⚠️ Generado con datos simulados (la IA no respondió). Vuelve a intentar o contacta soporte.
            </div>
          )}
          <ResultPreview data={motorGenerator.result} />
          <button
            onClick={() => { void onRegenerate(); }}
            disabled={motorGenerator.loading}
            type="button"
            style={{ marginTop: '0.75rem' }}
          >
            🔄 Regenerar
          </button>
        </div>
      )}
    </div>
  );
}
