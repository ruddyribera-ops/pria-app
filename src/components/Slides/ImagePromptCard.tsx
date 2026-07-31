/**
 * ImagePromptCard — Shows AI-generated image prompts for a slide.
 * Allows copy-paste workflow to Bing Image Creator / Leonardo AI.
 */

import { useState, useCallback } from 'react';

export interface PromptVariation {
  estilo: string;
  prompt: string;
  herramienta_recomendada: string;
}

interface ImagePromptCardProps {
  /** Array of prompt variations (usually 3 per slide) */
  variations: PromptVariation[];
  /** Compact height suitable for slide preview area (~200px) */
  compact?: boolean;
}

const ESTILO_LABELS: Record<string, string> = {
  ilustracion_infantil: 'Infantil',
  documental_educativo: 'Documental',
  artistico_cultural: 'Artístico',
  diagrama_visual: 'Diagrama',
  minimal: 'Minimal',
  cartoon: 'Cartoon',
  realistic: 'Realista',
};

const ESTILO_COLORS: Record<string, string> = {
  ilustracion_infantil: '#F472B6',
  documental_educativo: '#3B82F6',
  artistico_cultural: '#A855F7',
  diagrama_visual: '#F59E0B',
  minimal: '#6B7280',
  cartoon: '#EC4899',
  realistic: '#10B981',
};

const TOOL_COLORS: Record<string, string> = {
  bing: '#008373',
  leonardo: '#9CA3AF',
  ideogram: '#6B7280',
  dalle: '#10B981',
  cualquiera: '#9CA3AF',
};

function getToolUrl(tool: string, prompt: string): string | null {
  const encoded = encodeURIComponent(prompt);
  switch (tool.toLowerCase()) {
    case 'bing':
      return `https://www.bing.com/images/create?q=${encoded}`;
    case 'leonardo':
      return 'https://app.leonardo.ai/';
    case 'ideogram':
      return 'https://ideogram.ai/';
    default:
      return null;
  }
}

function getToolLabel(tool: string): string {
  switch (tool.toLowerCase()) {
    case 'bing':
      return 'Bing Image Creator';
    case 'leonardo':
      return 'Leonardo.ai';
    case 'ideogram':
      return 'Ideogram';
    case 'dalle':
      return 'DALL-E';
    default:
      return tool;
  }
}

