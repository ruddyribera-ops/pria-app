/**
 * QualityGate — blocks slide downloads when quality < 60, shows warning + regenerate option.
 */
import { canDownload, getQualityColor } from '../../lib/quality/threshold';
import { formatFlag } from '../../lib/quality/flag-messages';
import QualityBadge from './QualityBadge';
import type { QualityScore } from './QualityBadge';

interface QualityGateProps {
  quality: QualityScore | null | undefined;
  onRegenerate: () => void;
  onDownload: () => void;
  regenerateLoading?: boolean;
}

export function QualityGate({ quality, onRegenerate, onDownload, regenerateLoading }: QualityGateProps) {
  if (!quality) {
    // Legacy data with no quality — show normal download
    return (
      <button
        type="button"
        onClick={onDownload}
        style={{
          padding: '10px 20px',
          background: '#3A9E5E',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontWeight: 500,
          fontSize: '0.8125rem',
        }}
      >
        📥 Descargar
      </button>
    );
  }

  const allowed = canDownload(quality);
  const color = getQualityColor(quality.overall);
  const topFlags = (quality.flags || []).slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <QualityBadge quality={quality} />
        <span style={{ color: '#6b7280', fontSize: 14 }}>
          Puntaje: <strong style={{ color }}>{quality.overall}/100</strong>
        </span>
      </div>

      {!allowed && (
        <div style={{
          padding: 16,
          background: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: 8,
        }}>
          <div style={{ fontWeight: 600, color: '#991B1B', marginBottom: 8 }}>
            ⚠️ Calidad insuficiente para descargar
          </div>
          {topFlags.length > 0 && (
            <ul style={{ marginLeft: 20, color: '#7F1D1D', fontSize: 14 }}>
              {topFlags.map((flag) => (
                <li key={flag.code}>{formatFlag(flag)}</li>
              ))}
            </ul>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onRegenerate}
              disabled={regenerateLoading}
              style={{
                padding: '8px 16px',
                background: '#3A9E5E',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: regenerateLoading ? 'wait' : 'pointer',
                fontWeight: 500,
                fontSize: '0.8125rem',
              }}
            >
              {regenerateLoading ? 'Regenerando...' : '🔄 Regenerar para mejorar'}
            </button>
            <button
              type="button"
              onClick={onDownload}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                color: '#991B1B',
                border: '1px solid #991B1B',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              Descargar de todas formas
            </button>
          </div>
        </div>
      )}

      {allowed && (
        <button
          type="button"
          onClick={onDownload}
          style={{
            padding: '10px 20px',
            background: '#3A9E5E',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '0.8125rem',
          }}
        >
          📥 Descargar
        </button>
      )}
    </div>
  );
}
