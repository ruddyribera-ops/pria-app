import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Layout/Header';
import { useToast } from '../components/UI/Toast';
import { useAuth } from '../context/AuthContext';
import { listMaterials, uploadMaterial } from '../api/materials';
import { TOKEN_KEY } from '../constants';
import { useMotorGenerator } from '../hooks/useMotorGenerator';
import { extractUnitsWithAI, type Unit } from '../lib/textbook/parseUnits';
import UnitTopicSelector from '../components/Materials/UnitTopicSelector';
import type { SynthesisOutput, PlanOutput, SlidesOutput, QuizOutput, AnyMotorOutput, SourceNarratorOutput } from '../types/motor-types';
import type { Material } from '../types';
import type { IngestResult } from '../lib/ingest/types';
import type { TeacherInfo } from '../lib/export/pdf';
import QualityBadge from '../components/Quality/QualityBadge';
import CulturalIndicator from '../components/Quality/CulturalIndicator';
import type { QualityScore } from '../components/Quality/QualityBadge';
import type { CulturalContext } from '../components/Quality/CulturalIndicator';

type WizardStep = 'upload' | 'select' | 'generate';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadServerPptx(
  motor: string,
  output: unknown,
  teacherInfo: TeacherInfo,
  topicSuffix: string,
): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch('/api/exports/pptx', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ motor, output, teacherInfo }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null) as { detail?: string; error?: string } | null;
    const detail = errorBody?.detail || errorBody?.error || response.statusText;
    throw new Error(`PPTX generation failed: ${response.status} ${detail}`);
  }

  const blob = await response.blob();
  const filename = `PRIA_${motor}${topicSuffix}_${Date.now()}.pptx`;
  downloadBlob(blob, filename);
}

// ── Styles ───────────────────────────────────────────────────────────────────

const STEP_STYLES = {
  container: {
    padding: '1.5rem 2rem',
    maxWidth: '900px',
    margin: '0 auto',
  },
  stepIndicator: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '2rem',
  },
  stepDot: (active: boolean) => ({
    flex: 1,
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    textAlign: 'center' as const,
    fontSize: '0.8125rem',
    fontWeight: 600,
    background: active ? '#3A9E5E' : '#f0faf3',
    color: active ? '#fff' : '#3A9E5E',
    border: active ? 'none' : '1px solid #3A9E5E',
  }),
  card: {
    background: '#fff',
    border: '1px solid #e6e6eb',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '1rem',
  },
  buttonPrimary: (disabled?: boolean) => ({
    padding: '0.625rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: disabled ? '#a0a0b0' : '#fff',
    background: disabled ? '#e6e6eb' : '#3A9E5E',
    border: 'none',
    borderRadius: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s',
  }),
  buttonSecondary: {
    padding: '0.625rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#6b6b80',
    background: 'transparent',
    border: '1px solid #e6e6eb',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  dropZone: {
    border: '3px dashed #3A9E5E',
    borderRadius: '12px',
    padding: '3rem',
    textAlign: 'center' as const,
    background: '#f0faf3',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background 0.2s',
  },
  motorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
  },
  motorCard: (ready: boolean, simulated?: boolean) => ({
    background: '#fff',
    border: `1px solid ${simulated ? '#FFC107' : ready ? '#3A9E5E' : '#e6e6eb'}`,
    borderRadius: '8px',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  }),
  progressBar: {
    width: '100%',
    height: '8px',
    background: '#e6e6eb',
    borderRadius: '4px',
    overflow: 'hidden',
    marginTop: '1rem',
  },
  progressFill: (pct: number) => ({
    width: `${pct}%`,
    height: '100%',
    background: '#3A9E5E',
    borderRadius: '4px',
    transition: 'width 0.3s',
  }),
};

// ── Sub-components ────────────────────────────────────────────────────────────

interface UploadStepProps {
  materials: Material[];
  uploading: boolean;
  progress: number;
  onUpload: (file: File) => void;
  onSelectExisting: (m: Material) => void;
  onContinue: () => void;
  hasFile: boolean;
}

