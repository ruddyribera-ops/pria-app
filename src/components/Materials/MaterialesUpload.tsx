import type { Material } from '../../types';
import type { CurriculumResult } from '../../lib/ingest/types';
import UploadZone from './UploadZone';
import FileList from './FileList';
import CurriculumPreview from './CurriculumPreview';
import MotorButton from './MotorButton';
import styles from './MaterialesUpload.module.css';

interface IngestProgress {
  text: string;
  percent: number;
}

interface Props {
  materials: Material[];
  loading: boolean;
  studentBook: boolean;
  curriculumPreview: CurriculumResult | null;
  rawText: string;
  ingestWarnings: Array<{ code: string; message: string }>;
  ingesting: boolean;
  ocrProgress: IngestProgress | null;
  synthesisLoading: boolean;
  synthesisStreamText: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: (id: number) => void;
  onToggleStudentBook: () => void;
  onGenerateSynthesis: () => void;
}

export default function MaterialesUpload({
  materials,
  loading,
  studentBook,
  curriculumPreview,
  rawText,
  ingestWarnings,
  ingesting,
  ocrProgress,
  synthesisLoading,
  synthesisStreamText,
  onUpload,
  onDelete,
  onToggleStudentBook,
  onGenerateSynthesis,
}: Props) {
  return (
    <>
      {/* Upload Area */}
      <UploadZone onUpload={onUpload} ingesting={ingesting} />

      {/* Student Book Toggle */}
      <div className={styles.studentBookToggle}>
        <span className={styles.studentBookLabel}>¿Usa Student Book?</span>
        <button
          type="button"
          onClick={onToggleStudentBook}
          className={`${styles.toggleSwitch} ${studentBook ? styles.toggleSwitchOn : styles.toggleSwitchOff}`}
          aria-pressed={studentBook}
          aria-label="Activar modo Student Book"
        >
          <span className={`${styles.toggleKnob} ${studentBook ? styles.toggleKnobOn : ''}`} />
        </button>
        <span className={styles.studentBookStatus}>{studentBook ? 'Sí' : 'No'}</span>
      </div>

      {/* File List */}
      <FileList materials={materials} loading={loading} onDelete={onDelete} />

      {/* Loading / Processing indicator with progress bar */}
      {ingesting && (
        <div className={styles.ingestProgress} role="status" aria-live="polite">
          ⏳ {ocrProgress?.text || 'Procesando contenido del libro de texto...'}
          {ocrProgress && (
            <div
              className={styles.progressBar}
              role="progressbar"
              aria-valuenow={ocrProgress.percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className={styles.progressFill} style={{ width: `${ocrProgress.percent}%` }} />
            </div>
          )}
        </div>
      )}

      {/* OCR Warnings */}
      {ingestWarnings.length > 0 && (
        <div className={styles.ingestWarnings} role="alert">
          <strong className={styles.warningTitle}>⚠️ Avisos del procesamiento:</strong>
          {ingestWarnings.map((w) => (
            <div key={w.code} className={styles.warningItem}>• {w.message}</div>
          ))}
        </div>
      )}

      {/* Síntesis Button — show when any material exists, even without curriculum topics */}
      {materials.length > 0 && !ingesting && (
        <div style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
          <MotorButton
            label="🧠 Crear síntesis del material"
            loadingLabel="🧠 Leyendo el material..."
            color="#3A9E5E"
            progressPhases={['Leyendo el PDF', 'Identificando unidades y temas', 'Construyendo conexiones', 'Puliendo el resumen']}
            onClick={onGenerateSynthesis}
            loading={synthesisLoading}
          />
        </div>
      )}

      {/* Streaming text preview */}
      {synthesisLoading && synthesisStreamText && (
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

      {/* Curriculum Preview */}
      {curriculumPreview && (
        <CurriculumPreview
          curriculumPreview={curriculumPreview ?? undefined}
          rawText={rawText}
        />
      )}
    </>
  );
}
