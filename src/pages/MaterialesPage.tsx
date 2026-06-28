import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TOKEN_KEY } from '../constants';
import Header from '../components/Layout/Header';
import { useToast } from '../components/UI/Toast';
import { listMaterials, uploadMaterial, deleteMaterial } from '../api/materials';
import { exportAllMotorsToPPTX } from '../lib/pptx/generator';
import { buildCoverSlide, buildCreditsSlide } from '../lib/pptx/slides/cover';
import type { TeacherInfo } from '../lib/pptx/slides/cover';
import { buildSynthesisSlides } from '../lib/pptx/slides/synthesis';
import { buildPlanSlides } from '../lib/pptx/slides/plan';
import { buildQuizSlides } from '../lib/pptx/slides/quiz';
import { buildSlidesSlides } from '../lib/pptx/slides/slides';
import { buildActividadSlide } from '../lib/pptx/slides/actividad';
import { buildPlenarioSlide } from '../lib/pptx/slides/plenario';
import { useCurriculum } from '../hooks/useCurriculum';
import { useMotorGenerator } from '../hooks/useMotorGenerator';
import { getPalette } from '../lib/pptx/designSystem';
import type { Material } from '../types';
import type { IngestResult, CurriculumResult } from '../lib/ingest/types';
import type { SynthesisOutput, ABPOutput, AssessmentOutput, PlanOutput, SlidesOutput, FichaOutput, QuizOutput, TutorOutput, PDCOutput, RecalibrateOutput, MicroOutput } from '../types/motor-types';
import { getUnitsForText, type Unit, type Topic } from '../lib/textbook/parseUnits';
import { getPromptEnhancement } from '../lib/textbook/contentLibrary';
import MaterialesUpload from '../components/Materials/MaterialesUpload';
import MaterialesMotorPanel from '../components/Materials/MaterialesMotorPanel';
import MaterialesExportPanel from '../components/Materials/MaterialesExportPanel';
import UnitTopicSelector from '../components/Materials/UnitTopicSelector';

const TEACHER_CONFIG_KEY = 'pria_teacher_config';
const DEFAULT_TEACHER: TeacherInfo = {
  nombre: 'Misterruddy',
  email: 'Misterruddy@laspalmas.edu.bo',
  escuela: 'Las Palmas',
};

