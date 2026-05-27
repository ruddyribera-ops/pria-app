/**
 * DocumentEditor — editable document view for ALL non-slide types.
 * Shows the document as a structured scrollable view with click-to-edit
 * on every piece of text. Tracks edits and applies them on download.
 *
 * Used by SlideEditorPanel when motorType is not 'slides'.
 */

import { useMemo } from 'react';
import type { Palette } from '../../lib/pptx/types';
import { getPalette } from '../../lib/pptx/designSystem';
import InlineText from './InlineText';
import { mapDocumentToElements } from './documentMapper';
import type { EditorElement } from './types';

/** The shape produced by mergePhaseResults() */
interface MergedData {
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

interface DocumentEditorProps {
  mergedData: MergedData;
  palette?: Palette;
  edits: Record<string, string>;
  onUpdateText: (id: string, val: string) => void;
}

export default function DocumentEditor({
  mergedData, palette: extPalette, edits, onUpdateText,
}: DocumentEditorProps) {
  const palette = useMemo(
    () => extPalette || getPalette(mergedData.subject || 'Matemáticas'),
    [extPalette, mergedData.subject],
  );

  const elements = useMemo(
    () => mapDocumentToElements(mergedData),
    [mergedData],
  );

  // Group elements into sections by detecting header elements
  const sections = useMemo(() => {
    const groups: Array<{ label: string; icon: string; elements: EditorElement[] }> = [];
    let current: EditorElement[] = [];

    for (const el of elements) {
      if (el.id.endsWith('-header') && el.type === 'title') {
        if (current.length > 0) {
          const header = current.find(e => e.id.endsWith('-header'));
          groups.push({
            label: header?.content.replace(/^[🎯📇✏️📝]\s*/, '') || 'Documento',
            icon: header?.content.match(/^[🎯📇✏️📝]/)?.[0] || '📄',
            elements: current,
          });
          current = [];
        }
      }
      current.push(el);
    }
    if (current.length > 0) {
      groups.push({
        label: groups.length === 0 ? 'Documento' : '📝 Para copiar',
        icon: '📄',
        elements: current,
      });
    }
    return groups;
  }, [elements]);

  if (elements.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#b0b0c4', fontSize: '0.8125rem' }}>
        No hay contenido editable.
      </div>
    );
  }

  return (
    <div style={{
      padding: '1.5rem 2rem',
      maxHeight: '500px',
      overflow: 'auto',
      background: '#fefefe',
    }}>
      {/* Document header */}
      <div style={{
        padding: '1rem 1.25rem',
        background: `${palette.primary}08`,
        borderRadius: '6px',
        borderLeft: `4px solid ${palette.primary}`,
        marginBottom: '1.25rem',
      }}>
        <InlineText
          id="doc-title"
          value={edits['doc-title'] ?? (mergedData.title || '')}
          onChange={onUpdateText}
          style={{
            fontSize: '1rem', fontWeight: 700, color: palette.primary,
            marginBottom: '0.25rem', display: 'block',
          }}
          accentColor={palette.accent}
        />
        {mergedData.subject && (
          <InlineText
            id="doc-info"
            value={edits['doc-info'] ?? `${mergedData.subject} · ${mergedData.grade || ''}`}
            onChange={onUpdateText}
            style={{ fontSize: '0.75rem', color: palette.textDark, display: 'block' }}
            accentColor={palette.accent}
          />
        )}
      </div>

      {/* Document sections */}
      {sections.map((section, si) => (
        <div key={si} style={{ marginBottom: '1.25rem' }}>
          {section.label !== 'Documento' && (
            <div style={{
              fontSize: '0.75rem', fontWeight: 600, color: '#1e1e2f',
              marginBottom: '0.625rem', paddingBottom: '0.25rem',
              borderBottom: `2px solid ${palette.accent}30`,
              display: 'flex', alignItems: 'center', gap: '0.375rem',
            }}>
              {section.icon} {section.label}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {section.elements.map(el => (
              <EditableElement
                key={el.id}
                element={el}
                value={edits[el.id] ?? el.content}
                onChange={onUpdateText}
                palette={palette}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Edit hint */}
      <div style={{
        fontSize: '0.625rem', color: '#b0b0c4', textAlign: 'center',
        padding: '0.5rem', borderTop: '1px solid #e6e6eb', marginTop: '0.5rem',
      }}>
        💡 Haz click en cualquier texto para editarlo
      </div>
    </div>
  );
}

// ═══════════════════ Element Renderer ═══════════════════

function EditableElement({
  element, value, onChange, palette,
}: {
  element: EditorElement;
  value: string;
  onChange: (id: string, val: string) => void;
  palette: Palette;
}) {
  switch (element.type) {
    case 'title':
      return (
        <div style={{
          padding: '0.25rem 0',
          borderBottom: '1px solid #e6e6eb',
          marginBottom: '0.125rem',
        }}>
          <InlineText
            id={element.id}
            value={value}
            onChange={onChange}
            style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e1e2f', display: 'block' }}
            accentColor={palette.accent}
          />
        </div>
      );

    case 'badge':
      return (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.5rem 0.625rem',
          background: '#f8f8ff', borderRadius: '4px',
          border: '1px solid #e6e6eb',
        }}>
          {element.orderIndex != null && (
            <div style={{
              width: '1.375rem', height: '1.375rem', borderRadius: '50%',
              background: palette.primary, color: '#fff',
              fontSize: '0.625rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {element.orderIndex}
            </div>
          )}
          {element.badgeLabel && (
            <span style={{
              padding: '0.0625rem 0.5rem', borderRadius: '3px',
              background: `${palette.accent}20`, color: palette.accent,
              fontSize: '0.625rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {element.badgeLabel}
            </span>
          )}
          <InlineText
            id={element.id}
            value={value}
            onChange={onChange}
            style={{ fontSize: '0.6875rem', color: '#1e1e2f', lineHeight: 1.4, flex: 1 }}
            accentColor={palette.accent}
          />
        </div>
      );

    case 'bullet':
      return (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.375rem',
          marginLeft: '0.75rem',
        }}>
          <span style={{ color: palette.accent, fontSize: '0.5rem', marginTop: '0.375rem' }}>●</span>
          <InlineText
            id={element.id}
            value={value}
            onChange={onChange}
            style={{ fontSize: '0.6875rem', color: '#6b6b80', lineHeight: 1.4 }}
            accentColor={palette.accent}
          />
        </div>
      );

    case 'copyBox':
      return (
        <div style={{
          padding: '0.625rem 0.75rem',
          background: '#FFFBEB',
          border: '1px solid #F59E0B',
          borderRadius: '4px',
        }}>
          <InlineText
            id={element.id}
            value={value}
            onChange={onChange}
            style={{
              fontSize: '0.6875rem', color: '#92400E',
              lineHeight: 1.4, whiteSpace: 'pre-wrap',
              fontFamily: 'monospace', display: 'block',
            }}
            accentColor={palette.accent}
            multiline
          />
        </div>
      );

    default:
      return (
        <InlineText
          id={element.id}
          value={value}
          onChange={onChange}
          style={{
            fontSize: '0.6875rem', color: '#6b6b80',
            lineHeight: 1.4, display: 'block',
          }}
          accentColor={palette.accent}
        />
      );
  }
}
