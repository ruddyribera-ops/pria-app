import MotorButton from '../Materials/MotorButton';

interface Props {
  curriculumPreview?: any;
  onGenerateSlides?: () => void;
  slidesLoading: boolean;
  onGenerateFicha?: () => void;
  fichaLoading: boolean;
}

export default function MotorButtonRow({ curriculumPreview, onGenerateSlides, slidesLoading, onGenerateFicha, fichaLoading }: Props) {
  if (!curriculumPreview || !curriculumPreview.temas || curriculumPreview.temas.length === 0) return null;
  return (
    <div style={{ borderTop: '1px solid #e6e6eb', padding: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
      <MotorButton label="🖼️ Generar Diapositivas" loadingLabel="🖼️ Generando..." color="#059669" onClick={() => onGenerateSlides?.()} loading={slidesLoading} />
      <MotorButton label="🎮 Generar Ficha Gamificada" loadingLabel="🎮 Generando..." color="#DC2626" onClick={() => onGenerateFicha?.()} loading={fichaLoading} />
    </div>
  );
}
