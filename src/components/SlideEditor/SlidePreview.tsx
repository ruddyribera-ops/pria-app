/**
 * SlidePreview — Renders ONE slide as live HTML preview matching the PPTX design.
 * Supports inline editing: click any text to edit, click image slots to upload.
 */

import type { EditorSlide } from './types';
import type { Palette } from '../../lib/pptx/types';
import { FONTS } from '../../lib/pptx/designSystem';
import ImageUpload from './ImageUpload';
import InlineText from './InlineText';

interface SlidePreviewProps {
  slide: EditorSlide;
  palette: Palette;
  scale?: number;
  edits: Record<string, string>;
  images: Record<string, string>;
  onUpdateText: (elementId: string, newContent: string) => void;
  onSetImage: (elementId: string, dataUrl: string) => void;
  disabled?: boolean;
}

const PREVIEW_W = 800;
const PREVIEW_H = 450;
const COVER_PANEL_W_PX = 300;

export default function SlidePreview({
  slide, palette, scale = 1,
  edits, images,
  onUpdateText, onSetImage, disabled,
}: SlidePreviewProps) {
  const s = scale;

  return (
    <div style={{
      width: PREVIEW_W * s,
      height: PREVIEW_H * s,
      position: 'relative',
      overflow: 'hidden',
      borderRadius: '6px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
      background: palette.bg,
      fontFamily: `${FONTS.body}, sans-serif`,
    }}>
      {slide.type === 'cover' && (
        <CoverSlide elements={slide.elements} palette={palette} edits={edits}
          onUpdateText={onUpdateText} images={images} onSetImage={onSetImage} s={s} disabled={disabled} />
      )}
      {slide.type === 'objectives' && (
        <ObjectivesSlide elements={slide.elements} palette={palette} edits={edits}
          onUpdateText={onUpdateText} s={s} disabled={disabled} />
      )}
      {slide.type === 'content' && (
        <ContentSlide elements={slide.elements} palette={palette} edits={edits}
          onUpdateText={onUpdateText} images={images} onSetImage={onSetImage} s={s} disabled={disabled} />
      )}
      {slide.type === 'activity' && (
        <ActivitySlide elements={slide.elements} palette={palette} edits={edits}
          onUpdateText={onUpdateText} s={s} disabled={disabled} />
      )}
      {slide.type === 'copy' && (
        <CopySlide elements={slide.elements} palette={palette} edits={edits}
          onUpdateText={onUpdateText} s={s} disabled={disabled} />
      )}

      {/* Page number (not on cover) */}
      {slide.type !== 'cover' && (
        <div style={{
          position: 'absolute', right: 12 * s, bottom: 10 * s,
          width: 22 * s, height: 22 * s, borderRadius: '50%',
          background: palette.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9 * s, fontWeight: 600, color: '#fff',
        }}>
          {slide.number}
        </div>
      )}
    </div>
  );
}

// ═══════════════════ COVER ═══════════════════

