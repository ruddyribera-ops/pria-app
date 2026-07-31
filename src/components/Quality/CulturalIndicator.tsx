/**
 * CulturalIndicator — badge shown when indigenous cultural context was detected.
 * Communicates to the user that cultural sensitivity rules were applied.
 */
import { useState, useRef, useEffect } from 'react';

export interface CulturalContext {
  detected: boolean;
  groups: string[];
  regions: string[];
}

interface CulturalIndicatorProps {
  cultural: CulturalContext | null | undefined;
}

export default function CulturalIndicator({ cultural }: CulturalIndicatorProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const badgeRef = useRef<HTMLButtonElement>(null);

  // Close popover on outside click — must always be called (rules of hooks)
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

  // Don't render if no cultural context detected
  if (!cultural?.detected) return null;

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        ref={badgeRef}
        type="button"
        onClick={() => setPopoverOpen((v) => !v)}
        title="Se aplicaron reglas de sensibilidad cultural"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          padding: '0.25rem 0.625rem',
          background: '#f0faf3',
          border: '1px solid #3A9E5E',
          borderRadius: '9999px',
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#3A9E5E',
          whiteSpace: 'nowrap',
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setPopoverOpen((v) => !v);
          }
        }}
        aria-label="Cultural sensitivity applied. Click for details."
        aria-expanded={popoverOpen}
      >
        <span>🎨</span>
        <span> Sensibilidad cultural</span>
      </button>

      {popoverOpen && (
        <div
          role="dialog"
          aria-label="Cultural sensitivity details"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: '#fff',
            border: '1px solid #e6e6eb',
            borderRadius: 8,
            padding: '0.75rem',
            width: 240,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            fontSize: '0.75rem',
          }}
        >
          <div style={{ fontWeight: 700, color: '#1e1e2f', marginBottom: '0.5rem' }}>
            ✓ Sensibilidad cultural aplicada
          </div>
          <p style={{ color: '#6b6b80', marginBottom: '0.5rem', lineHeight: 1.4 }}>
            Se detectaron términos indígenas y se inyectaron reglas de representación respetuosa en el prompt.
          </p>
          {cultural.groups.length > 0 && (
            <div style={{ marginBottom: '0.375rem' }}>
              <span style={{ fontWeight: 600, color: '#6b6b80', fontSize: '0.6875rem', textTransform: 'uppercase' }}>
                Grupos detectados:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                {cultural.groups.map((g) => (
                  <span
                    key={g}
                    style={{
                      padding: '0.125rem 0.5rem',
                      background: '#f0faf3',
                      border: '1px solid #3A9E5E',
                      borderRadius: '9999px',
                      fontSize: '0.6875rem',
                      color: '#3A9E5E',
                      fontWeight: 500,
                    }}
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
          {cultural.regions.length > 0 && (
            <div>
              <span style={{ fontWeight: 600, color: '#6b6b80', fontSize: '0.6875rem', textTransform: 'uppercase' }}>
                Regiones:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                {cultural.regions.map((r) => (
                  <span
                    key={r}
                    style={{
                      padding: '0.125rem 0.5rem',
                      background: '#f0faf3',
                      border: '1px solid #3A9E5E',
                      borderRadius: '9999px',
                      fontSize: '0.6875rem',
                      color: '#3A9E5E',
                      fontWeight: 500,
                    }}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
