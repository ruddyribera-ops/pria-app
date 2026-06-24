/**
 * SlideEditorPanel — Unified editor for ALL document types.
 *
 * 'slides' → visual slide carousel with click-to-edit + image upload.
 * plan/ficha/quiz/pdc/synthesis → DocumentEditor with click-to-edit on all text.
 *
 * Edits are tracked in a local map and applied when downloading PPTX.
 * With persistence: resultId + onSave enable saving edited content to the server.
 */

import { useCallback, useState, useMemo } from 'react';
import SlidePreview from './SlidePreview';
import SlideCarousel from './SlideCarousel';
import DocumentEditor from './DocumentEditor';
import { useSlideEditor } from './useSlideEditor';
import { applyEditsToDocument } from './documentMapper';
import { buildSlideDeck } from '../../lib/pptx/generator';
import type { SlideContent } from '../../lib/pptx/types';
import { getPalette } from '../../lib/pptx/designSystem';
import { useToast } from '../UI/Toast';

/** The shape produced by mergePhaseResults() */
export interface MergedData {
  title: string;
  subject: string;
  grade: string;
  bloomObjectives: string[];
  concepts: Array<{ title: string; description: string; icon: string }>;
  activities: Array<{ title: string; instructions?: string; questions?: Array<{ text: string; options?: string[] }> }>;
  copyBoxes: string[];
  paginas?: string;
  [key: string]: unknown;
}

interface SlideEditorPanelProps {
  mergedData: MergedData;
  typeLabel: string;
  filenameExtra?: string;
  motorType?: 'slides' | 'plan' | 'ficha' | 'quiz' | 'pdc' | 'synthesis';
  resultId?: number | null;
  onSave?: (resultId: number, data: MergedData) => Promise<void>;
  onClear?: () => void;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  plan: 'Plan de Clase',
  ficha: 'Ficha Gamificada',
  quiz: 'Pop Quiz',
  pdc: 'PDC Trimestral',
  synthesis: 'Síntesis',
};

