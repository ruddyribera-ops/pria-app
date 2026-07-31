import { useState, useMemo, useCallback, useEffect } from 'react';
import type { SlidesOutput } from '../../types/motor-types';
import {
  validateSlidesClient,
  applyBulkCorrection,
  type ClientFidelityWarning,
} from '../../lib/fidelity/client-validator';
import ImagePromptCard from '../Slides/ImagePromptCard';
import type { PromptVariation } from '../SlideEditor/types';
import { useSlideEditor } from '../../hooks/useSlideEditor';

const SIZE_LIMIT = 4_500_000; // 4.5MB safety margin (browsers cap at 5MB)

function saveSlides(jobKey: string, slides: unknown): { ok: boolean; reason?: 'size_limit_exceeded' | 'quota_exceeded' } {
  const storeData = JSON.stringify(slides);
  if (storeData.length > SIZE_LIMIT) {
    console.warn(`[InlineSlideEditor] Slides too large: ${(storeData.length / 1024 / 1024).toFixed(2)}MB`);
    return { ok: false, reason: 'size_limit_exceeded' };
  }
  try {
    localStorage.setItem(`pria-slides-edit-${jobKey}`, storeData);
    return { ok: true };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      console.warn('[InlineSlideEditor] localStorage quota exceeded');
      return { ok: false, reason: 'quota_exceeded' };
    }
    throw err;
  }
}

function normalizeSlides(result: SlidesOutput | null): SlidesOutput | null {
  // Runtime may deliver either the array directly or a wrapper
  // { output: SlideItem[], quality?: unknown } — extract the real array.
  if (!result) return null;
  if (Array.isArray(result)) return result;
  const wrapped = result as unknown as { output?: unknown };
  return Array.isArray(wrapped.output) ? (wrapped.output as SlidesOutput) : null;
}

interface Props {
  result: SlidesOutput | null;
  fullText?: string;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  /** Callback when quality is updated from the server after a save */
  onQualityUpdate?: (quality: unknown) => void;
}

/**
 * InlineSlideEditor — Edit slides without regenerating.
 * Real-time fidelity validation as user edits.
 * Debounced auto-save to backend + localStorage fallback.
 * Add/remove slides with type selector.
 */
