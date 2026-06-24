import MotorButton from '../Materials/MotorButton';
import type { CurriculumResult } from '../../lib/ingest/types';
import type { SynthesisOutput } from '../../types/motor-types';

interface Props {
  curriculumPreview?: CurriculumResult;
  synthesis?: SynthesisOutput | null;
  onGenerateSlides?: () => void;
  slidesLoading: boolean;
  onGenerateFicha?: () => void;
  fichaLoading: boolean;
}

export default function MotorButtonRow({ curriculumPreview, synthesis, onGenerateSlides, slidesLoading, onGenerateFicha, fichaLoading }: Props) {
  const hasTemas = curriculumPreview?.temas && curriculumPreview.temas.length > 0;
  const hasSynthesisTemas = synthesis?.unidad_sintetizada?.temas_desarrollados && synthesis.unidad_sintetizada.temas_desarrollados.length > 0;
  if (!hasTemas && !hasSynthesisTemas) return null;
  return (
    <div style={{ borderTop: '1px solid #e6e6eb', padding: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
      <MotorButton
        label="📖 Crear lección visual"
        loadingLabel="📖 Construyendo lección..."
        color="#059669"
        progressPhases={['Leyendo el tema', 'Diseñando 10 diapositivas', 'Añadiendo contexto cultural', 'Generando prompts de imagen']}
        onClick={() => onGenerateSlides?.()}
        loading={slidesLoading}
      />
      <MotorButton
        label="🎮 Diseñar ficha interactiva"
        loadingLabel="🎮 Diseñando ficha..."
        color="#DC2626"
        progressPhases={['Seleccionando competencias', 'Creando actividades lúdicas', 'Equilibrando dificultad']}
        onClick={() => onGenerateFicha?.()}
        loading={fichaLoading}
      />
    </div>
  );
}