export default function SlideEditorPanel({
  mergedData, typeLabel, filenameExtra, motorType = 'slides', resultId, onSave, onClear,
}: SlideEditorPanelProps) {
  const [downloading, setDownloading] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.6);
  // Document-mode edits (non-slide types)
  const [docEdits, setDocEdits] = useState<Record<string, string>>({});
  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { showToast } = useToast();

  const isSlides = motorType === 'slides';
  const palette = useMemo(() => getPalette(mergedData.subject || 'Matemáticas'), [mergedData.subject]);
  const docLabel = DOC_TYPE_LABELS[motorType] || typeLabel;

  // Slides-only: carousel editor
  const editor = useSlideEditor(isSlides ? mergedData : null);

  const hasEdits = isSlides ? editor.hasEdits : Object.keys(docEdits).length > 0;

  const handleUpdateDocText = useCallback((id: string, val: string) => {
    setDocEdits(prev => ({ ...prev, [id]: val }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!onSave || !resultId) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const finalData = isSlides
        ? editor.getEditedData()
        : applyEditsToDocument(mergedData, docEdits);
      await onSave(resultId, finalData);
      setLastSavedAt(new Date());
      showToast('✅ Cambios guardados', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      setSaveError(msg);
      showToast(`❌ ${msg}`, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [onSave, resultId, isSlides, editor, mergedData, docEdits, showToast]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const subject = mergedData.subject || 'Matemáticas';

      // Apply edits based on mode
      const finalData = isSlides
        ? editor.getEditedData()
        : applyEditsToDocument(mergedData, docEdits);

      const blob = await buildSlideDeck(finalData as unknown as SlideContent, subject);

      const safeTitle = (finalData.title || typeLabel)
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').slice(0, 30);
      const safeType = typeLabel.replace(/\s/g, '_');
      const extra = filenameExtra ? `_${filenameExtra}` : '';
      const filename = `${safeType}_${safeTitle}${extra}.pptx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      showToast(`✅ ${filename} descargado${hasEdits ? ' con ediciones' : ''}`, 'success');
    } catch (err) {
      console.error('Error generating PPTX:', err);
      showToast('Error al generar PPTX', 'error');
    }
    setDownloading(false);
  }, [editor, mergedData, docEdits, typeLabel, filenameExtra, isSlides, hasEdits, showToast]);

  const resetAll = useCallback(() => {
    if (isSlides) {
      editor.resetEdits();
    } else {
      setDocEdits({});
    }
    onClear?.();
  }, [editor, isSlides, onClear]);

  const zoomIn = () => setPreviewScale(s => Math.min(s + 0.1, 1.2));
  const zoomOut = () => setPreviewScale(s => Math.max(s - 0.1, 0.3));

  return (
    <div style={{
      border: '1px solid #d4d4d0',
      borderRadius: '8px',
      background: '#fff',
      overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        borderBottom: '1px solid #e6e6eb',
        background: '#fafafe',
      }}>
        <div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e1e2f' }}>
            🎬 {isSlides ? 'Editor Visual de Slides' : `Editor: ${docLabel}`}
          </div>
          <div style={{ fontSize: '0.6875rem', color: '#6b6b80' }}>
            {isSlides
              ? `${editor.totalSlides} slides · Click para editar${hasEdits ? ' · ✏️' : ''}`
              : `Click en cualquier texto para editarlo${hasEdits ? ' · ✏️ Con ediciones' : ''}`}
          </div>
        </div>

        {isSlides && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <button type="button" onClick={zoomOut} title="Alejar" style={{
              padding: '0.25rem 0.5rem', border: '1px solid #d4d4e0',
              borderRadius: '4px', background: '#fff', fontSize: '0.75rem',
              cursor: 'pointer', color: '#6b6b80',
            }}>−</button>
            <span style={{ fontSize: '0.6875rem', color: '#6b6b80', minWidth: '2.5rem', textAlign: 'center' }}>
              {Math.round(previewScale * 100)}%
            </span>
            <button type="button" onClick={zoomIn} title="Acercar" style={{
              padding: '0.25rem 0.5rem', border: '1px solid #d4d4e0',
              borderRadius: '4px', background: '#fff', fontSize: '0.75rem',
              cursor: 'pointer', color: '#6b6b80',
            }}>+</button>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {isSlides ? (
        <>
          {editor.currentSlide ? (
            <>
              <div style={{
                padding: '1rem', display: 'flex', justifyContent: 'center',
                background: '#f5f5f7', minHeight: '300px', overflow: 'auto',
              }}>
                <div style={{ transform: `scale(${previewScale})`, transformOrigin: 'top center' }}>
                  <SlidePreview
                    slide={editor.currentSlide}
                    palette={editor.palette}
                    scale={1}
                    edits={{}}
                    images={{}}
                    onUpdateText={editor.updateText}
                    onSetImage={editor.setImage}
                  />
                </div>
              </div>
              <div style={{ padding: '0 1rem' }}>
                <SlideCarousel
                  slides={editor.slides}
                  currentIndex={editor.currentIndex}
                  onGoTo={editor.goTo}
                  onPrev={editor.prev}
                  onNext={editor.next}
                />
              </div>
            </>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#b0b0c4', fontSize: '0.8125rem' }}>
              No hay slides para mostrar.
            </div>
          )}
        </>
      ) : (
        /* Document mode — editable for ALL non-slide types */
        <DocumentEditor
          mergedData={mergedData}
          palette={palette}
          edits={docEdits}
          onUpdateText={handleUpdateDocText}
        />
      )}

      {/* ── Action Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        borderTop: '1px solid #e6e6eb',
        background: '#fafafe',
      }}>
        <div style={{ fontSize: '0.6875rem', color: '#6b6b80', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          {hasEdits
            ? '✏️ Ediciones incluidas en el PPTX'
            : isSlides
              ? '💡 Haz click en cualquier texto para editarlo'
              : '💡 Haz click en cualquier texto para editarlo'}
          {lastSavedAt && (
            <span style={{ color: '#3A9E5E' }}>Guardado a las {lastSavedAt.toLocaleTimeString()}</span>
          )}
          {saveError && (
            <span style={{ color: '#e53e3e' }}>{saveError}</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {hasEdits && (
            <button type="button" onClick={resetAll} style={{
              padding: '0.5rem 0.75rem', border: '1px solid #e6e6eb',
              borderRadius: '4px', background: '#fff',
              fontSize: '0.75rem', cursor: 'pointer', color: '#6b6b80',
            }}>
              ↺ Deshacer ediciones
            </button>
          )}
          {onSave && (
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasEdits || isSaving || !resultId}
              style={{
                padding: '0.5rem 1rem',
                background: !hasEdits || isSaving ? '#b3b3cc' : '#2563eb',
                color: '#fff', border: 'none', borderRadius: '4px',
                fontWeight: 600, fontSize: '0.8125rem',
                cursor: !hasEdits || isSaving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.375rem',
              }}
            >
              {isSaving ? '⏳ Guardando...' : '💾 Guardar'}
            </button>
          )}
          <button type="button" onClick={handleDownload} disabled={downloading} style={{
            padding: '0.5rem 1.25rem',
            background: downloading ? '#b3b3cc' : '#3A9E5E',
            color: '#fff', border: 'none', borderRadius: '4px',
            fontWeight: 600, fontSize: '0.8125rem',
            cursor: downloading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.375rem',
          }}>
            {downloading ? '⏳' : '⬇️'} {downloading ? 'Generando PPTX...' : 'Descargar PPTX'}
          </button>
        </div>
      </div>
    </div>
  );
}
