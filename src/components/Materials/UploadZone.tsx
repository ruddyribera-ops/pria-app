import { useRef } from 'react';

interface UploadZoneProps {
  /** Handler cuando se selecciona un archivo */
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Si está procesando (deshabilita el input) */
  ingesting: boolean;
}

export default function UploadZone({ onUpload, ingesting }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onClick={() => !ingesting && fileInputRef.current?.click()}
      style={{
        border: '2px dashed #e6e6eb', borderRadius: '8px', padding: '2.5rem 2rem',
        textAlign: 'center', background: '#fff',
        cursor: ingesting ? 'not-allowed' : 'pointer',
        marginBottom: '1.25rem', opacity: ingesting ? 0.6 : 1,
      }}
    >
      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📗</div>
      <p style={{ fontSize: '0.875rem', color: '#1e1e2f', marginBottom: '0.25rem' }}>
        <strong>Libro de Texto (PDF)</strong>
      </p>
<p style={{ fontSize: '0.75rem', color: '#6b6b80' }}>
        Formatos aceptados: PDF, DOCX, TXT · Máx: 50MB
      </p>
      <p style={{ fontSize: '0.75rem', color: '#6b6b80', marginTop: '0.25rem' }}>
        Formatos aceptados: PDF · Máx: 50MB
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={onUpload}
        disabled={ingesting}
        style={{ display: 'none' }}
      />
    </div>
  );
}
