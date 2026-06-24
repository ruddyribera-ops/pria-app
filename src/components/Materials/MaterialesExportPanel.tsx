import MotorSection_Export from '../Motores/MotorSection_Export';

interface Props {
  hasSlides: boolean;
  hasSynthesis: boolean;
  hasPlan: boolean;
  hasQuiz: boolean;
  onExportAll: () => void;
  onExportSlides: () => void;
  onExportSynthesis: () => void;
  onExportPlan: () => void;
  onExportQuiz: () => void;
}

export default function MaterialesExportPanel({
  hasSlides,
  hasSynthesis,
  hasPlan,
  hasQuiz,
  onExportAll,
  onExportSlides,
  onExportSynthesis,
  onExportPlan,
  onExportQuiz,
}: Props) {
  return (
    <MotorSection_Export
      hasSlides={hasSlides}
      hasSynthesis={hasSynthesis}
      hasPlan={hasPlan}
      hasQuiz={hasQuiz}
      onExportAll={onExportAll}
      onExportSlides={onExportSlides}
      onExportSynthesis={onExportSynthesis}
      onExportPlan={onExportPlan}
      onExportQuiz={onExportQuiz}
    />
  );
}