export default function ImagePromptCard({ variations, compact = false }: ImagePromptCardProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const handleCopy = useCallback(async (prompt: string, index: number) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = prompt;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  }, []);

  if (!variations || variations.length === 0) return null;

  const visibleVariations = showAll ? variations : variations.slice(0, 1);
  const remaining = variations.length - 1;

  return (
    <div style={{
      border: '1px solid #e6e6eb',
      borderRadius: '6px',
      background: '#fafafa',
      overflow: 'hidden',
      fontSize: compact ? '0.6875rem' : '0.75rem',
    }}>
      {/* Header */}
      <div style={{
        padding: '0.375rem 0.625rem',
        background: '#3A9E5E',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ fontSize: '0.75rem' }}>🎨</span>
          <span style={{ fontWeight: 600 }}>Prompts para generar imágenes</span>
          <span style={{
            background: 'rgba(255,255,255,0.25)',
            padding: '0.0625rem 0.375rem',
            borderRadius: '8px',
            fontSize: '0.625rem',
            fontWeight: 600,
          }}>
            {variations.length} opciones
          </span>
        </div>
        <div style={{
          fontSize: '0.625rem',
          opacity: 0.9,
        }}>
          {variations[0]?.herramienta_recomendada
            ? `↳ Recomendado: ${getToolLabel(variations[0].herramienta_recomendada)}`
            : 'Gratis: Bing · Leonardo · Ideogram'}
        </div>
      </div>

      {/* Variations */}
      <div style={{ padding: compact ? '0.375rem' : '0.5rem' }}>
        {visibleVariations.map((v, idx) => {
          const toolUrl = getToolUrl(v.herramienta_recomendada, v.prompt);
          const isRecommended = idx === 0;
          const estiloLabel = ESTILO_LABELS[v.estilo] || v.estilo;
          const estiloColor = ESTILO_COLORS[v.estilo] || '#6B7280';
          const toolColor = TOOL_COLORS[v.herramienta_recomendada.toLowerCase()] || '#6B7280';

          return (
            <div key={idx} style={{
              padding: '0.375rem',
              marginBottom: idx < visibleVariations.length - 1 ? '0.375rem' : 0,
              background: '#fff',
              borderRadius: '4px',
              border: isRecommended ? '1.5px solid #3A9E5E' : '1px solid #e6e6eb',
            }}>
              {/* Badges row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                marginBottom: '0.25rem',
                flexWrap: 'wrap',
              }}>
                {/* Style badge */}
                <span style={{
                  padding: '0.0625rem 0.375rem',
                  background: `${estiloColor}18`,
                  color: estiloColor,
                  borderRadius: '3px',
                  fontSize: '0.5625rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}>
                  {estiloLabel}
                </span>

                {/* Tool badge */}
                <span style={{
                  padding: '0.0625rem 0.375rem',
                  background: `${toolColor}15`,
                  color: toolColor,
                  borderRadius: '3px',
                  fontSize: '0.5625rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}>
                  {getToolLabel(v.herramienta_recomendada)}
                </span>

                {isRecommended && (
                  <span style={{
                    padding: '0.0625rem 0.375rem',
                    background: '#3A9E5E',
                    color: '#fff',
                    borderRadius: '3px',
                    fontSize: '0.5625rem',
                    fontWeight: 700,
                  }}>
                    ★ Recomendado
                  </span>
                )}
              </div>

              {/* Prompt text */}
              <div style={{
                fontFamily: 'monospace',
                fontSize: compact ? '0.5625rem' : '0.625rem',
                lineHeight: 1.4,
                color: '#374151',
                background: '#F9FAFB',
                padding: '0.375rem 0.5rem',
                borderRadius: '3px',
                marginBottom: '0.375rem',
                maxHeight: compact ? '60px' : '80px',
                overflow: 'hidden',
                wordBreak: 'break-word' as const,
              }}>
                {v.prompt}
              </div>

              {/* Actions row */}
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' as const }}>
                {/* Copy button */}
                <button
                  type="button"
                  onClick={() => handleCopy(v.prompt, idx)}
                  style={{
                    padding: '0.1875rem 0.5rem',
                    background: copiedIndex === idx ? '#059669' : '#3A9E5E',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '0.5625rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.1875rem',
                  }}
                >
                  {copiedIndex === idx ? '✓ Copiado' : '📋 Copiar prompt'}
                </button>

                {/* Open in tool link */}
                {toolUrl && (
                  <a
                    href={toolUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '0.1875rem 0.5rem',
                      background: '#1e1e2f',
                      color: '#fff',
                      borderRadius: '3px',
                      fontSize: '0.5625rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.1875rem',
                    }}
                  >
                    ↗ Abrir en {getToolLabel(v.herramienta_recomendada)}
                  </a>
                )}
              </div>
            </div>
          );
        })}

        {/* Show more/less */}
        {variations.length > 1 && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            style={{
              width: '100%',
              marginTop: '0.25rem',
              padding: '0.1875rem',
              background: 'transparent',
              border: '1px dashed #d1d5db',
              borderRadius: '3px',
              fontSize: '0.5625rem',
              color: '#6b7280',
              cursor: 'pointer',
            }}
          >
            {showAll ? '▲ Ver menos' : `▼ Ver ${remaining} más`}
          </button>
        )}
      </div>

      {/* Footer hint */}
      <div style={{
        padding: '0.25rem 0.625rem',
        background: '#EFF6FF',
        borderTop: '1px solid #e6e6eb',
        fontSize: '0.5625rem',
        color: '#1E40AF',
      }}>
        💡 Copiá el prompt y pegalo en tu generador de imágenes favorito
      </div>
    </div>
  );
}
