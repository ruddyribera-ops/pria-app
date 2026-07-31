import MotorSection_Export from '../Motores/MotorSection_Export';
import type { QualityScore } from '../Quality/QualityBadge';

interface Props {
  hasSlides: boolean;
  hasSynthesis: boolean;
  hasPlan: boolean;
  hasQuiz: boolean;
  slidesQuality: QualityScore | null | undefined;
  onExportAll: () => void;
  onExportSlides: () => void;
  onExportSynthesis: () => void;
  onExportPlan: () => void;
  onExportQuiz: () => void;
  onRegenerateSlides: () => void;
  regenerateSlidesLoading?: boolean;
}

export default function MaterialesExportPanel({
  hasSlides,
  hasSynthesis,
  hasPlan,
  hasQuiz,
  slidesQuality,
  onExportAll,
  onExportSlides,
  onExportSynthesis,
  onExportPlan,
  onExportQuiz,
  onRegenerateSlides,
  regenerateSlidesLoading,
}: Props) {
  return (
    <MotorSection_Export
      hasSlides={hasSlides}
      hasSynthesis={hasSynthesis}
      hasPlan={hasPlan}
      hasQuiz={hasQuiz}
      slidesQuality={slidesQuality}
      onExportAll={onExportAll}
      onExportSlides={onExportSlides}
      onExportSynthesis={onExportSynthesis}
      onExportPlan={onExportPlan}
      onExportQuiz={onExportQuiz}
      onRegenerateSlides={onRegenerateSlides}
      regenerateSlidesLoading={regenerateSlidesLoading}
    />
  );
}