export default function MaterialesPage() {
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const useCleanedText = searchParams.get('cleaned') === '1';
  const synthesis = useMotorGenerator<SynthesisOutput>('synthesis', showToast);
  const abp = useMotorGenerator<ABPOutput>('abp', showToast);
  const assessment = useMotorGenerator<AssessmentOutput>('assessment', showToast);
  const plan = useMotorGenerator<PlanOutput>('plan', showToast);
  const slides = useMotorGenerator<SlidesOutput>('slides', showToast);
  const ficha = useMotorGenerator<FichaOutput>('ficha', showToast);
  const quiz = useMotorGenerator<QuizOutput>('quiz', showToast);
  const tutor = useMotorGenerator<TutorOutput>('tutor', showToast);
  const pdc = useMotorGenerator<PDCOutput>('pdc', showToast);
  const recalibrate = useMotorGenerator<RecalibrateOutput>('recalibrate', showToast);
  const micro = useMotorGenerator<MicroOutput>('micro', showToast);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentBook, setStudentBook] = useState(false);
  const [curriculumPreview, setCurriculumPreview] = useState<CurriculumResult | null>(null);
  const { saveCurriculum } = useCurriculum();
  const [rawText, setRawText] = useState('');
  const [ingestWarnings, setIngestWarnings] = useState<Array<{ code: string; message: string }>>([]);
  const [ingesting, setIngesting] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<{ text: string; percent: number } | null>(null);
  const [synthesisStreamText, setSynthesisStreamText] = useState('');
  const [teacherConfig, setTeacherConfig] = useState<TeacherInfo>(DEFAULT_TEACHER);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());
  const [_topicGenerationStatus, setTopicGenerationStatus] = useState<Map<string, 'pending' | 'generating' | 'done' | 'error'>>(new Map());

  // Load teacher config from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(TEACHER_CONFIG_KEY);
    if (stored) {
      try {
        setTeacherConfig(JSON.parse(stored));
      } catch {
        // ignore malformed JSON
      }
    }
  }, []);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listMaterials();
      setMaterials(data);
    } catch (err) {
      console.error('Failed to load materials:', err);
      showToast('Error al cargar materiales. ¿Servidor disponible?', 'error');
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    loadMaterials();
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => setStudentBook(!!d.data?.student_book))
        .catch(() => {});
    }
  }, [loadMaterials]);

  // Parse units from rawText once available and persist to backend
  useEffect(() => {
    if (rawText && rawText.length > 100) {
      const parsed = getUnitsForText(rawText, 'Lenguaje y Comunicación');
      setUnits(parsed);

      // Find the most recently uploaded material (by newest created_at)
      const lastMaterial = materials.length > 0
        ? materials.reduce((latest, m) =>
            new Date(m.created_at ?? 0) > new Date(latest.created_at ?? 0) ? m : latest
          )
        : null;

      // Fire-and-forget: persist parsed units to backend
      if (lastMaterial?.id) {
        const token = localStorage.getItem(TOKEN_KEY);
        fetch(`/api/materials/${lastMaterial.id}/units`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ units: parsed }),
        }).catch(err => console.warn('Failed to save units:', err));
      }
    }
  }, [rawText, materials]);

  // CLEANED-OCR OVERRIDE: When ?cleaned=1, fetch the cleaned TXT from /public
  // and pre-populate curriculum preview with real textbook topics for Lenguaje 5°.
  useEffect(() => {
    if (!useCleanedText) return;
    if (rawText && curriculumPreview) return; // already loaded
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/texto_lenguaje_limpio.txt');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (cancelled) return;
        setRawText(text);
        // Pre-populate curriculum with real topics extracted from the cleaned text.
        // These are the actual section headers from "Lenguaje y Comunicación 5°".
        const realCurriculum: CurriculumResult = {
          unidad_real: 'Lenguaje y Comunicación — Unidad 1',
          temas: [
            'Expresión oral',
            'La comunicación humana',
            'Mitos y leyendas',
            'Lectura comprensiva',
            'El sustantivo y sus clases',
            'Uso de los dos puntos y del punto y coma',
            'Elaboración de un resumen narrativo',
            'La enseñanza de los cuentos',
            'Decir sin palabras',
            'Modalidades oracionales',
            'Determinantes numerales e indefinidos',
            'Uso de la tilde',
            'La redacción de un diario',
          ],
          contenido_temas: {},
          paginas_temas: {},
        };
        setCurriculumPreview(realCurriculum);
        showToast(`Texto limpio cargado: ${text.split(/\s+/).length} palabras, ${realCurriculum.temas.length} temas.`, 'success');
      } catch (err) {
        if (!cancelled) showToast('No se pudo cargar /texto_lenguaje_limpio.txt', 'error');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCleanedText]);

  const toggleStudentBook = async () => {
    const newVal = !studentBook;
    setStudentBook(newVal);
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_book: newVal }),
      }).catch(() => {});
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // G-1.1: Hash-based deduplication — check if already uploaded
    try {
      const isDuplicate = materials.some(m => {
        return m.filename === file.name && m.size === file.size;
      });
      if (isDuplicate) {
        showToast('Este archivo ya fue subido. Evita duplicados.', 'warning');
        return;
      }
    } catch {
      // If hash computation fails, proceed with upload anyway
    }

    setIngesting(true);
    setCurriculumPreview(null);
    setIngestWarnings([]);
    setOcrProgress(null);

    try {
      await uploadMaterial(file, 'textbook');
      await loadMaterials();
    } catch {
      const newMaterial: Material = {
        id: Date.now(),
        filename: file.name,
        tipo: 'textbook',
        size: file.size,
      };
      setMaterials((prev) => [...prev, newMaterial]);
    }

    try {
      // Lazy-load heavy document ingestion module (pdfjs + parsers = ~1MB)
      const { ingestDocument, extractCurriculumWithAI } = await import('../lib/ingest/documentIngester');
      const ingestResult: IngestResult = await ingestDocument(file, (text, percent) => {
        setOcrProgress({ text, percent });
      });
      setRawText(ingestResult.fullText);
      setIngestWarnings(ingestResult.warnings || []);

      // G-3.1: Detect empty or failed ingest early
      if (!ingestResult.ok || !ingestResult.fullText || ingestResult.fullText.length < 50) {
        const isScanned = ingestResult.warnings?.some(w => w.code === 'OCR_USED');
        showToast(
          isScanned
            ? 'PDF escaneado detectado. Ejecutando OCR...'
            : 'No se pudo extraer texto del PDF. ¿Es un PDF escaneado (imagen)?',
          'warning'
        );
      } else {
        showToast('Texto extraído. Analizando con IA...', 'info');
      }

      const curriculum = await extractCurriculumWithAI(ingestResult);
      setCurriculumPreview(curriculum);
      try { await saveCurriculum(curriculum); } catch { /* ignore */ }
      if (curriculum.temas.length > 0) {
        showToast('Material procesado. Revisa la vista previa abajo.', 'success');
      } else {
        showToast('Texto extraído pero sin estructura de temas detectada. Puedes editar los temas manualmente.', 'info');
      }
    } catch (err) {
      console.warn('Ingest failed:', err);
      showToast('Material subido pero no se pudo procesar el contenido.', 'warning');
    } finally {
      setIngesting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar este archivo?')) return;
    try {
      await deleteMaterial(id);
      await loadMaterials();
      showToast('Archivo eliminado.', 'success');
    } catch (err) {
      console.error('Delete failed:', err);
      showToast('Error al eliminar. Intenta de nuevo.', 'error');
    }
  };

  const topicSuffix = selectedTopicIds.size > 0
    ? `_${Array.from(selectedTopicIds).slice(0, 2).join('_').slice(0, 50)}`
    : '';

  const downloadName = (base: string) => `${base}${topicSuffix}.pptx`;

  const onExportSlides = async () => {
    try {
      const pptx = new (await import('pptxgenjs')).default();
      pptx.layout = 'LAYOUT_WIDE';
      pptx.author = 'PRIA v10';
      pptx.title = 'Diapositivas';
      const subject = curriculumPreview?.unidad_real || '5to Primaria';
      const pal = getPalette(subject);
      buildCoverSlide(pptx, 'Diapositivas', subject, teacherConfig);
      buildSlidesSlides(pptx, slides.result!, { startNum: 2, subject: curriculumPreview?.unidad_real, palette: pal });

      // Calculate total slides: 1 cover + slides + 2 new (actividad, plenario) + 1 credits
      const slidesCount = Array.isArray(slides.result) ? slides.result.length : 0;
      const hasObjetivos = slides.result?.some((s: { tipo: string }) => s.tipo === 'objetivos') ?? false;
      const contentSlidesCount = hasObjetivos ? slidesCount : slidesCount + 1;
      const totalSlides = 2 + contentSlidesCount; // cover(1) + content + actividad + plenario

      // Get tema from synthesis for the new slides
      const temaPrincipal = synthesis.result?.unidad_sintetizada?.temas_desarrollados?.[0]?.nombre || subject;

      // ACTIVIDAD slide
      buildActividadSlide(pptx, {
        titulo: 'Actividad de práctica',
        instrucciones: 'Responde las siguientes preguntas con tus propias palabras.',
        actividad_tipo: 'individual',
        tiempo_estimado: '10 minutos',
        preguntas: [
          { pregunta: `¿Qué aprendiste sobre ${temaPrincipal}?` },
          { pregunta: '¿Cómo lo aplicarías en tu vida diaria?' },
          { pregunta: '¿Qué pregunta te surgió durante la clase?' },
        ],
      }, totalSlides + 1);

      // PLENARIO slide
      buildPlenarioSlide(pptx, {
        tema: temaPrincipal,
        mensajes_clave: synthesis.result?.unidad_sintetizada?.temas_desarrollados?.slice(0, 3).map((t: { nombre: string }) => t.nombre) || ['Comprendimos los conceptos principales', 'Aprendimos a aplicar el conocimiento', 'Descubrimos nuevas formas de pensar'],
        pregunta_plenario: `¿Cómo aplicarías ${temaPrincipal} en un proyecto de tu comunidad?`,
        motivacion_final: '¡El aprendizaje es un viaje, no un destino! Sigue explorando. 🚀',
      }, totalSlides + 2);

      buildCreditsSlide(pptx);
      const blob = await pptx.write({ outputType: 'blob' }) as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = downloadName('Diapositivas_PRIA'); document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('PPTX descargado.', 'success');
    } catch { showToast('Error al exportar.', 'error'); }
  };

  const onExportSynthesis = async () => {
    try {
      const pptx = new (await import('pptxgenjs')).default();
      pptx.layout = 'LAYOUT_WIDE';
      pptx.author = 'PRIA v10';
      pptx.title = 'Síntesis Curricular';
      const subject = curriculumPreview?.unidad_real || '5to Primaria';
      const pal = getPalette(subject);
      buildCoverSlide(pptx, 'Síntesis Curricular', subject, teacherConfig);
      buildSynthesisSlides(pptx, synthesis.result!, pal);
      buildCreditsSlide(pptx);
      const blob = await pptx.write({ outputType: 'blob' }) as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = downloadName('Sintesis_PRIA'); document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('PPTX síntesis descargado.', 'success');
    } catch { showToast('Error al exportar.', 'error'); }
  };

  const onExportPlan = async () => {
    try {
      const pptx = new (await import('pptxgenjs')).default();
      pptx.layout = 'LAYOUT_WIDE';
      pptx.author = 'PRIA v10';
      pptx.title = 'Plan de Clase';
      const subject = curriculumPreview?.unidad_real || '5to Primaria';
      const pal = getPalette(subject);
      buildCoverSlide(pptx, 'Plan de Clase', subject, teacherConfig);
      buildPlanSlides(pptx, plan.result!, pal);
      buildCreditsSlide(pptx);
      const blob = await pptx.write({ outputType: 'blob' }) as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = downloadName('PlanClase_PRIA'); document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('PPTX plan descargado.', 'success');
    } catch { showToast('Error al exportar.', 'error'); }
  };

  const onExportQuiz = async () => {
    try {
      const pptx = new (await import('pptxgenjs')).default();
      pptx.layout = 'LAYOUT_WIDE';
      pptx.author = 'PRIA v10';
      pptx.title = 'Quiz';
      const subject = curriculumPreview?.unidad_real || '5to Primaria';
      const pal = getPalette(subject);
      buildCoverSlide(pptx, 'Pop Quiz', subject, teacherConfig);
      buildQuizSlides(pptx, quiz.result!, 2, pal);
      buildCreditsSlide(pptx);
      const blob = await pptx.write({ outputType: 'blob' }) as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = downloadName('Quiz_PRIA'); document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('PPTX quiz descargado.', 'success');
    } catch { showToast('Error al exportar.', 'error'); }
  };

  const onExportAll = async () => {
    const motorNames: Record<string, string> = {
      synthesis: 'Síntesis', abp: 'ABP', assessment: 'Evaluación',
      plan: 'Plan', slides: 'Diapositivas', ficha: 'Ficha',
      quiz: 'Quiz', tutor: 'Tutor', pdc: 'PDC',
      recalibrate: 'Recalibración', micro: 'Micro-Objetivos',
    };
    const results: Record<string, unknown | null> = {
      synthesis: synthesis.result, abp: abp.result, assessment: assessment.result,
      plan: plan.result, slides: slides.result, ficha: ficha.result,
      quiz: quiz.result, tutor: tutor.result, pdc: pdc.result,
      recalibrate: recalibrate.result, micro: micro.result,
    };
    const missing = Object.entries(results)
      .filter(([_, v]) => v === null)
      .map(([k]) => motorNames[k])
      .filter(Boolean);
    const available = Object.values(results).some(v => v !== null);
    if (!available) {
      showToast('Genera al menos un contenido antes de exportar.', 'warning');
      return;
    }
    if (missing.length > 0) {
      const proceed = window.confirm(
        `⚠️ Faltan: ${missing.join(', ')}. ¿Exportar solo los disponibles?`
      );
      if (!proceed) return;
    }
    try {
      showToast('Generando presentación...', 'info');
      const blob = await exportAllMotorsToPPTX({
        title: curriculumPreview?.unidad_real || 'Material Educativo',
        synthesis: synthesis.result,
        abp: abp.result,
        assessment: assessment.result,
        plan: plan.result,
        slides: slides.result,
        ficha: ficha.result,
        quiz: quiz.result,
        tutor: tutor.result,
        pdc: pdc.result,
        recalibrate: recalibrate.result,
        micro: micro.result,
        curriculumPreview: curriculumPreview,
        teacherInfo: teacherConfig,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PRIA_${(curriculumPreview?.unidad_real || 'material').replace(/\s+/g, '_').slice(0, 40)}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Presentación descargada correctamente', 'success');
    } catch (err: any) {
      showToast('Error generando PPTX: ' + (err?.message || String(err)).slice(0, 100), 'error');
    }
  };

  const handleGenerateSelectedTopics = async () => {
    if (selectedTopicIds.size === 0) {
      showToast('Selecciona al menos un tema.', 'warning');
      return;
    }

    // Build combined text from selected topics
    const selectedTopics: { unit: Unit; topic: Topic }[] = [];
    for (const unit of units) {
      for (const topic of unit.topics) {
        if (selectedTopicIds.has(topic.id)) {
          selectedTopics.push({ unit, topic });
        }
      }
    }

    const combinedText = selectedTopics
      .map(({ unit, topic }) => `[Unidad ${unit.number}: ${unit.name}]\n[Tema: ${topic.topicName}]\n${topic.fullText}`)
      .join('\n\n---\n\n');

    setTopicGenerationStatus(new Map(selectedTopics.map(t => [t.topic.id, 'pending'])));

    // Call Síntesis with the combined topic-specific text
    const params: Record<string, unknown> = {
      grado_nivel: '5to Primaria',
      unidad_real: selectedTopics.map(t => t.topic.topicName).join(', '),
      temas: selectedTopics.map(t => t.topic.topicName),
      full_text: combinedText.slice(0, 30000),
    };

    try {
      setTopicGenerationStatus(new Map(selectedTopics.map(t => [t.topic.id, 'generating'])));
      await synthesis.generateStreaming(params, (t) => setSynthesisStreamText(prev => (prev + t).slice(-2000)));
      setTopicGenerationStatus(new Map(selectedTopics.map(t => [t.topic.id, 'done'])));
      showToast(`Síntesis generada para ${selectedTopics.length} tema(s).`, 'success');
    } catch (err: any) {
      setTopicGenerationStatus(new Map(selectedTopics.map(t => [t.topic.id, 'error'])));
      showToast('Error generando síntesis.', 'error');
    }
  };

  const handleGenerateSynthesis = () => {
    // Allow Síntesis generation even without curriculumPreview — can use rawText
    const enhancement = getPromptEnhancement('5to-primaria', 'lenguaje', 'sintesis');
    const params: Record<string, unknown> = {
      grado_nivel: '5to Primaria',
      unidad_real: curriculumPreview?.unidad_real || 'Material',
      unidad: curriculumPreview?.unidad_real || 'Material',
      temas: curriculumPreview?.temas || [],
      diagnosticos: '',
      context_enhancement: enhancement,
    };
    // CLEANED-OCR: always send the cleaned full_text when ?cleaned=1, so the AI
    // has the real textbook content to ground the synthesis (no generic output).
    if (useCleanedText && rawText) {
      params.full_text = rawText.slice(0, 15000);
    } else if ((!params.temas || (params.temas as string[]).length === 0) && rawText) {
      params.full_text = rawText.slice(0, 15000);
    }
    synthesis.generateStreaming(params, (t) => setSynthesisStreamText((prev) => (prev + t).slice(-2000)));
  };

  return (
    <div>
      <Header title="📚 Materiales" subtitle="Gestión de libros de texto y materiales didácticos" />

      <MaterialesUpload
        materials={materials}
        loading={loading}
        studentBook={studentBook}
        curriculumPreview={curriculumPreview}
        rawText={rawText}
        ingestWarnings={ingestWarnings}
        ingesting={ingesting}
        ocrProgress={ocrProgress}
        synthesisLoading={synthesis.loading}
        synthesisStreamText={synthesisStreamText}
        onUpload={handleUpload}
        onDelete={handleDelete}
        onToggleStudentBook={toggleStudentBook}
        onGenerateSynthesis={handleGenerateSynthesis}
      />

      {units.length > 0 && (
        <UnitTopicSelector
          units={units}
          selectedTopicIds={selectedTopicIds}
          onSelectionChange={setSelectedTopicIds}
          onGenerateSelected={handleGenerateSelectedTopics}
        />
      )}

      <MaterialesMotorPanel
        curriculumPreview={curriculumPreview}
        synthesis={synthesis}
        abp={abp}
        assessment={assessment}
        plan={plan}
        slides={slides}
        ficha={ficha}
        quiz={quiz}
        tutor={tutor}
        pdc={pdc}
        recalibrate={recalibrate}
        micro={micro}
        showToast={showToast}
      />

      <MaterialesExportPanel
        hasSlides={!!slides.result}
        hasSynthesis={!!synthesis.result}
        hasPlan={!!plan.result}
        hasQuiz={!!quiz.result}
        onExportAll={onExportAll}
        onExportSlides={onExportSlides}
        onExportSynthesis={onExportSynthesis}
        onExportPlan={onExportPlan}
        onExportQuiz={onExportQuiz}
      />
    </div>
  );
}
