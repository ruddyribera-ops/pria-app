import MotorResult from '../Materials/MotorResult';
import MotorButton from '../Materials/MotorButton';
import type { SynthesisOutput } from '../../types/motor-types';

interface Props {
  result: SynthesisOutput | null;
  loading: boolean;
  onGenerate?: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  curriculumPreview?: unknown;
}

export default function MotorSection_Synthesis({ result, curriculumPreview, loading, onGenerate, showToast }: Props) {
  if (!curriculumPreview || !result) return null;
  try {
    const s = result.unidad_sintetizada;
    if (!s || typeof s !== 'object') {
      return <MotorResult title="🧠 Síntesis Neuro-Inclusiva"><span style={{ color: '#6b6b80' }}>Síntesis generada — formato inesperado.</span></MotorResult>;
    }
    return (
      <>
        <MotorResult title="🧠 Síntesis Neuro-Inclusiva">
          <div style={{ fontSize: '0.8125rem', color: '#4a4a5a', marginBottom: '0.5rem' }}>
            <strong>Enfoque:</strong> {s?.enfoque_didactico || 'No especificado'}
          </div>
        </MotorResult>
        <div style={{ marginTop: '0.75rem' }}>
          <MotorButton
            label="🚀 Generar Proyecto ABP"
            loadingLabel="🚀 Generando proyecto ABP..."
            color="#2563EB"
            onClick={() => {
              if (!result) { showToast?.('Primero genera la síntesis.', 'warning'); return; }
              onGenerate?.();
            }}
            loading={loading}
          />
        </div>
      </>
    );
  } catch (e) {
    return <MotorResult title="🧠 Síntesis"><span style={{ color: '#c00' }}>Error: {String(e)}</span></MotorResult>;
  }
}
