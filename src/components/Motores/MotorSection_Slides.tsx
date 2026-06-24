import { useState } from 'react';
import type { SlidesOutput } from '../../types/motor-types';
import type { FidelityReport, FidelityWarning } from '../../lib/ai/minimaxClient';

interface Props {
  result: SlidesOutput | null;
  fidelity?: FidelityReport | null;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

interface PromptVariation {
  estilo: string;
  prompt: string;
  herramienta_recomendada: string;
}

export default function MotorSection_Slides({ result, fidelity, showToast }: Props) {
  const [expandedSlide, setExpandedSlide] = useState<number | null>(null);

  if (!result) return null;

  // Build a map of slide_number -> warnings for quick lookup
  const warningsBySlide = new Map<number, FidelityWarning[]>();
  fidelity?.warnings?.forEach(w => {
    if (w.slide_number !== undefined) {
      const list = warningsBySlide.get(w.slide_number) || [];
      list.push(w);
      warningsBySlide.set(w.slide_number, list);
    }
  });

  const flaggedCount = warningsBySlide.size;
  const totalFlags = fidelity?.total_flags || 0;
  const score = fidelity?.score ?? null;

  // Count total prompt variations across all slides
  const totalVariations = (result as any[]).reduce((sum: number, s: any) =>
    sum + (s.prompt_imagen_variations?.length || 0), 0);

  // ── Copy prompts to clipboard ──
  const handleCopyPrompts = async () => {
    const lines: string[] = [
      `🎨 PROMPTS PARA GENERAR IMÁNGENES — ${result.length} diapositivas`,
      `Total prompts optimizados: ${totalVariations}`,
      '',
    ];

    (result as any[]).forEach((s: any) => {
      if (!s.prompt_imagen_variations || s.prompt_imagen_variations.length === 0) return;
      lines.push(`═══ Slide ${s.numero}: ${s.titulo} ═══`);
      s.prompt_imagen_variations.forEach((v: PromptVariation, idx: number) => {
        lines.push(`\n[Variante ${idx + 1}] Estilo: ${v.estilo} · Herramienta: ${v.herramienta_recomendada}`);
        lines.push(v.prompt);
        if (s.alt_text) lines.push(`Alt-text: ${s.alt_text}`);
      });
      lines.push('');
    });

    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      showToast?.(`✓ ${totalVariations} prompts copiados al portapapeles`, 'success');
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        showToast?.(`✓ ${totalVariations} prompts copiados`, 'success');
      } catch {
        showToast?.('Error al copiar. Por favor selecciona y copia manualmente.', 'error');
      }
      document.body.removeChild(textarea);
    }
  };

  return (
    <div style={{ borderTop: '1px solid #e6e6eb', padding: '1rem' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.5rem'
      }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e1e2f' }}>
          🖼️ Diapositivas ({result.length || 0} slides)
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {totalVariations > 0 && (
            <button
              data-testid="copy-prompts-btn"
              onClick={handleCopyPrompts}
              style={{
                fontSize: '0.6875rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '6px',
                fontWeight: 600,
                background: '#3A9E5E',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
              title={`Copiar ${totalVariations} prompts optimizados para Bing/Leonardo/Ideogram al portapapeles`}
            >
              🎨 Copiar {totalVariations} prompts
            </button>
          )}
          {fidelity && (
            <div
              data-testid="fidelity-badge"
              style={{
                fontSize: '0.6875rem',
                padding: '0.125rem 0.5rem',
                borderRadius: '10px',
                fontWeight: 600,
                background: flaggedCount > 0 ? '#FEF3C7' : '#D1FAE5',
                color: flaggedCount > 0 ? '#92400E' : '#065F46',
                border: flaggedCount > 0 ? '1px solid #FCD34D' : '1px solid #6EE7B7'
              }}
              title={`Fidelity score: ${score}/100. ${flaggedCount} slides flagged with ${totalFlags} warnings.`}
            >
              {flaggedCount > 0 ? `⚠️ ${flaggedCount} flagged` : `✓ Fidelity ${score}`}
            </div>
          )}
        </div>
      </div>
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {result.map((s, j) => {
          const slideNum = s.numero || j + 1;
          const warnings = warningsBySlide.get(slideNum);
          const hasFlag = warnings && warnings.length > 0;
          const isExpanded = expandedSlide === slideNum;
          const hasVariations = !!(s as any).prompt_imagen_variations?.length;

          return (
            <div
              key={`slide-${slideNum}`}
              data-testid={`slide-row-${slideNum}`}
              style={{
                marginBottom: '0.25rem',
                fontSize: '0.6875rem',
                padding: '0.25rem 0.5rem',
                background: hasFlag ? '#FEF2F2' : (j % 2 === 0 ? '#f0fdf4' : '#fff'),
                borderRadius: '3px',
                borderLeft: hasFlag ? '3px solid #EF4444' : '3px solid transparent'
              }}
            >
              <div
                role={hasFlag ? 'button' : undefined}
                tabIndex={hasFlag ? 0 : undefined}
                onClick={() => hasFlag && setExpandedSlide(isExpanded ? null : slideNum)}
                onKeyDown={(e) => {
                  if (hasFlag && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    setExpandedSlide(isExpanded ? null : slideNum);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: hasFlag ? 'pointer' : 'default'
                }}
              >
                <span style={{ fontWeight: 600, color: '#059669' }}>{s.numero}.</span>
                <span style={{ flex: 1 }}>{s.titulo?.slice(0, 50)}</span>
                <span style={{ color: '#6b6b80' }}>— {s.tipo}</span>
                {hasVariations && (
                  <span
                    style={{
                      fontSize: '0.625rem',
                      background: '#DBEAFE',
                      color: '#1E40AF',
                      padding: '0.1rem 0.35rem',
                      borderRadius: '8px',
                      fontWeight: 600,
                    }}
                    title={`${(s as any).prompt_imagen_variations.length} prompts para generar imágenes`}
                  >
                    🎨 {(s as any).prompt_imagen_variations.length}
                  </span>
                )}
                {hasFlag && (
                  <span style={{ color: '#DC2626', fontWeight: 700, fontSize: '0.75rem' }}>
                    ⚠️ {warnings!.length}
                  </span>
                )}
              </div>
              {hasFlag && isExpanded && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  background: '#FEF2F2',
                  borderRadius: '4px',
                  fontSize: '0.625rem'
                }}>
                  <div style={{ fontWeight: 600, color: '#991B1B', marginBottom: '0.25rem' }}>
                    ⚠️ Revisar antes de usar:
                  </div>
                  {warnings!.map((w, idx) => (
                    <div
                      key={`warn-${slideNum}-${idx}`}
                      style={{
                        marginBottom: '0.375rem',
                        paddingLeft: '0.5rem',
                        borderLeft: '2px solid #FCA5A5'
                      }}
                    >
                      <div style={{ fontWeight: 600, color: '#7F1D1D' }}>
                        "{w.flagged_text}" — {w.category}
                      </div>
                      <div style={{ color: '#6B7280', marginTop: '0.125rem' }}>
                        {w.reason}
                      </div>
                      <div style={{ color: '#059669', marginTop: '0.125rem', fontStyle: 'italic' }}>
                        💡 {w.suggestion}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {totalVariations > 0 && (
        <div style={{
          marginTop: '0.5rem',
          padding: '0.5rem',
          background: '#EFF6FF',
          border: '1px solid #93C5FD',
          borderRadius: '4px',
          fontSize: '0.6875rem',
          color: '#1E3A8A',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span style={{ fontSize: '1rem' }}>🎨</span>
          <span>
            <strong>{totalVariations} prompts para imágenes</strong> listos para Bing Image Creator, Leonardo.ai o Ideogram (gratuitos).
            Click en <strong>"Copiar prompts"</strong> arriba para pegarlos en la herramienta que prefieras.
          </span>
        </div>
      )}
      {flaggedCount > 0 && (
        <div style={{
          marginTop: '0.5rem',
          padding: '0.5rem',
          background: '#FFFBEB',
          border: '1px solid #FCD34D',
          borderRadius: '4px',
          fontSize: '0.6875rem',
          color: '#92400E'
        }}>
          💡 Las slides marcadas con ⚠️ contienen detalles que el LLM pudo haber inventado. Verifica contra el texto fuente antes de usar.
        </div>
      )}
    </div>
  );
}