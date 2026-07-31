import { QualityGate } from '../Quality/QualityGate';
import type { QualityScore } from '../Quality/QualityBadge';

interface Props {
  hasSlides?: boolean;
  hasSynthesis?: boolean;
  hasPlan?: boolean;
  hasQuiz?: boolean;
  slidesQuality?: QualityScore | null;
  onExportAll?: () => void;
  onExportSlides?: () => void;
  onExportSynthesis?: () => void;
  onExportPlan?: () => void;
  onExportQuiz?: () => void;
  onRegenerateSlides?: () => void;
  regenerateSlidesLoading?: boolean;
}

export default function MotorSection_Export({
  hasSlides, hasSynthesis, hasPlan, hasQuiz,
  slidesQuality,
  onExportAll, onExportSlides, onExportSynthesis, onExportPlan, onExportQuiz,
  onRegenerateSlides, regenerateSlidesLoading,
}: Props) {
  if (!hasSlides && !hasSynthesis && !hasPlan && !hasQuiz) return null;
  return (
    <div style={{ borderTop: '2px solid #3A9E5E', marginTop: '1rem', padding: '1rem', background: '#f0fdf4' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b6b80', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Exportar a PPTX
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button type="button" onClick={onExportAll} style={{ padding: '0.5rem 1rem', background: '#1e1e2f', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
          📥 Exportar Todo (.pptx)
        </button>
        {hasSlides ? (
          <div style={{ minWidth: 200 }}>
            {slidesQuality !== undefined ? (
              <QualityGate
                quality={slidesQuality}
                onRegenerate={onRegenerateSlides ?? (() => {})}
                onDownload={onExportSlides ?? (() => {})}
                regenerateLoading={regenerateSlidesLoading}
              />
            ) : (
              <button type="button" onClick={onExportSlides} style={{ padding: '0.5rem 1rem', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
                Diapositivas
              </button>
            )}
          </div>
        ) : null}
        {hasSynthesis && (
          <button type="button" onClick={onExportSynthesis} style={{ padding: '0.5rem 1rem', background: '#3A9E5E', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
            Sintesis
          </button>
        )}
        {hasPlan && (
          <button type="button" onClick={onExportPlan} style={{ padding: '0.5rem 1rem', background: '#D97706', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
            Plan de Clase
          </button>
        )}
        {hasQuiz && (
          <button type="button" onClick={onExportQuiz} style={{ padding: '0.5rem 1rem', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
            Quiz
          </button>
        )}
      </div>
    </div>
  );
}