function UploadStep({
  materials,
  uploading,
  progress,
  onUpload,
  onSelectExisting,
  onContinue,
  hasFile,
}: UploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      onUpload(file);
    }
  };

  return (
    <div style={STEP_STYLES.card}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        Sube tu libro de texto
      </h2>
      <p style={{ fontSize: '0.8125rem', color: '#6b6b80', marginBottom: '1.5rem' }}>
        PRIA identificara automaticamente las unidades y temas de tu PDF.
      </p>

      <button
        type="button"
        style={{
          ...STEP_STYLES.dropZone as React.CSSProperties,
          borderColor: isDragOver ? '#2d7e4a' : '#3A9E5E',
          background: isDragOver ? '#e8f5ec' : '#f0faf3',
          width: '100%',
          font: 'inherit',
        }}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
      >
        {uploading ? (
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              Subiendo... {progress}%
            </div>
            <div style={STEP_STYLES.progressBar}>
              <div style={STEP_STYLES.progressFill(progress)} />
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📚</div>
            <div style={{ fontSize: '1rem', fontWeight: 600 }}>
              Arrastra tu PDF aqui
            </div>
            <div style={{ color: '#6b6b80', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
              o haz click para seleccionar
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          id="wizard-file-input"
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
          }}
        />
      </button>

      {materials.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.75rem', color: '#6b6b80' }}>
            O usa un libro ya subido:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {materials.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectExisting(m)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1rem',
                  background: '#f8f8fa',
                  border: '1px solid #e6e6eb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.8125rem',
                  color: '#1e1e2f',
                }}
              >
                <span>📗</span>
                <span style={{ flex: 1 }}>{m.filename}</span>
                <span style={{ color: '#6b6b80', fontSize: '0.75rem' }}>
                  {m.size ? `${(m.size / 1024).toFixed(0)} KB` : ''}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onContinue}
          disabled={!hasFile}
          style={STEP_STYLES.buttonPrimary(!hasFile)}
        >
          Continuar →
        </button>
      </div>

      {/* Fallback: skip PDF, go directly to slide generator */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        background: '#f9fafb',
        border: '1px dashed #d4d4e0',
        borderRadius: '8px',
        textAlign: 'center',
      }}>
        <p style={{ color: '#6b6b80', margin: '0 0 0.75rem 0', fontSize: '0.875rem' }}>
          ¿No tienes un PDF a mano?
        </p>
        <Link
          to="/slides"
          style={{
            display: 'inline-block',
            padding: '0.625rem 1.25rem',
            background: '#3A9E5E',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '0.875rem',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#2d7d4a';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#3A9E5E';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          }}
        >
          💡 Generar diapositivas directamente desde un tema
        </Link>
      </div>
    </div>
  );
}

interface SelectStepProps {
  units: Unit[];
  selectedTopicIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onContinue: () => void;
  onBack: () => void;
}

function SelectStep({
  units,
  selectedTopicIds,
  onSelectionChange,
  onContinue,
  onBack,
}: SelectStepProps) {
  const topicCount = units.reduce((acc, u) => acc + u.topics.length, 0);

  if (units.length === 0) {
    return (
      <div style={STEP_STYLES.card}>
        <p style={{ color: '#6b6b80', textAlign: 'center', padding: '2rem' }}>
          No se detectaron unidades en este libro.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button type="button" onClick={onBack} style={STEP_STYLES.buttonSecondary}>
            ← Atrás
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ ...STEP_STYLES.card, marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Selecciona los temas
        </h2>
        <p style={{ fontSize: '0.8125rem', color: '#6b6b80' }}>
          PRIA identifico {units.length} unidades con {topicCount} temas.
        </p>
      </div>

      <UnitTopicSelector
        units={units}
        selectedTopicIds={selectedTopicIds}
        onSelectionChange={onSelectionChange}
        onGenerateSelected={() => {}}
      />

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
        <button type="button" onClick={onBack} style={STEP_STYLES.buttonSecondary}>
          ← Atrás
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={selectedTopicIds.size === 0}
          style={STEP_STYLES.buttonPrimary(selectedTopicIds.size === 0)}
        >
          Continuar con {selectedTopicIds.size} tema{selectedTopicIds.size !== 1 ? 's' : ''} →
        </button>
      </div>
    </div>
  );
}

interface MotorOption {
  id: string;
  label: string;
  description: string;
  icon: string;
}

const MOTOR_OPTIONS: MotorOption[] = [
  { id: 'synthesis', label: 'Plan de unidad', description: 'Sintesis curricular completa', icon: '📋' },
  { id: 'slides', label: 'Diapositivas', description: '10-12 diapositivas para tu clase', icon: '🖼️' },
  { id: 'plan', label: 'Plan de clase (45 min)', description: 'Actividades minuto a minuto', icon: '📝' },
  { id: 'quiz', label: 'Quiz', description: '5 preguntas para evaluar', icon: '❓' },
];

type DownloadFormat = 'pptx' | 'pdf' | 'docx';

interface GenerateStepProps {
  selectedTopicIds: Set<string>;
  motors: Record<string, ReturnType<typeof useMotorGenerator<AnyMotorOutput>> & { loading: boolean }>;
  completed: Set<string>;
  generating: Set<string>;
  onGenerate: (motorId: string) => void;
  onDownload: (motorId: string, format: DownloadFormat) => void;
  onBack: () => void;
}

function GenerateStep({
  selectedTopicIds,
  motors,
  completed,
  generating,
  onGenerate,
  onDownload,
  onBack,
}: GenerateStepProps) {
  return (
    <div>
      <div style={{ ...STEP_STYLES.card, marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Genera tu material
        </h2>
        <p style={{ fontSize: '0.8125rem', color: '#6b6b80' }}>
          Selecciona que quieres generar para tus {selectedTopicIds.size} temas.
        </p>
      </div>

      <div style={STEP_STYLES.motorGrid}>
        {MOTOR_OPTIONS.map((opt) => {
          const motor = motors[opt.id];
          const isCompleted = completed.has(opt.id);
          const isGenerating = generating.has(opt.id);
          const isLoading = motor?.loading ?? false;
          const isSimulated = motor?.simulated ?? false;
          const quality = motor?.quality as QualityScore | null | undefined;
          const cultural = motor?.cultural as CulturalContext | null | undefined;

          // Low quality warning: score < 60 and not loading
          const isLowQuality = quality && quality.overall < 60;

          return (
            <div key={opt.id} style={STEP_STYLES.motorCard(isCompleted, isSimulated)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{opt.icon}</span>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{opt.label}</h3>
                {isCompleted && quality && (
                  <div style={{ marginLeft: 'auto' }}>
                    <QualityBadge quality={quality} />
                  </div>
                )}
                {isSimulated && isCompleted && (
                  <span style={{
                    padding: '0.125rem 0.5rem',
                    background: '#FFF3CD',
                    border: '1px solid #FFC107',
                    borderRadius: '4px',
                    fontSize: '0.6875rem',
                    color: '#856404',
                    fontWeight: 600,
                  }}>
                    ⚠️ SIMULADO
                  </span>
                )}
              </div>
              {/* Cultural sensitivity indicator */}
              {cultural?.detected && (
                <div style={{ marginTop: '0.25rem' }}>
                  <CulturalIndicator cultural={cultural} />
                </div>
              )}
              {/* Low quality warning */}
              {isLowQuality && !isLoading && (
                <div style={{
                  marginTop: '0.25rem',
                  padding: '0.25rem 0.5rem',
                  background: '#FEF3C7',
                  border: '1px solid #F59E0B',
                  borderRadius: '4px',
                  fontSize: '0.6875rem',
                  color: '#92400E',
                  fontWeight: 500,
                }}>
                  ⚠️ Calidad baja: algunas mejoras recomendadas
                </div>
              )}
              <p style={{ fontSize: '0.8125rem', color: '#6b6b80', flex: 1 }}>
                {opt.description}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => onGenerate(opt.id)}
                  disabled={isLoading || isGenerating}
                  style={STEP_STYLES.buttonPrimary(isLoading || isGenerating)}
                >
                  {isLoading || isGenerating ? 'Generando...' : isCompleted ? 'Regenerar' : 'Generar'}
                </button>
                {isCompleted && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => onDownload(opt.id, 'pptx')}
                      style={{
                        ...STEP_STYLES.buttonSecondary,
                        color: '#3A9E5E',
                        borderColor: '#3A9E5E',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.75rem',
                      }}
                    >
                      📊 PPTX
                    </button>
                    <button
                      type="button"
                      onClick={() => onDownload(opt.id, 'pdf')}
                      style={{
                        ...STEP_STYLES.buttonSecondary,
                        color: '#3A9E5E',
                        borderColor: '#3A9E5E',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.75rem',
                      }}
                      title="PDF"
                    >
                      📄 PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => onDownload(opt.id, 'docx')}
                      style={{
                        ...STEP_STYLES.buttonSecondary,
                        color: '#3A9E5E',
                        borderColor: '#3A9E5E',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.75rem',
                      }}
                      title="DOCX"
                    >
                      📝 DOCX
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-start' }}>
        <button type="button" onClick={onBack} style={STEP_STYLES.buttonSecondary}>
          ← Atrás
        </button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function WizardPage() {
  const { showToast } = useToast();
  const { user } = useAuth();

  // Read teacher context (used by both generate and download flows).
  // FIX BUG-X2: spread this into motor params so the LLM knows who the teacher is,
  // what school, what grade — generated content references the teacher's class
  // instead of being generic.
  const getTeacherContext = () => {
    const storedV2 = JSON.parse(localStorage.getItem('pria_teacher_config_v2') || '{}');
    const stored = Object.keys(storedV2).length > 0 ? storedV2 : JSON.parse(localStorage.getItem('pria_teacher_config') || '{}');
    return {
      profesor: stored.nombreDocente || stored.nombre || user?.nombre || '',
      colegio: stored.colegio || stored.escuela || '',
      ciudad: stored.ciudad || '',
      grado: stored.grado || user?.grado || '5to de Primaria',
      materia: stored.materia || 'Lenguaje y Comunicación',
      ano_escolar: stored.anoEscolar || String(new Date().getFullYear()),
    };
  };

  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [_selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());
  const [rawText, setRawText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Motors
  const synthesis = useMotorGenerator<SynthesisOutput>('synthesis', showToast);
  const plan = useMotorGenerator<PlanOutput>('plan', showToast);
  const slides = useMotorGenerator<SlidesOutput>('slides', showToast);
  const quiz = useMotorGenerator<QuizOutput>('quiz', showToast);
  const sourceNarrator = useMotorGenerator<SourceNarratorOutput>('source_narrator', showToast);

  const motors = {
    synthesis: { ...synthesis, loading: synthesis.loading },
    plan: { ...plan, loading: plan.loading },
    slides: { ...slides, loading: slides.loading },
    quiz: { ...quiz, loading: quiz.loading },
    source_narrator: { ...sourceNarrator, loading: sourceNarrator.loading },
  };

  // Generation state
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  // Teacher institutional config state
  const [teacherConfigOpen, setTeacherConfigOpen] = useState(false);
  const [teacherConfig, setTeacherConfig] = useState<TeacherInfo>({
    objetivoAprendizaje: '',
    duracionEstimadaMinutos: undefined,
    areaCurricular: '',
    fuente: { titulo: '', autor: '', editorial: '', anio: undefined, paginasUsadas: '' },
  });

  // Load teacher config from localStorage on mount (read v2, fall back to legacy, migrate)
  useEffect(() => {
    // Read v2 first, fall back to legacy key only if v2 is empty
    const storedV2 = JSON.parse(localStorage.getItem('pria_teacher_config_v2') || '{}');
    const legacy = JSON.parse(localStorage.getItem('pria_teacher_config') || '{}');
    const stored = Object.keys(storedV2).length > 0 ? storedV2 : legacy;
    if (Object.keys(stored).length > 0) {
      setTeacherConfig({
        objetivoAprendizaje: stored.objetivoAprendizaje || '',
        duracionEstimadaMinutos: stored.duracionEstimadaMinutos || undefined,
        areaCurricular: stored.areaCurricular || '',
        fuente: {
          titulo: stored.fuente?.titulo || '',
          autor: stored.fuente?.autor || '',
          editorial: stored.fuente?.editorial || '',
          anio: stored.fuente?.anio || undefined,
          paginasUsadas: stored.fuente?.paginasUsadas || '',
        },
      });
      // Migrate legacy → v2 so future reads always use v2
      if (Object.keys(legacy).length > 0 && Object.keys(storedV2).length === 0) {
        localStorage.setItem('pria_teacher_config_v2', JSON.stringify(legacy));
      }
    }
  }, []);

  // Save teacher config to localStorage whenever it changes
  const saveTeacherConfig = (config: TeacherInfo) => {
    setTeacherConfig(config);
    localStorage.setItem('pria_teacher_config_v2', JSON.stringify(config));
  };

  const handleTeacherConfigChange = (field: keyof TeacherInfo, value: any) => {
    saveTeacherConfig({ ...teacherConfig, [field]: value });
  };

  const handleFuenteChange = (field: string, value: string | number | undefined) => {
    saveTeacherConfig({
      ...teacherConfig,
      fuente: { ...teacherConfig.fuente!, [field]: value },
    });
  };

  // Load materials on mount
  useEffect(() => {
    listMaterials()
      .then(setMaterials)
      .catch(() => showToast('No se pudieron cargar los materiales', 'error'));
  }, [showToast]);

  // Parse units when rawText is long enough (async AI fallback)
  useEffect(() => {
    if (rawText.length > 100) {
      (async () => {
        const parsed = await extractUnitsWithAI(rawText, 'Lenguaje y Comunicación');
        if (parsed.length > 0) setUnits(parsed);
      })();
    }
  }, [rawText]);

  const loadMaterials = () => {
    listMaterials()
      .then(setMaterials)
      .catch(() => showToast('No se pudieron cargar los materiales', 'error'));
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 15, 60));
    }, 200);

    try {
      // Step 1: Upload file to backend
      const uploaded = await uploadMaterial(file, 'texto');
      clearInterval(interval);
      setUploadProgress(60);

      // Step 2: Extract text from PDF client-side (backend doesn't parse PDFs)
      setSelectedMaterial(uploaded);
      const { ingestDocument } = await import('../lib/ingest/documentIngester');
      const ingestResult: IngestResult = await ingestDocument(file, (_stage, percent) => {
        setUploadProgress(Math.round(60 + percent * 0.3));
      });

      setRawText(ingestResult.fullText);

      setUploading(false);
      setUploadProgress(100);

      if (ingestResult.ok && ingestResult.fullText && ingestResult.fullText.length > 50) {
        // Step 3: Parse units from extracted text
        const parsedUnits = await extractUnitsWithAI(ingestResult.fullText, 'Lenguaje y Comunicación');

        if (parsedUnits.length > 0) {
          setUnits(parsedUnits);

          // Step 4: Save units to backend for future retrieval
          const token = localStorage.getItem(TOKEN_KEY);
          fetch(`/api/materials/${uploaded.id}/units`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ units: parsedUnits }),
          }).catch(e => console.warn('Failed to save units:', e));

          showToast(`Libro procesado: ${parsedUnits.length} unidad(es) detectada(s)`, 'success');
        } else {
          setUnits([]);
          showToast('Texto extraído pero sin unidades detectadas. Continúa para usar los temas manualmente.', 'info');
        }
      } else {
        setUnits([]);
        const isScanned = ingestResult.warnings?.some(w => w.code === 'OCR_USED');
        showToast(
          isScanned
            ? 'PDF escaneado detectado. El OCR puede estar aún procesando. Intenta de nuevo o sube una imagen.'
            : 'No se pudo extraer texto del PDF. ¿Es un PDF escaneado (imagen)?',
          'warning'
        );
      }

      loadMaterials();
      setCurrentStep('select');
    } catch {
      clearInterval(interval);
      setUploading(false);
      setUploadProgress(0);
      showToast('Error al procesar el archivo. Intenta de nuevo.', 'error');
    }
  };

  const handleSelectExisting = async (m: Material) => {
    setSelectedMaterial(m);

    // Load units from backend
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await fetch(`/api/materials/${m.id}/units`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        setUnits(data.data);
        setRawText('');
        setCurrentStep('select');
        showToast(`${m.filename}: ${data.data.length} unidad(es) cargada(s)`, 'success');
      } else {
        // No units saved — this material was likely uploaded via old wizard flow
        setUnits([]);
        setRawText('');
        setCurrentStep('select');
        showToast('Este libro aún no tiene unidades procesadas. Puedes re-subirlo desde el paso anterior.', 'info');
      }
    } catch (err) {
      console.warn('Failed to load units:', err);
      setUnits([]);
      setRawText('');
      setCurrentStep('select');
    }
  };

  const handleContinueToSelect = () => {
    if (rawText.length > 0) {
      setCurrentStep('select');
    }
  };

  const handleContinueToGenerate = () => {
    if (selectedTopicIds.size > 0) {
      setCurrentStep('generate');
    }
  };

  const handleGenerate = async (motorId: string) => {
    // Collect selected topics text
    const selectedUnits = units.filter((u) =>
      u.topics.some((t) => selectedTopicIds.has(t.id))
    );
    const selectedTopics = selectedUnits.flatMap((u) =>
      u.topics.filter((t) => selectedTopicIds.has(t.id))
    );

    if (selectedTopics.length === 0) {
      showToast('Selecciona al menos un tema', 'warning');
      return;
    }

    // Motor-specific params mapping (M1b slides expects different fields than M0a synthesis)
    const baseParams = {
      temas: selectedTopics.map((t) => t.topicName),
      grado_nivel: '5to Primaria',
      unidad_real: selectedUnits[0]?.name || 'Unidad 1',
      full_text: selectedTopics.map((t) => t.fullText || t.textExcerpt).join('\n'),
    };

    // M1b slides motor: ONE topic = ONE deck (10 slides about that topic)
    // The motor's M1b schema expects conceptos_clave to be KEY CONCEPTS for the topic,
    // not the list of all selected topics.
    const firstTopic = selectedTopics[0];
    const topicText = firstTopic?.fullText || firstTopic?.textExcerpt || '';
    
    // Extract key concepts and vocabulary from the topic's fullText
    const topicWords = topicText.split(/\s+/).filter(w => w.length > 4);
    const topicSentences = topicText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
    const extractConcepts = topicSentences.slice(0, 3);
    
    const slidesParams = {
      tema_clase: firstTopic?.topicName || baseParams.unidad_real,
      conceptos_clave: extractConcepts.length > 0 
        ? extractConcepts 
        : [firstTopic?.topicName || 'Concepto principal'],
      palabras_clave: topicWords.slice(0, 8),
      objetivo_general: `Comprender y aplicar los conceptos clave de "${firstTopic?.topicName || baseParams.unidad_real}"`,
      grado_nivel: baseParams.grado_nivel,
      full_text: topicText,
    };

    // M1a plan motor: similar structure
    const planParams = {
      tema_clase: firstTopic?.topicName || baseParams.unidad_real,
      conceptos_clave: extractConcepts.length > 0 
        ? extractConcepts 
        : [firstTopic?.topicName || 'Concepto principal'],
      palabras_clave: topicWords.slice(0, 8),
      objetivo_general: `Comprender y aplicar los conceptos clave de "${firstTopic?.topicName || baseParams.unidad_real}"`,
      grado_nivel: baseParams.grado_nivel,
      full_text: topicText,
    };

    // M2a quiz motor params: palabras_clave, proyecto_pbl, grado_nivel
    const quizParams = {
      palabras_clave: firstTopic ? [firstTopic.topicName] : [],
      proyecto_pbl: `Proyecto sobre ${baseParams.unidad_real}`,
      grado_nivel: baseParams.grado_nivel,
    };

    const params = baseParams;

    // M0.5 Source Narrator params - used to enrich downstream motors
    const sourceNarratorParams = {
      tema_clase: firstTopic?.topicName || baseParams.unidad_real,
      full_text: topicText,
      palabras_clave: topicWords.slice(0, 8),
    };

    try {
      if (motorId === 'synthesis') {
        await synthesis.generate({ ...params, ...getTeacherContext() });
        setCompleted((prev) => new Set([...prev, motorId]));
        if (synthesis.simulated) {
          showToast('⚠️ Generado con datos simulados (la IA no respondió). Vuelve a intentar o contacta soporte.', 'warning');
        }
      } else if (motorId === 'plan') {
        // M0.5 chain: generate narrative first, then pass to plan
        const narrativeResult = await sourceNarrator.generate(sourceNarratorParams);
        const planParamsWithNarrative = {
          ...planParams,
          narrative_extract: narrativeResult as SourceNarratorOutput | null,
        };
        await plan.generate({ ...planParamsWithNarrative, ...getTeacherContext() });
        setCompleted((prev) => new Set([...prev, motorId]));
        if (plan.simulated) {
          showToast('⚠️ Generado con datos simulados (la IA no respondió). Vuelve a intentar o contacta soporte.', 'warning');
        }
      } else if (motorId === 'slides') {
        // M0.5 chain: generate narrative first, then pass to slides
        const narrativeResult = await sourceNarrator.generate(sourceNarratorParams);
        const slidesParamsWithNarrative = {
          ...slidesParams,
          narrative_extract: narrativeResult as SourceNarratorOutput | null,
        };
        await slides.generate({ ...slidesParamsWithNarrative, ...getTeacherContext() });
        setCompleted((prev) => new Set([...prev, motorId]));
        if (slides.simulated) {
          showToast('⚠️ Generado con datos simulados (la IA no respondió). Vuelve a intentar o contacta soporte.', 'warning');
        }
      } else if (motorId === 'quiz') {
        // M0.5 chain: generate narrative first, then pass to quiz
        const narrativeResult = await sourceNarrator.generate(sourceNarratorParams);
        const quizParamsWithNarrative = {
          ...quizParams,
          narrative_extract: narrativeResult as SourceNarratorOutput | null,
        };
        await quiz.generate({ ...quizParamsWithNarrative, ...getTeacherContext() });
        setCompleted((prev) => new Set([...prev, motorId]));
        if (quiz.simulated) {
          showToast('⚠️ Generado con datos simulados (la IA no respondió). Vuelve a intentar o contacta soporte.', 'warning');
        }
      }
    } catch {
      showToast('Error al generar el material', 'error');
    }
  };

  const handleDownload = async (motorId: string, format: DownloadFormat = 'pptx') => {
    const motorKey = motorId as keyof typeof motors;
    const result = motors[motorKey]?.result;
    if (!result) {
      showToast('Primero genera el material', 'warning');
      return;
    }

    // Read teacher config from localStorage v2 (with fallback to old key for migration)
    const storedV2 = JSON.parse(localStorage.getItem('pria_teacher_config_v2') || '{}');
    const stored = Object.keys(storedV2).length > 0 ? storedV2 : JSON.parse(localStorage.getItem('pria_teacher_config') || '{}');
    const teacherInfo: TeacherInfo = {
      // FIX BUG-005: fall back to authenticated user's name when localStorage is empty.
      // The wizard's institutional config form does NOT collect nombreDocente/colegio/etc.
      nombre: stored.nombreDocente || stored.nombre || user?.nombre || '',
      email: stored.email || '',
      // BUG-005 follow-up: fall back to known seed defaults when localStorage is empty.
      // In production, these would come from a settings page or admin roster.
      escuela: stored.colegio || stored.escuela || 'Unidad Educativa San Andrés',
      ciudad: stored.ciudad || 'La Paz',
      grado: stored.grado || user?.grado || '5to de Primaria',
      materia: stored.materia || 'Lenguaje y Comunicación',
      anoEscolar: stored.anoEscolar || String(new Date().getFullYear()),
      objetivoAprendizaje: stored.objetivoAprendizaje || teacherConfig.objetivoAprendizaje,
      duracionEstimadaMinutos: stored.duracionEstimadaMinutos || teacherConfig.duracionEstimadaMinutos,
      areaCurricular: stored.areaCurricular || teacherConfig.areaCurricular,
      fuente: stored.fuente || teacherConfig.fuente,
    };

    // Topic suffix for filename
    const topicSuffix = selectedTopicIds.size > 0
      ? '_' + Array.from(selectedTopicIds).slice(0, 2).join('_').slice(0, 40)
      : '';

    try {
      if (format === 'pptx') {
        showToast('Generando PPTX...', 'info');
        if (!['synthesis', 'plan', 'slides', 'quiz'].includes(motorId)) {
          showToast('Motor no soportado', 'error');
          return;
        }

        await downloadServerPptx(motorId, result, teacherInfo, topicSuffix);
        showToast('PPTX descargado', 'success');

      } else if (format === 'pdf') {
        showToast('Generando PDF...', 'info');
        const { exportToPDF } = await import('../lib/export/pdf');
        try {
          const blob = await exportToPDF(result, teacherInfo);
          const filename = `PRIA_${motorId}${topicSuffix}_${Date.now()}.pdf`;
          downloadBlob(blob, filename);
          showToast('PDF descargado', 'success');
        } catch (pdfErr: any) {
          if (pdfErr.message.includes('not yet implemented')) {
            showToast('PDF: ' + pdfErr.message, 'warning');
          } else {
            throw pdfErr;
          }
        }

      } else if (format === 'docx') {
        showToast('Generando DOCX...', 'info');
        const { exportToDOCX } = await import('../lib/export/docx');
        try {
          const blob = await exportToDOCX(result, teacherInfo);
          const filename = `PRIA_${motorId}${topicSuffix}_${Date.now()}.docx`;
          downloadBlob(blob, filename);
          showToast('DOCX descargado', 'success');
        } catch (docxErr: any) {
          if (docxErr.message.includes('not yet implemented')) {
            showToast('DOCX: ' + docxErr.message, 'warning');
          } else {
            throw docxErr;
          }
        }
      }
    } catch (err: any) {
      console.error('[handleDownload] Error:', err);
      console.error('[handleDownload] Error stack:', err?.stack);
      console.error('[handleDownload] Error message:', err?.message);
      showToast(`Error: ${err?.message || String(err)}`, 'error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8f8fa' }}>
      <Header
        title="Crear material"
        subtitle="3 pasos para tu plan de clase"
      />

      <div style={STEP_STYLES.container}>
        {/* Step indicator */}
        <div style={STEP_STYLES.stepIndicator}>
          <div style={STEP_STYLES.stepDot(currentStep === 'upload')}>
            1. Sube
          </div>
          <div style={STEP_STYLES.stepDot(currentStep === 'select')}>
            2. Selecciona
          </div>
          <div style={STEP_STYLES.stepDot(currentStep === 'generate')}>
            3. Genera
          </div>
        </div>

        {/* Step content */}
        {currentStep === 'upload' && (
          <>
            {/* Institutional Config collapsible */}
            <div style={{ ...STEP_STYLES.card, marginBottom: '1rem', padding: '0.75rem 1rem' }}>
              <button
                type="button"
                onClick={() => setTeacherConfigOpen(!teacherConfigOpen)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#3A9E5E' }}>
                  📋 Configuración Institucional
                  <span style={{ fontWeight: 400, color: '#6b6b80', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                    (para portadas y exports)
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#6b6b80' }}>
                  {teacherConfigOpen ? '▲ Ocultar' : '▼ Mostrar'}
                </span>
              </button>

              {teacherConfigOpen && (
                <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
                  {/* Área curricular */}
                  <div>
                    <label htmlFor="area-curricular" style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b6b80', display: 'block', marginBottom: '0.25rem' }}>
                      Área Curricular
                    </label>
                    <input
                      id="area-curricular"
                      type="text"
                      value={teacherConfig.areaCurricular || ''}
                      onChange={(e) => handleTeacherConfigChange('areaCurricular', e.target.value)}
                      placeholder="Ej: Lenguaje y Comunicación"
                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.8125rem', border: '1px solid #e6e6eb', borderRadius: '6px' }}
                    />
                  </div>

                  {/* Duración estimada */}
                  <div>
                    <label htmlFor="duracion-minutos" style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b6b80', display: 'block', marginBottom: '0.25rem' }}>
                      Duración Estimada (minutos)
                    </label>
                    <input
                      id="duracion-minutos"
                      type="number"
                      value={teacherConfig.duracionEstimadaMinutos || ''}
                      onChange={(e) => handleTeacherConfigChange('duracionEstimadaMinutos', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Ej: 45"
                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.8125rem', border: '1px solid #e6e6eb', borderRadius: '6px' }}
                    />
                  </div>

                  {/* Objetivo de aprendizaje */}
                  <div>
                    <label htmlFor="objetivo-aprendizaje" style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b6b80', display: 'block', marginBottom: '0.25rem' }}>
                      Objetivo de Aprendizaje
                    </label>
                    <textarea
                      id="objetivo-aprendizaje"
                      value={teacherConfig.objetivoAprendizaje || ''}
                      onChange={(e) => handleTeacherConfigChange('objetivoAprendizaje', e.target.value)}
                      placeholder="Ej: Los estudiantes comprenderán los conceptos básicos de..."
                      rows={2}
                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.8125rem', border: '1px solid #e6e6eb', borderRadius: '6px', resize: 'vertical' }}
                    />
                  </div>

                  {/* Fuente */}
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b6b80', marginBottom: '0.25rem' }}>
                      Fuente del Material
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <input
                        type="text"
                        value={teacherConfig.fuente?.titulo || ''}
                        onChange={(e) => handleFuenteChange('titulo', e.target.value)}
                        placeholder="Título del libro"
                        aria-label="Título del libro"
                        style={{ padding: '0.5rem', fontSize: '0.8125rem', border: '1px solid #e6e6eb', borderRadius: '6px' }}
                      />
                      <input
                        type="text"
                        value={teacherConfig.fuente?.autor || ''}
                        onChange={(e) => handleFuenteChange('autor', e.target.value)}
                        placeholder="Autor"
                        aria-label="Autor"
                        style={{ padding: '0.5rem', fontSize: '0.8125rem', border: '1px solid #e6e6eb', borderRadius: '6px' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <input
                        type="text"
                        value={teacherConfig.fuente?.editorial || ''}
                        onChange={(e) => handleFuenteChange('editorial', e.target.value)}
                        placeholder="Editorial"
                        aria-label="Editorial"
                        style={{ padding: '0.5rem', fontSize: '0.8125rem', border: '1px solid #e6e6eb', borderRadius: '6px' }}
                      />
                      <input
                        type="number"
                        value={teacherConfig.fuente?.anio || ''}
                        onChange={(e) => handleFuenteChange('anio', e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="Año"
                        aria-label="Año de publicación"
                        style={{ padding: '0.5rem', fontSize: '0.8125rem', border: '1px solid #e6e6eb', borderRadius: '6px' }}
                      />
                      <input
                        type="text"
                        value={teacherConfig.fuente?.paginasUsadas || ''}
                        onChange={(e) => handleFuenteChange('paginasUsadas', e.target.value)}
                        placeholder="Páginas"
                        aria-label="Páginas usadas"
                        style={{ padding: '0.5rem', fontSize: '0.8125rem', border: '1px solid #e6e6eb', borderRadius: '6px' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <UploadStep
              materials={materials}
              uploading={uploading}
              progress={uploadProgress}
              onUpload={handleUpload}
              onSelectExisting={handleSelectExisting}
              onContinue={handleContinueToSelect}
              hasFile={rawText.length > 0}
            />
          </>
        )}

        {currentStep === 'select' && (
          <SelectStep
            units={units}
            selectedTopicIds={selectedTopicIds}
            onSelectionChange={setSelectedTopicIds}
            onContinue={handleContinueToGenerate}
            onBack={() => setCurrentStep('upload')}
          />
        )}

        {currentStep === 'generate' && (
          <GenerateStep
            selectedTopicIds={selectedTopicIds}
            motors={motors}
            completed={completed}
            generating={new Set()}
            onGenerate={handleGenerate}
            onDownload={handleDownload}
            onBack={() => setCurrentStep('select')}
          />
        )}
      </div>
    </div>
  );
}
