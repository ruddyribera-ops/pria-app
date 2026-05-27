import type { CurriculumResult } from '../../lib/ingest/documentIngester';
import MotorButton from './MotorButton';

interface CurriculumPreviewProps {
  curriculumPreview: CurriculumResult;
  rawText: string;
  generatingSynthesis: boolean;
  synthesisStreamText: string;
  onGenerateSynthesis: () => void;
}

export default function CurriculumPreview({
  curriculumPreview,
  rawText,
  generatingSynthesis,
  synthesisStreamText,
  onGenerateSynthesis,
}: CurriculumPreviewProps) {
  return (
    <div style={{
      marginTop: '1.5rem', background: '#fff', border: '1px solid #e6e6eb',
      borderRadius: '8px', overflow: 'hidden',
    }}>
      <div style={{
        padding: '0.75rem 1rem', borderBottom: '1px solid #e6e6eb',
        background: '#f8f8fa', fontSize: '0.8125rem', fontWeight: 600, color: '#1e1e2f',
      }}>
        📋 Vista Previa del Currículo Detectado
      </div>

      {curriculumPreview.temas.length > 0 ? (
        <div style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e1e2f', marginBottom: '0.5rem' }}>
            {curriculumPreview.unidad_real || 'Unidad sin nombre'}
          </div>
          <p style={{ fontSize: '0.75rem', color: '#6b6b80', marginBottom: '0.75rem' }}>
            Se detectaron {curriculumPreview.temas.length} tema(s). Podrás editarlos antes de guardarlos.
          </p>
          {curriculumPreview.temas.map((tema, i) => (
            <div key={i} style={{ marginBottom: '0.75rem', paddingLeft: '0.5rem', borderLeft: '3px solid #3A9E5E' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '0.125rem' }}>
                {i + 1}. {tema}
              </div>
              {curriculumPreview.contenido_temas[tema] && (
                <div style={{ fontSize: '0.75rem', color: '#4a4a5a', marginBottom: '0.125rem' }}>
                  {curriculumPreview.contenido_temas[tema].slice(0, 200)}
                  {(curriculumPreview.contenido_temas[tema].length > 200) && '…'}
                </div>
              )}
              {curriculumPreview.paginas_temas[tema] && (
                <span style={{ fontSize: '0.6875rem', color: '#6b6b80' }}>
                  📄 {curriculumPreview.paginas_temas[tema]}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '1rem', fontSize: '0.8125rem', color: '#6b6b80' }}>
          {curriculumPreview.unidad_real && curriculumPreview.unidad_real !== 'Unidad sin nombre' ? (
            <div style={{ fontWeight: 600, color: '#1e1e2f', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              📘 {curriculumPreview.unidad_real}
            </div>
          ) : null}
          <p style={{ margin: 0 }}>
            {rawText && rawText.length > 0
              ? 'El texto se extrajo correctamente pero la estructura de temas no se detectó automáticamente. Revisa el texto abajo y selecciona los temas manualmente.'
              : 'El PDF podría ser escaneado (imágenes sin texto). La extracción no produjo resultados.'}
          </p>
        </div>
      )}

      {/* Synthesis Button */}
      <MotorButton
        label="🧠 Generar Síntesis con IA"
        loadingLabel="🧠 Generando síntesis..."
        color="#3A9E5E"
        onClick={onGenerateSynthesis}
        loading={generatingSynthesis}
      />

      {/* Raw text preview */}
      {rawText && rawText.length > 0 && (
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #e6e6eb' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#6b6b80', marginBottom: '0.25rem' }}>
            📝 Texto extraído ({rawText.length} caracteres):
          </div>
          <pre style={{
            fontSize: '0.6875rem', color: '#4a4a5a', whiteSpace: 'pre-wrap',
            maxHeight: '400px', overflowY: 'auto', background: '#fafafa',
            padding: '0.5rem', borderRadius: '4px', margin: 0,
          }}>
            {rawText.slice(0, 4000)}
            {rawText.length > 4000 && '\n\n… (truncado — ' + rawText.length + ' caracteres totales)'}
          </pre>
        </div>
      )}

      {/* Streaming text preview */}
      {generatingSynthesis && synthesisStreamText && (
        <div style={{ borderTop: '1px solid #e6e6eb', padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3A9E5E', marginBottom: '0.5rem' }}>
            ⏳ Generando síntesis...
          </div>
          <pre style={{
            fontSize: '0.6875rem', color: '#4a4a5a', whiteSpace: 'pre-wrap',
            maxHeight: '150px', overflowY: 'auto', background: '#f0fdf4',
            padding: '0.5rem', borderRadius: '4px',
          }}>
            {synthesisStreamText}
          </pre>
        </div>
      )}
    </div>
  );
}
