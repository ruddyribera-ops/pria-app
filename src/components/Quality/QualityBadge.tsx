/**
 * QualityBadge — compact quality score indicator (40x40px circle).
 * Color: green (≥80), yellow (50-79), red (<50).
 * Hover/click reveals popover with flags + suggestions.
 */
import { useState, useRef, useEffect } from 'react';

export interface QualityFlag {
  code: string;
  severity: 'high' | 'medium' | 'low';
  field?: string;
  message: string;
}

export interface QualityScore {
  overall: number; // 0-100
  flags: QualityFlag[];
  suggestions: string[];
}

interface QualityBadgeProps {
  quality: QualityScore;
  compact?: boolean; // if true, no expandable suggestions below
}

// Codecademy palette
const COLOR_HIGH = '#3A9E5E';   // green — good quality
const COLOR_MEDIUM = '#F59E0B'; // yellow — medium
const COLOR_LOW = '#EF4444';     // red — low quality

// Severity dot colors
const SEVERITY_COLORS: Record<QualityFlag['severity'], string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#3B82F6', // blue
};

function getScoreColor(score: number): string {
  if (score >= 80) return COLOR_HIGH;
  if (score >= 50) return COLOR_MEDIUM;
  return COLOR_LOW;
}

export default function QualityBadge({ quality, compact = false }: QualityBadgeProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false);
  const badgeRef = useRef<HTMLButtonElement>(null);
  const color = getScoreColor(quality.overall);

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (badgeRef.current && !badgeRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [popoverOpen]);

  const togglePopover = () => setPopoverOpen((v) => !v);

  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
      {/* The 40x40 circle badge — button for accessibility */}
      <button
        ref={badgeRef}
        type="button"
        onClick={togglePopover}
        title={`Calidad: ${quality.overall}/100 — click para ver detalles`}
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: color,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '0.8125rem',
          cursor: 'pointer',
          flexShrink: 0,
          userSelect: 'none',
          boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          border: '2px solid rgba(255,255,255,0.3)',
          transition: 'transform 0.15s, box-shadow 0.15s',
          padding: 0,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.15)';
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            togglePopover();
          }
        }}
        aria-label={`Quality score ${quality.overall} out of 100. Click to see details.`}
        aria-expanded={popoverOpen}
      >
        {quality.overall}
      </button>

      {/* Popover */}
      {popoverOpen && (
        <div
          role="dialog"
          aria-label="Quality score details"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: '#fff',
            border: '1px solid #e6e6eb',
            borderRadius: 8,
            padding: '0.75rem',
            width: 280,
            maxHeight: 320,
            overflowY: 'auto',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            fontSize: '0.75rem',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: color,
              flexShrink: 0,
            }} />
            <span style={{ fontWeight: 700, color: '#1e1e2f' }}>
              Calidad: {quality.overall}/100
            </span>
          </div>

          {/* Flags */}
          {quality.flags.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ fontWeight: 600, color: '#6b6b80', marginBottom: '0.25rem', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Problemas detectados
              </div>
              {quality.flags.map((flag, idx) => {
                const key = `flag-${flag.code}-${idx}`;
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.375rem', marginBottom: '0.25rem' }}>
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: SEVERITY_COLORS[flag.severity],
                      marginTop: 3,
                      flexShrink: 0,
                    }} />
                    <span style={{ color: '#374151', lineHeight: 1.4 }}>
                      {flag.message}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Suggestions */}
          {quality.suggestions.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, color: '#6b6b80', marginBottom: '0.25rem', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Sugerencias
              </div>
              {quality.suggestions.slice(0, 5).map((s, idx) => {
                const key = `suggestion-${idx}`;
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.375rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#3A9E5E', flexShrink: 0 }}>▸</span>
                    <span style={{ color: '#374151', lineHeight: 1.4 }}>{s}</span>
                  </div>
                );
              })}
              {quality.suggestions.length > 5 && (
                <div style={{ color: '#6b6b80', fontStyle: 'italic' }}>
                  +{quality.suggestions.length - 5} más
                </div>
              )}
            </div>
          )}

          {quality.flags.length === 0 && quality.suggestions.length === 0 && (
            <div style={{ color: '#3A9E5E', fontWeight: 500 }}>
              ✓ Sin problemas detectados
            </div>
          )}
        </div>
      )}

      {/* Expandable suggestions below badge (non-compact mode) */}
      {!compact && quality.suggestions.length > 0 && (
        <div style={{ width: '100%' }}>
          <button
            type="button"
            onClick={() => setSuggestionsExpanded((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.6875rem',
              color: '#6b6b80',
              padding: '2px 4px',
              textAlign: 'left',
              width: '100%',
            }}
          >
            {suggestionsExpanded ? '▲ Ocultar' : '▼ Sugerencias'}
          </button>
          {suggestionsExpanded && (
            <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0, fontSize: '0.6875rem', color: '#6b6b80' }}>
              {quality.suggestions.map((s, idx) => {
                const key = `suggestion-list-${idx}`;
                return (
                  <li key={key} style={{ marginBottom: '0.125rem' }}>{s}</li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
