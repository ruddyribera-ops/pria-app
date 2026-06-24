import type { CurriculumResult } from '../../lib/ingest/documentIngester';

interface CurriculumPreviewProps {
  curriculumPreview: CurriculumResult;
  rawText: string;
}

export default function CurriculumPreview({
  curriculumPreview,
  rawText,
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
          {curriculumPreview.temas.map((tema) => (
            <div key={tema} style={{ marginBottom: '0.75rem', paddingLeft: '0.5rem', borderLeft: '3px solid #3A9E5E' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '0.125rem' }}>
                {tema}
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
        <div style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📄</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '0.5rem' }}>
            No se detectaron temas en este material
          </div>
          {rawText && rawText.length > 0 ? (
            <>
              <p style={{ fontSize: '0.75rem', color: '#6b6b80', marginBottom: '0.75rem' }}>
                El texto se extrajo correctamente ({rawText.length} caracteres) pero la estructura de temas no se detectó automáticamente.
              </p>
              <p style={{ fontSize: '0.75rem', color: '#6b6b80', marginBottom: '0' }}>
                💡 Los temas se pueden seleccionar manualmente después de generar la Síntesis.
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: '0.75rem', color: '#6b6b80', marginBottom: '0.75rem' }}>
                El PDF parece ser escaneado (imágenes sin texto seleccionable) o está vacío.
              </p>
              <p style={{ fontSize: '0.75rem', color: '#6b6b80', marginBottom: '0' }}>
                💡 Prueba subiendo una imagen (JPG/PNG) del libro de texto para usar OCR automático.
              </p>
            </>
          )}
        </div>
      )}

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

    </div>
  );
}