function CoverSlide({ elements, palette, edits, onUpdateText, images, onSetImage, s, disabled }: any) {
  const title = edits['cover-title'] ?? elements.find((e: any) => e.id === 'cover-title')?.content ?? 'Título';
  const subtitle = edits['cover-subtitle'] ?? elements.find((e: any) => e.id === 'cover-subtitle')?.content ?? '';
  const imgData = images['cover-img'] ?? '';

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex' }}>
      <div style={{
        width: COVER_PANEL_W_PX * s, height: '100%',
        background: palette.primary, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 48 * s, left: 48 * s, width: 56 * s, height: 56 * s, borderRadius: '50%', background: palette.secondary, opacity: 0.3 }} />
        <div style={{ position: 'absolute', top: 96 * s, left: 160 * s, width: 40 * s, height: 40 * s, borderRadius: '50%', background: palette.secondary, opacity: 0.3 }} />
        <div style={{ position: 'absolute', top: 320 * s, left: 96 * s, width: 48 * s, height: 48 * s, borderRadius: '50%', background: palette.secondary, opacity: 0.3 }} />
        <div style={{ position: 'absolute', top: 360 * s, left: 224 * s, width: 32 * s, height: 32 * s, borderRadius: '50%', background: palette.secondary, opacity: 0.3 }} />
      </div>
      <div style={{ flex: 1, padding: `${48 * s}px ${32 * s}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {imgData && (
          <img src={imgData} alt="" style={{ maxHeight: 80 * s, objectFit: 'contain', marginBottom: 12 * s, borderRadius: 4 }} />
        )}
        <ImageUpload elementId="cover-img" currentDataUrl={imgData} onImage={onSetImage} disabled={disabled} />
        <div style={{ marginTop: 8 * s }}>
          <InlineText id="cover-title" value={title} onChange={onUpdateText} disabled={disabled}
            style={{
              fontFamily: `${FONTS.title}, ${FONTS.titleFallback}, serif`,
              fontSize: 32 * s, fontWeight: 700, color: palette.primary,
              lineHeight: 1.2, marginBottom: 12 * s, display: 'block',
            }}
            accentColor={palette.accent}
          />
        </div>
        <InlineText id="cover-subtitle" value={subtitle} onChange={onUpdateText} disabled={disabled}
          style={{ fontSize: 13 * s, color: palette.textDark, lineHeight: 1.4, display: 'block' }}
          accentColor={palette.accent}
        />
      </div>
    </div>
  );
}

// ═══════════════════ OBJECTIVES ═══════════════════

function ObjectivesSlide({ elements, palette, edits, onUpdateText, s, disabled }: any) {
  const objectives = elements.filter((e: any) => e.type === 'badge');
  const title = edits['obj-title'] ?? elements.find((e: any) => e.id === 'obj-title')?.content ?? '🎯 Objetivos';

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div style={{ width: '100%', height: 6 * s, background: palette.secondary }} />
      <div style={{ padding: `${24 * s}px ${32 * s}px` }}>
        <InlineText id="obj-title" value={title} onChange={onUpdateText} disabled={disabled}
          style={{
            fontFamily: `${FONTS.title}, serif`, fontSize: 20 * s,
            fontWeight: 700, color: palette.primary, marginBottom: 16 * s, display: 'block',
          }}
          accentColor={palette.accent}
        />
        {objectives.map((obj: any, _i: number) => (
          <div key={obj.id} style={{
            display: 'flex', alignItems: 'center', gap: 12 * s,
            marginBottom: 10 * s, padding: '8px 12px',
            background: '#F8F8FF', borderRadius: 4 * s,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{
              width: 28 * s, height: 28 * s, borderRadius: '50%',
              background: palette.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12 * s, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>{obj.orderIndex}</div>
            {obj.badgeLabel && (
              <div style={{
                padding: `${3 * s}px ${8 * s}px`, borderRadius: 4 * s,
                background: palette.accent, fontSize: 9 * s,
                fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', flexShrink: 0,
              }}>{obj.badgeLabel}</div>
            )}
            <InlineText id={obj.id} value={edits[obj.id] ?? obj.content} onChange={onUpdateText}
              disabled={disabled}
              style={{ fontSize: 12 * s, color: palette.textDark, lineHeight: 1.3, flex: 1 }}
              accentColor={palette.accent}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════ CONTENT ═══════════════════

function ContentSlide({ elements, palette, edits, onUpdateText, images, onSetImage, s, disabled }: any) {
  const title = edits['content-title'] ?? elements.find((e: any) => e.id === 'content-title')?.content ?? '';
  const paras = elements.filter((e: any) => e.id.startsWith('content-para'));
  const copyBox = elements.find((e: any) => e.id === 'content-copy');
  const imgData = images['content-img'] ?? '';

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ width: '100%', height: 6 * s, background: palette.secondary }} />
      <div style={{ padding: `${14 * s}px ${32 * s}px` }}>
        <InlineText id="content-title" value={title} onChange={onUpdateText} disabled={disabled}
          style={{
            fontFamily: `${FONTS.title}, serif`, fontSize: 17 * s,
            fontWeight: 700, color: palette.primary,
            marginBottom: 10 * s, display: 'block',
          }}
          accentColor={palette.accent}
        />
        <div style={{
          border: `1px solid ${palette.accent}40`, borderRadius: 4 * s,
          padding: `${10 * s}px ${14 * s}px`, position: 'relative',
          marginBottom: 8 * s, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: 4 * s, background: palette.accent,
            borderRadius: `${4 * s}px 0 0 ${4 * s}px`,
          }} />
          {paras.map((para: any) => (
            <InlineText key={para.id} id={para.id}
              value={edits[para.id] ?? para.content} onChange={onUpdateText}
              disabled={disabled}
              style={{ fontSize: 11 * s, color: palette.textDark, lineHeight: 1.4, marginBottom: 6 * s, display: 'block' }}
              accentColor={palette.accent}
            />
          ))}
        </div>
        <ImageUpload elementId="content-img" currentDataUrl={imgData} onImage={onSetImage} disabled={disabled} />
        {copyBox && (
          <div style={{
            marginTop: 8 * s, padding: `${8 * s}px ${10 * s}px`,
            background: '#FFFBEB', border: '1px solid #F59E0B', borderRadius: 4 * s,
          }}>
            <InlineText id={copyBox.id} value={edits[copyBox.id] ?? copyBox.content}
              onChange={onUpdateText} disabled={disabled}
              style={{ fontSize: 10 * s, color: '#92400E', lineHeight: 1.3 }}
              accentColor={palette.accent}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════ ACTIVITY ═══════════════════

function ActivitySlide({ elements, palette, edits, onUpdateText, s, disabled }: any) {
  const title = edits['act-title'] ?? elements.find((e: any) => e.id === 'act-title')?.content ?? '';
  const instructions = edits['act-instructions'] ?? elements.find((e: any) => e.id === 'act-instructions')?.content ?? '';
  const questions = elements.filter((e: any) => e.id.startsWith('act-q-') && e.type === 'text');
  const bullets = elements.filter((e: any) => e.type === 'bullet');

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div style={{ width: '100%', height: 6 * s, background: palette.secondary }} />
      <div style={{ padding: `${14 * s}px ${32 * s}px` }}>
        <InlineText id="act-title" value={title} onChange={onUpdateText} disabled={disabled}
          style={{
            fontFamily: `${FONTS.title}, serif`, fontSize: 17 * s,
            fontWeight: 700, color: palette.primary,
            marginBottom: 6 * s, display: 'block',
          }}
          accentColor={palette.accent}
        />
        {instructions && (
          <InlineText id="act-instructions" value={instructions} onChange={onUpdateText}
            disabled={disabled}
            style={{ fontSize: 11 * s, color: palette.textDark, marginBottom: 12 * s, lineHeight: 1.3, display: 'block' }}
            accentColor={palette.accent}
          />
        )}
        {questions.map((q: any) => (
          <InlineText key={q.id} id={q.id} value={edits[q.id] ?? q.content}
            onChange={onUpdateText} disabled={disabled}
            style={{ fontSize: 11 * s, fontWeight: 600, color: palette.textDark, marginBottom: 3 * s, lineHeight: 1.3, display: 'block' }}
            accentColor={palette.accent}
          />
        ))}
        {bullets.map((b: any) => {
          const letter = String.fromCharCode(65 + bullets.indexOf(b));
          return (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 6 * s, marginLeft: 12 * s, marginBottom: 2 * s }}>
              <div style={{
                width: 14 * s, height: 14 * s, borderRadius: '50%',
                background: palette.accent, fontSize: 7 * s, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>{letter}</div>
              <InlineText id={b.id} value={edits[b.id] ?? b.content} onChange={onUpdateText}
                disabled={disabled}
                style={{ fontSize: 10 * s, color: palette.textDark, lineHeight: 1.3 }}
                accentColor={palette.accent}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════ COPY ═══════════════════

function CopySlide({ elements, palette, edits, onUpdateText, s, disabled }: any) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div style={{ width: '100%', height: 6 * s, background: palette.secondary }} />
      <div style={{ padding: `${20 * s}px ${32 * s}px` }}>
        <div style={{
          fontFamily: `${FONTS.title}, serif`, fontSize: 18 * s,
          fontWeight: 700, color: palette.primary, marginBottom: 16 * s,
        }}>
          📝 Para copiar en tu cuaderno
        </div>
        {elements.map((el: any) => (
          <div key={el.id} style={{
            padding: `${10 * s}px ${14 * s}px`, background: '#FFFBEB',
            border: '1px solid #F59E0B', borderRadius: 4 * s, marginBottom: 10 * s,
          }}>
            <InlineText id={el.id} value={edits[el.id] ?? el.content}
              onChange={onUpdateText} disabled={disabled}
              style={{ fontSize: 10 * s, color: '#92400E', lineHeight: 1.4, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}
              accentColor={palette.accent}
            />
          </div>
        ))}
      </div>
    </div>
  );
}


