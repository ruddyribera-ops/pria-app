import { useState, useEffect, useRef } from 'react';
import Header from '../components/Layout/Header';
import { useToast } from '../components/UI/Toast';
import { listMaterials, uploadMaterial } from '../api/materials';
import { TOKEN_KEY } from '../constants';
import { useMotorGenerator } from '../hooks/useMotorGenerator';
import { getUnitsForText, type Unit } from '../lib/textbook/parseUnits';
import UnitTopicSelector from '../components/Materials/UnitTopicSelector';
import type { SynthesisOutput, PlanOutput, SlidesOutput, QuizOutput, AnyMotorOutput, SourceNarratorOutput } from '../types/motor-types';
import type { Material } from '../types';
import PptxGenJS from 'pptxgenjs';
import { buildCoverSlide, buildCreditsSlide } from '../lib/pptx/slides/cover';
import type { TeacherInfo } from '../lib/export/pdf';
import { buildSynthesisSlides } from '../lib/pptx/slides/synthesis';
import { buildPlanSlides } from '../lib/pptx/slides/plan';
import { buildSlidesSlides } from '../lib/pptx/slides/slides';
import { buildQuizSlides } from '../lib/pptx/slides/quiz';
import { getPalette } from '../lib/pptx/designSystem';

type WizardStep = 'upload' | 'select' | 'generate';

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
  motorCard: (ready: boolean) => ({
    background: '#fff',
    border: `1px solid ${ready ? '#3A9E5E' : '#e6e6eb'}`,
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

          return (
            <div key={opt.id} style={STEP_STYLES.motorCard(isCompleted)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{opt.icon}</span>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{opt.label}</h3>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#6b6b80', flex: 1 }}>
                {opt.description}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
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
                        color: '#6b6b80',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.75rem',
                      }}
                      title="PDF (próximamente)"
                    >
                      📄 PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => onDownload(opt.id, 'docx')}
                      style={{
                        ...STEP_STYLES.buttonSecondary,
                        color: '#6b6b80',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.75rem',
                      }}
                      title="DOCX (próximamente)"
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

  // Load materials on mount
  useEffect(() => {
    listMaterials()
      .then(setMaterials)
      .catch(() => showToast('No se pudieron cargar los materiales', 'error'));
  }, [showToast]);

  // Parse units when rawText is long enough
  useEffect(() => {
    if (rawText.length > 100) {
      const parsed = getUnitsForText(rawText);
      setUnits(parsed);
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

    // Simulate progress
    const interval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 15, 90));
    }, 200);

    try {
      const uploaded = await uploadMaterial(file, 'texto');
      clearInterval(interval);
      setUploadProgress(100);

      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        setSelectedMaterial(uploaded);
        // Use mock text for demo since real PDF parsing would need OCR
        setRawText('mock textbook content for unit parsing');
        showToast('Libro subido exitosamente', 'success');
        loadMaterials();
      }, 400);
    } catch {
      clearInterval(interval);
      setUploading(false);
      setUploadProgress(0);
      showToast('Error al subir el archivo', 'error');
    }
  };

  const handleSelectExisting = async (m: Material) => {
    setSelectedMaterial(m);
    showToast(`Seleccionaste: ${m.filename}`, 'info');

    // Load units from backend
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await fetch(`/api/materials/${m.id}/units`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        setUnits(data.data);
        setRawText(''); // No need for rawText since we have units
        setCurrentStep('select');
      } else {
        // No units saved yet for this material
        setUnits([]);
        setRawText('');
        setCurrentStep('select');
        showToast('Este libro no tiene unidades detectadas. Sube el PDF de nuevo.', 'info');
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
    void slidesParams; void planParams; void quizParams;

    // M0.5 Source Narrator params - used to enrich downstream motors
    const sourceNarratorParams = {
      tema_clase: firstTopic?.topicName || baseParams.unidad_real,
      full_text: topicText,
      palabras_clave: topicWords.slice(0, 8),
    };

    try {
      if (motorId === 'synthesis') {
        await synthesis.generate(params);
        setCompleted((prev) => new Set([...prev, motorId]));
      } else if (motorId === 'plan') {
        // M0.5 chain: generate narrative first, then pass to plan
        await sourceNarrator.generate(sourceNarratorParams);
        const narrativeResult = sourceNarrator.result;
        const planParamsWithNarrative = {
          ...planParams,
          narrative_extract: narrativeResult as SourceNarratorOutput | null,
        };
        await plan.generate(planParamsWithNarrative);
        setCompleted((prev) => new Set([...prev, motorId]));
      } else if (motorId === 'slides') {
        // M0.5 chain: generate narrative first, then pass to slides
        await sourceNarrator.generate(sourceNarratorParams);
        const narrativeResult = sourceNarrator.result;
        const slidesParamsWithNarrative = {
          ...slidesParams,
          narrative_extract: narrativeResult as SourceNarratorOutput | null,
        };
        await slides.generate(slidesParamsWithNarrative);
        setCompleted((prev) => new Set([...prev, motorId]));
      } else if (motorId === 'quiz') {
        // M0.5 chain: generate narrative first, then pass to quiz
        await sourceNarrator.generate(sourceNarratorParams);
        const narrativeResult = sourceNarrator.result;
        const quizParamsWithNarrative = {
          ...quizParams,
          narrative_extract: narrativeResult as SourceNarratorOutput | null,
        };
        await quiz.generate(quizParamsWithNarrative);
        setCompleted((prev) => new Set([...prev, motorId]));
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

    // Read teacher config from localStorage
    const teacherInfo: TeacherInfo = JSON.parse(localStorage.getItem('pria_teacher_config') || '{}');

    // Topic suffix for filename
    const topicSuffix = selectedTopicIds.size > 0
      ? '_' + Array.from(selectedTopicIds).slice(0, 2).join('_').slice(0, 40)
      : '';

    try {
      if (format === 'pptx') {
        showToast('Generando PPTX...', 'info');
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_WIDE';
        pptx.author = 'PRIA v10';

        const subject = Array.from(selectedTopicIds).length > 0
          ? 'Lenguaje y Comunicación'
          : 'General';
        const pal = getPalette(subject);

        let title = '';
        let blob: Blob;

        if (motorId === 'synthesis') {
          title = 'Síntesis Curricular';
          pptx.title = title;
          buildCoverSlide(pptx, title, pal, teacherInfo);
          buildSynthesisSlides(pptx, result as SynthesisOutput, pal, teacherInfo);
          buildCreditsSlide(pptx);
          blob = await pptx.write({ outputType: 'blob' }) as Blob;
        } else if (motorId === 'plan') {
          title = 'Plan de Clase';
          pptx.title = title;
          buildCoverSlide(pptx, title, pal, teacherInfo);
          buildPlanSlides(pptx, result as PlanOutput, pal, teacherInfo);
          buildCreditsSlide(pptx);
          blob = await pptx.write({ outputType: 'blob' }) as Blob;
        } else if (motorId === 'slides') {
          title = 'Diapositivas';
          pptx.title = title;
          buildCoverSlide(pptx, title, pal, teacherInfo);
          buildSlidesSlides(pptx, result as SlidesOutput, { palette: pal });
          buildCreditsSlide(pptx);
          blob = await pptx.write({ outputType: 'blob' }) as Blob;
        } else if (motorId === 'quiz') {
          title = 'Pop Quiz';
          pptx.title = title;
          buildCoverSlide(pptx, title, pal, teacherInfo);
          buildQuizSlides(pptx, result as QuizOutput, 1, pal);
          buildCreditsSlide(pptx);
          blob = await pptx.write({ outputType: 'blob' }) as Blob;
        } else {
          showToast('Motor no soportado', 'error');
          return;
        }

        const filename = `PRIA_${motorId}${topicSuffix}_${Date.now()}.pptx`;
        downloadBlob(blob, filename);
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

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

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
          <UploadStep
            materials={materials}
            uploading={uploading}
            progress={uploadProgress}
            onUpload={handleUpload}
            onSelectExisting={handleSelectExisting}
            onContinue={handleContinueToSelect}
            hasFile={rawText.length > 0}
          />
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