export default function InlineSlideEditor({ result, fullText, showToast, onQualityUpdate }: Props) {
  // result may arrive as the array directly OR as a wrapper { output: [...], quality: {...} }
  // (runtime divergence from the declared SlidesOutput type). Normalize once.
  const slidesInput = normalizeSlides(result);
  const [editedSlides, setEditedSlides] = useState<SlidesOutput | null>(null);
  const [expandedSlide, setExpandedSlide] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [workflowDismissed, setWorkflowDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pria_image_workflow_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [showAddSlide, setShowAddSlide] = useState(false);

  // ── Slide editor hook (debounced auto-save, add/remove) ─────────────────────
  const {
    slides: serverSlides,
    status: saveStatus,
    error: saveError,
    updateSlide: hookUpdateSlide,
    addSlide,
    removeSlide,
    retrySave,
  } = useSlideEditor({
    initialSlides: editedSlides ?? slidesInput ?? [],
    onQualityUpdate,
    onSaveError: (msg) => showToast?.(`Error al guardar: ${msg}`, 'error'),
    onSaveSuccess: () => showToast?.('✓ Diapositivas actualizadas', 'success'),
  });

  // Sync from result prop (initial load or regeneration)
  useEffect(() => {
    if (slidesInput) {
      // Try to load edited version from localStorage
      const stored = localStorage.getItem(`pria-slides-edit-${getJobKey(slidesInput)}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setEditedSlides(parsed);
          showToast?.('✓ Cambios guardados restaurados', 'info');
          return;
        } catch {
          // fall through
        }
      }
      setEditedSlides(slidesInput);
      setIsDirty(false);
    }
  }, [slidesInput, showToast]);

  // Use server-synced slides when available, fall back to local edits
  const slidesToShow = serverSlides.length > 0 ? serverSlides : (editedSlides ?? slidesInput);

  // Real-time fidelity validation
  const fidelity = useMemo(() => {
    if (!fullText || fullText.length < 10 || !slidesToShow) return null;
    return validateSlidesClient(slidesToShow as any[], fullText);
  }, [slidesToShow, fullText]);

  // Build warnings map
  const warningsBySlide = useMemo(() => {
    const map = new Map<number, ClientFidelityWarning[]>();
    fidelity?.warnings?.forEach(w => {
      if (w.slide_number !== undefined) {
        const list = map.get(w.slide_number) || [];
        list.push(w);
        map.set(w.slide_number, list);
      }
    });
    return map;
  }, [fidelity]);

  const handleFieldEdit = useCallback((slideIndex: number, field: 'titulo' | 'texto_pantalla' | 'guion_docente' | 'callout', value: string) => {
    // Also update local state for immediate UI feedback
    setEditedSlides(prev => {
      if (!prev) return prev;
      return prev.map((s, i) => i === slideIndex ? { ...s, [field]: value } : s);
    });
    setIsDirty(true);
    // Trigger debounced auto-save via hook
    hookUpdateSlide(slideIndex, { [field]: value });
  }, [hookUpdateSlide]);

  const handleSave = useCallback(() => {
    if (!editedSlides) return;
    const jobKey = getJobKey(editedSlides);
    const saved = saveSlides(jobKey, editedSlides);
    if (!saved.ok) {
      showToast?.(
        saved.reason === 'size_limit_exceeded'
          ? 'Las diapositivas son demasiado grandes para guardar localmente.'
          : 'No se pudo guardar: almacenamiento local lleno.',
        'error',
      );
      return;
    }
    setIsDirty(false);
    setSavedAt(new Date());
    showToast?.('✓ Cambios guardados', 'success');
  }, [editedSlides, showToast]);

  const handleReset = useCallback(() => {
    if (!slidesInput) return;
    if (!window.confirm('¿Descartar todos los cambios y volver a la versión original?')) return;
    setEditedSlides(slidesInput);
    setIsDirty(false);
    const jobKey = getJobKey(slidesInput);
    localStorage.removeItem(`pria-slides-edit-${jobKey}`);
    showToast?.('✓ Cambios descartados', 'info');
  }, [slidesInput, showToast]);

  const handleBulkFix = useCallback((find: string, replace: string, label: string) => {
    if (!editedSlides) return;
    const corrected = applyBulkCorrection(editedSlides as any[], find, replace);
    setEditedSlides(corrected as SlidesOutput);
    setIsDirty(true);
    showToast?.(`✓ "${label}" aplicado a todas las slides`, 'success');
  }, [editedSlides, showToast]);

  const handleDismissWorkflow = useCallback(() => {
    setWorkflowDismissed(true);
    try {
      localStorage.setItem('pria_image_workflow_dismissed', 'true');
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Check if any slide has prompt variations
  const hasAnyPromptVariations = slidesToShow?.some((s: any) => s.prompt_imagen_variations?.length > 0);

  if (!slidesToShow) return null;

  return (
    <div style={{ borderTop: '1px solid #e6e6eb', padding: '1rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.75rem',
        gap: '0.5rem',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e1e2f' }}>
            ✏️ Editor inline
          </span>
          {fidelity && (
            <span style={{
              fontSize: '0.6875rem',
              padding: '0.125rem 0.5rem',
              borderRadius: '10px',
              fontWeight: 600,
              background: fidelity.total_flags === 0 ? '#D1FAE5' : '#FEF3C7',
              color: fidelity.total_flags === 0 ? '#065F46' : '#92400E',
              border: fidelity.total_flags === 0 ? '1px solid #6EE7B7' : '1px solid #FCD34D',
            }} data-testid="realtime-fidelity">
              {fidelity.total_flags === 0
                ? `✓ Fidelity ${fidelity.score}/100`
                : `⚠️ ${fidelity.total_flags} flagged`}
            </span>
          )}
          {/* Save status indicator */}
          {saveStatus === 'saving' && (
            <span style={{ fontSize: '0.6875rem', color: '#D97706', fontWeight: 600 }}>
              💾 Guardando...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span style={{ fontSize: '0.6875rem', color: '#059669' }}>
              ✅ Guardado
            </span>
          )}
          {saveStatus === 'error' && (
            <span style={{ fontSize: '0.6875rem', color: '#DC2626', fontWeight: 600 }} title={saveError ?? undefined}>
              ❌ Error {saveError ? `- ${saveError.slice(0, 30)}` : ''}
            </span>
          )}
          {isDirty && saveStatus === 'idle' && (
            <span style={{ fontSize: '0.6875rem', color: '#DC2626', fontWeight: 600 }}>
              ● Sin guardar
            </span>
          )}
          {savedAt && !isDirty && saveStatus === 'idle' && (
            <span style={{ fontSize: '0.6875rem', color: '#059669' }}>
              ✓ Guardado
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <button
            type="button"
            onClick={saveStatus === 'error' ? retrySave : handleSave}
            disabled={!isDirty && saveStatus !== 'error'}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '6px',
              border: 'none',
              background: saveStatus === 'error' ? '#DC2626' : (isDirty ? '#3A9E5E' : '#E5E7EB'),
              color: saveStatus === 'error' ? '#fff' : (isDirty ? '#fff' : '#9CA3AF'),
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: (isDirty || saveStatus === 'error') ? 'pointer' : 'not-allowed',
            }}
          >
            {saveStatus === 'error' ? '↻ Reintentar' : '💾 Guardar'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={!isDirty}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #E5E7EB',
              background: '#fff',
              color: isDirty ? '#6B7280' : '#D1D5DB',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: isDirty ? 'pointer' : 'not-allowed',
            }}
          >
            ↺ Reiniciar
          </button>
        </div>
      </div>

      {/* Workflow instructions banner */}
      {hasAnyPromptVariations && !workflowDismissed && (
        <div style={{
          background: '#EFF6FF',
          border: '1px solid #93C5FD',
          borderRadius: '6px',
          padding: '0.625rem 0.75rem',
          marginBottom: '0.75rem',
          fontSize: '0.6875rem',
          color: '#1E40AF',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.5rem',
        }}>
          <div style={{ fontSize: '1rem', flexShrink: 0 }}>💡</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
              Workflow para generar imágenes:
            </div>
            <div style={{ lineHeight: 1.5 }}>
              1. Click <strong>"Abrir en Bing"</strong> para ir a Bing Image Creator.
            </div>
            <div style={{ lineHeight: 1.5 }}>
              2. Pegá el prompt y generá la imagen.
            </div>
            <div style={{ lineHeight: 1.5 }}>
              3. Pegá la imagen de vuelta en PowerPoint.
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismissWorkflow}
            style={{
              padding: '0.125rem 0.375rem',
              background: 'transparent',
              border: '1px solid #93C5FD',
              borderRadius: '4px',
              fontSize: '0.5625rem',
              color: '#1E40AF',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            title="No mostrar de nuevo"
          >
            ✕
          </button>
        </div>
      )}

      {/* Bulk fix bar */}
      {fidelity && fidelity.warnings.length > 0 && (
        <div style={{
          background: '#FEF3C7',
          border: '1px solid #FCD34D',
          borderRadius: '6px',
          padding: '0.5rem 0.75rem',
          marginBottom: '0.75rem',
          fontSize: '0.75rem',
          color: '#92400E',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
            ⚡ Correcciones rápidas ({fidelity.warnings.length} alertas):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {Array.from(new Set(fidelity.warnings.map(w => w.flagged_text))).map(phrase => (
              <button
                key={phrase}
                type="button"
                onClick={() => handleBulkFix(phrase, '', `Eliminar "${phrase}"`)}
                style={{
                  padding: '0.25rem 0.625rem',
                  borderRadius: '4px',
                  border: '1px solid #F59E0B',
                  background: '#fff',
                  color: '#92400E',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                title={`Reemplazar "${phrase}" en todas las slides`}
              >
                ✕ Quitar "{phrase}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add slide button */}
      <div style={{ marginBottom: '0.75rem' }}>
        <button
          type="button"
          onClick={() => setShowAddSlide(true)}
          style={{
            padding: '0.375rem 0.75rem',
            borderRadius: '6px',
            border: '1px dashed #3A9E5E',
            background: '#F0FDF4',
            color: '#3A9E5E',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Agregar diapositiva
        </button>
      </div>

      {/* Add slide modal */}
      {showAddSlide && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '1.5rem',
            width: '320px',
            maxWidth: '90vw',
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#1e1e2f' }}>
              Nueva diapositiva
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {([
                ['portada', '🎨 Portada'],
                ['objetivos', '🎯 Objetivos'],
                ['concepto', '📖 Concepto'],
                ['ejemplo', '💡 Ejemplo'],
                ['practica', '✏️ Práctica'],
                ['pausa', '⏸️ Pausa'],
                ['cierre', '🏁 Cierre'],
              ] as const).map(([tipo, label]) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => {
                    addSlide(tipo);
                    setShowAddSlide(false);
                    showToast?.(`Nueva diapositiva "${label}" agregada`, 'success');
                  }}
                  style={{
                    padding: '0.625rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB',
                    background: '#fff',
                    color: '#1e1e2f',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowAddSlide(false)}
              style={{
                marginTop: '1rem',
                width: '100%',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #E5E7EB',
                background: '#fff',
                color: '#6B7280',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Slides editor */}
      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {slidesToShow.map((s, j) => {
          const slideNum = s.numero || j + 1;
          const warnings = warningsBySlide.get(slideNum);
          const hasFlag = warnings && warnings.length > 0;
          const isExpanded = expandedSlide === slideNum;

          return (
            <div
              key={`edit-${slideNum}`}
              style={{
                marginBottom: '0.5rem',
                borderRadius: '6px',
                background: hasFlag ? '#FEF2F2' : (j % 2 === 0 ? '#f9fafb' : '#fff'),
                borderLeft: hasFlag ? '3px solid #EF4444' : '3px solid transparent',
                border: hasFlag ? '1px solid #FECACA' : '1px solid #F3F4F6',
              }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedSlide(isExpanded ? null : slideNum)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpandedSlide(isExpanded ? null : slideNum);
                  }
                }}
                style={{
                  padding: '0.5rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <span style={{ fontWeight: 600, color: '#059669', minWidth: '28px' }}>
                  {s.numero}.
                </span>
                <span style={{ flex: 1, fontSize: '0.8125rem', fontWeight: 500 }}>
                  {s.titulo?.slice(0, 60) || 'Sin título'}
                </span>
                <span style={{ fontSize: '0.6875rem', color: '#6B7280' }}>
                  {s.tipo}
                </span>
                {hasFlag && (
                  <span style={{
                    fontSize: '0.6875rem',
                    background: '#FEE2E2',
                    color: '#991B1B',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '8px',
                    fontWeight: 600,
                  }}>
                    ⚠️ {warnings!.length}
                  </span>
                )}
                <span style={{
                  fontSize: '0.6875rem',
                  color: '#9CA3AF',
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}>
                  ▶
                </span>
              </div>
              {isExpanded && (
                <div style={{ padding: '0 0.75rem 0.75rem 0.75rem' }}>
                  {/* Slide header with remove button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.6875rem', color: '#6B7280', fontWeight: 600 }}>
                      Diapositiva {slideNum}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (slidesToShow.length <= 1) {
                          showToast?.('No se puede eliminar la última diapositiva.', 'warning');
                          return;
                        }
                        if (window.confirm(`¿Eliminar diapositiva ${slideNum}?`)) {
                          removeSlide(j);
                          showToast?.(`Diapositiva ${slideNum} eliminada`, 'success');
                        }
                      }}
                      title="Eliminar esta diapositiva"
                      style={{
                        padding: '0.125rem 0.5rem',
                        borderRadius: '4px',
                        border: '1px solid #FCA5A5',
                        background: '#FEF2F2',
                        color: '#DC2626',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      ✕ Eliminar
                    </button>
                  </div>
                  <FieldEditor
                    label="Título"
                    value={s.titulo || ''}
                    onChange={(v) => handleFieldEdit(j, 'titulo', v)}
                    multiline={false}
                  />
                  <FieldEditor
                    label="Texto en pantalla"
                    value={s.texto_pantalla || ''}
                    onChange={(v) => handleFieldEdit(j, 'texto_pantalla', v)}
                    multiline={true}
                    helpText="Lo que ve el estudiante en la diapositiva"
                  />
                  <FieldEditor
                    label="Guion del docente"
                    value={s.guion_docente || ''}
                    onChange={(v) => handleFieldEdit(j, 'guion_docente', v)}
                    multiline={true}
                    helpText="Lo que dices al explicar esta diapositiva"
                  />
                  {s.callout !== undefined && (
                    <FieldEditor
                      label="Callout"
                      value={s.callout || ''}
                      onChange={(v) => handleFieldEdit(j, 'callout', v)}
                      multiline={false}
                    />
                  )}

                  {/* Image prompt variations */}
                  {(s as any).prompt_imagen_variations?.length > 0 && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <div style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        color: '#1e1e2f',
                        marginBottom: '0.375rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                      }}>
                        🎨 Prompts para generar imágenes
                      </div>
                      <ImagePromptCard
                        variations={(s as any).prompt_imagen_variations as PromptVariation[]}
                        compact
                      />
                    </div>
                  )}

                  {hasFlag && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem',
                      background: '#FEE2E2',
                      borderRadius: '4px',
                      fontSize: '0.6875rem',
                    }}>
                      {warnings!.map((w, idx) => (
                        <div key={`warn-${idx}`} style={{ marginBottom: '0.25rem' }}>
                          <strong style={{ color: '#991B1B' }}>"{w.flagged_text}"</strong>
                          <span style={{ color: '#6B7280' }}> — {w.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FieldEditor({ label, value, onChange, multiline, helpText }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline: boolean;
  helpText?: string;
}) {
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <label style={{
        display: 'block',
        fontSize: '0.6875rem',
        fontWeight: 600,
        color: '#4B5563',
        marginBottom: '0.25rem',
      }}>
        {label}
        {helpText && (
          <span style={{ fontWeight: 400, color: '#9CA3AF', marginLeft: '0.5rem' }}>
            · {helpText}
          </span>
        )}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={Math.min(Math.max(value.split('\n').length + 1, 3), 8)}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #D1D5DB',
            borderRadius: '4px',
            fontSize: '0.8125rem',
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: '60px',
          }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #D1D5DB',
            borderRadius: '4px',
            fontSize: '0.8125rem',
          }}
        />
      )}
    </div>
  );
}

function getJobKey(slides: SlidesOutput): string {
  // Stable key based on first slide title (for localStorage keying)
  return slides[0]?.titulo?.slice(0, 30).replace(/[^a-z0-9]/gi, '_') || 'default';
}
