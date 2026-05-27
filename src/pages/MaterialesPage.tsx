import { useState, useEffect, useCallback } from 'react';
import { TOKEN_KEY } from '../constants';
import Header from '../components/Layout/Header';
import { useToast } from '../components/UI/Toast';
import { listMaterials, uploadMaterial, deleteMaterial, getMockMaterials } from '../api/materials';
import { ingestDocument, extractCurriculumWithAI, type IngestResult, type CurriculumResult } from '../lib/ingest/documentIngester';
import { exportSlidesToPPTX, exportContentToPPTX, exportAllMotorsToPPTX } from '../lib/pptx/generator';
import { useCurriculum } from '../hooks/useCurriculum';
import { useMotorGenerator } from '../hooks/useMotorGenerator';
import type { Material } from '../types';
import type { SynthesisOutput, ABPOutput, AssessmentOutput, PlanOutput, SlidesOutput, FichaOutput, QuizOutput, TutorOutput, PDCOutput, RecalibrateOutput, MicroOutput } from '../types/motor-types';
import UploadZone from '../components/Materials/UploadZone';
import FileList from '../components/Materials/FileList';
import MotorButton from '../components/Materials/MotorButton';
import CurriculumPreview from '../components/Materials/CurriculumPreview';
import MotorSection_Synthesis from '../components/Motores/MotorSection_Synthesis';
import MotorSection_ABP from '../components/Motores/MotorSection_ABP';
import MotorSection_Assessment from '../components/Motores/MotorSection_Assessment';
import MotorSection_Plan from '../components/Motores/MotorSection_Plan';
import MotorSection_Slides from '../components/Motores/MotorSection_Slides';
import MotorSection_Ficha from '../components/Motores/MotorSection_Ficha';
import MotorSection_Quiz from '../components/Motores/MotorSection_Quiz';
import MotorSection_Tutor from '../components/Motores/MotorSection_Tutor';
import MotorSection_PDC from '../components/Motores/MotorSection_PDC';
import MotorSection_Recalibrate from '../components/Motores/MotorSection_Recalibrate';
import MotorSection_Micro from '../components/Motores/MotorSection_Micro';
import MotorSection_Export from '../components/Motores/MotorSection_Export';
import MotorButtonRow from '../components/Motores/MotorButtonRow';

const SimulatedBanner = () => (
  <div style={{
    margin: '0 1rem 1rem',
    padding: '0.5rem 1rem',
    background: '#FFF3CD',
    border: '1px solid #FFC107',
    borderRadius: '6px',
    fontSize: '0.75rem',
    color: '#856404',
  }}>
    ⚠️ IA no disponible — contenido simulado con fines ilustrativos.
  </div>
);

export default function MaterialesPage() {
  const { showToast } = useToast();
  const synthesis = useMotorGenerator<SynthesisOutput>('synthesis', showToast as (msg: string, type?: string) => void);
  const abp = useMotorGenerator<ABPOutput>('abp', showToast as (msg: string, type?: string) => void);
  const assessment = useMotorGenerator<AssessmentOutput>('assessment', showToast as (msg: string, type?: string) => void);
  const plan = useMotorGenerator<PlanOutput>('plan', showToast as (msg: string, type?: string) => void);
  const slides = useMotorGenerator<SlidesOutput>('slides', showToast as (msg: string, type?: string) => void);
  const ficha = useMotorGenerator<FichaOutput>('ficha', showToast as (msg: string, type?: string) => void);
  const quiz = useMotorGenerator<QuizOutput>('quiz', showToast as (msg: string, type?: string) => void);
  const tutor = useMotorGenerator<TutorOutput>('tutor', showToast as (msg: string, type?: string) => void);
  const pdc = useMotorGenerator<PDCOutput>('pdc', showToast as (msg: string, type?: string) => void);
  const recalibrate = useMotorGenerator<RecalibrateOutput>('recalibrate', showToast as (msg: string, type?: string) => void);
  const micro = useMotorGenerator<MicroOutput>('micro', showToast as (msg: string, type?: string) => void);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentBook, setStudentBook] = useState(false);
  const [curriculumPreview, setCurriculumPreview] = useState<CurriculumResult | null>(null);
  const { saveCurriculum } = useCurriculum();
  const [rawText, setRawText] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [synthesisStreamText, setSynthesisStreamText] = useState('');
  const onExportSlides = () => { try { exportSlidesToPPTX(slides.result!, { title: curriculumPreview?.unidad_real || 'Diapositivas', subtitle: '5to Primaria' }); showToast('PPTX descargado.', 'success'); } catch { showToast('Error al exportar.', 'error'); } };
  const onExportSynthesis = () => { try { exportContentToPPTX('Síntesis', synthesis.result!, { title: 'Síntesis', subtitle: '5to Primaria' }); showToast('PPTX síntesis descargado.', 'success'); } catch { showToast('Error al exportar.', 'error'); } };
  const onExportPlan = () => { try { exportContentToPPTX('Plan', plan.result!, { title: 'Plan de Clase', subtitle: '5to Primaria' }); showToast('PPTX plan descargado.', 'success'); } catch { showToast('Error al exportar.', 'error'); } };
  const onExportQuiz = () => { try { exportContentToPPTX('Quiz', quiz.result!, { title: 'Pop Quiz', subtitle: '5to Primaria' }); showToast('PPTX quiz descargado.', 'success'); } catch { showToast('Error al exportar.', 'error'); } };
  const onExportAll = async () => {
    const hasResults = [synthesis.result, abp.result, assessment.result, plan.result, slides.result, ficha.result, quiz.result, tutor.result, pdc.result, recalibrate.result, micro.result].some(v => v !== null);
    if (!hasResults) {
      showToast('Genera al menos un contenido antes de exportar.', 'warning');
      return;
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
  const loadMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listMaterials();
      setMaterials(data);
    } catch {
      setMaterials(getMockMaterials());
    }
    setLoading(false);
  }, []);

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

    setIngesting(true);
    setCurriculumPreview(null);

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
      const ingestResult: IngestResult = await ingestDocument(file);
      setRawText(ingestResult.fullText);
      showToast('Texto extraído. Analizando con IA...', 'info');
      const curriculum = await extractCurriculumWithAI(ingestResult);
      setCurriculumPreview(curriculum);
      try { await saveCurriculum(curriculum); } catch { /* ignore */ }
      if (curriculum.temas.length > 0) {
        showToast('Material procesado. Revisa la vista previa abajo.', 'success');
      } else {
        showToast('Texto extraído pero sin estructura de temas detectada.', 'info');
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
      showToast('Archivo eliminado correctamente.', 'success');
    } catch {
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      showToast('Archivo eliminado correctamente.', 'success');
    }
  };

  return (
    <div>
      <Header title="📚 Materiales" subtitle="Gestión de libros de texto y materiales didácticos" />

      {/* Upload Area */}
      <UploadZone onUpload={handleUpload} ingesting={ingesting} />

      {/* Student Book Toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem',
        background: '#fff', border: '1px solid #e6e6eb', borderRadius: '8px', padding: '0.75rem 1rem',
      }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1e1e2f' }}>¿Usa Student Book?</span>
        <button
          onClick={toggleStudentBook}
          style={{
            position: 'relative', width: '44px', height: '24px',
            background: studentBook ? '#3A9E5E' : '#e6e6eb',
            borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'all .2s',
          }}
        >
          <span style={{
            position: 'absolute', top: '2px', left: studentBook ? '22px' : '2px',
            width: '20px', height: '20px', background: '#fff', borderRadius: '50%',
            transition: 'all .25s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }} />
        </button>
        <span style={{ fontSize: '0.75rem', color: '#6b6b80' }}>{studentBook ? 'Sí' : 'No'}</span>
      </div>

      {/* File List */}
      <FileList materials={materials} loading={loading} onDelete={handleDelete} />

      {/* Loading / Processing indicator */}
      {ingesting && (
        <div style={{
          padding: '1rem', textAlign: 'center', color: '#6b6b80', fontSize: '0.8125rem',
          background: '#f8f8fa', borderRadius: '8px', marginTop: '1rem',
        }}>
          ⏳ Procesando contenido del libro de texto...
        </div>
      )}

      {/* Curriculum Preview */}
      {curriculumPreview && (
        <CurriculumPreview
          curriculumPreview={curriculumPreview}
          rawText={rawText}
          generatingSynthesis={synthesis.loading}
          synthesisStreamText={synthesisStreamText}
          onGenerateSynthesis={() => {
            if (!curriculumPreview || curriculumPreview.temas.length === 0) { showToast('Primero extrae los temas del PDF.', 'warning'); return; }
            synthesis.generate({ grado_nivel: '5to Primaria', unidad_real: curriculumPreview.unidad_real, unidad: curriculumPreview.unidad_real, temas: curriculumPreview.temas, diagnosticos: '' }, (t) => setSynthesisStreamText(t.slice(0, 500)));
          }}
        />
      )}

      {/* Motor Sections */}
      <MotorSection_Synthesis
        result={synthesis.result}
        curriculumPreview={curriculumPreview}
        loading={synthesis.loading}
        onGenerate={() => {
          abp.generate({ grado_nivel: '5to Primaria', unidad_json: JSON.stringify(synthesis.result), diagnosticos: '', recursos_aula: ['pizarra', 'libro de texto', 'materiales de arte'] });
        }}
        showToast={showToast}
      />
      {synthesis.simulated && synthesis.result && <SimulatedBanner />}

      <MotorSection_ABP result={abp.result} />
      {abp.simulated && abp.result && <SimulatedBanner />}

      {abp.result && (
        <MotorButton
          label="📊 Generar Rúbrica y Evaluación"
          loadingLabel="📊 Generando evaluación..."
          color="#9333EA"
          onClick={() => {
            if (!abp.result) { showToast('Primero genera el proyecto ABP.', 'warning'); return; }
            assessment.generate({ grado_nivel: '5to Primaria', proyecto_pbl: abp.result?.proyecto?.titulo || 'Proyecto', unidad_json: JSON.stringify(synthesis.result), diagnosticos: '' });
          }}
          loading={assessment.loading}
        />
      )}
      <MotorSection_Assessment result={assessment.result} />
      {assessment.simulated && assessment.result && <SimulatedBanner />}

      {curriculumPreview && curriculumPreview.temas.length > 0 && (
        <MotorButton
          label="📋 Generar Plan de Clase (45 min)"
          loadingLabel="📋 Generando plan..."
          color="#D97706"
          onClick={() => {
            if (!curriculumPreview || curriculumPreview.temas.length === 0) { showToast('Primero extrae los temas.', 'warning'); return; }
            plan.generate({ grado_nivel: '5to Primaria', tema_clase: curriculumPreview.temas[0], conceptos_clave: curriculumPreview.temas.slice(0, 3), palabras_clave: curriculumPreview.temas, diagnosticos: '', objetivo_general: 'Comprender los conceptos fundamentales de ' + curriculumPreview.temas[0] });
          }}
          loading={plan.loading}
        />
      )}
      <MotorSection_Plan result={plan.result} />
      {plan.simulated && plan.result && <SimulatedBanner />}

      <MotorButtonRow
        curriculumPreview={curriculumPreview}
        onGenerateSlides={() => {
          if (!curriculumPreview || curriculumPreview.temas.length === 0) return;
          slides.generate({ grado_nivel: '5to Primaria', tema_clase: curriculumPreview.temas[0], palabras_clave: curriculumPreview.temas });
        }}
        slidesLoading={slides.loading}
        onGenerateFicha={() => {
          if (!curriculumPreview || curriculumPreview.temas.length === 0) return;
          ficha.generate({ grado_nivel: '5to Primaria', tema: curriculumPreview.temas[0], conceptos_clave: curriculumPreview.temas.slice(0, 3) });
        }}
        fichaLoading={ficha.loading}
      />
      <MotorSection_Slides result={slides.result} />
      {slides.simulated && slides.result && <SimulatedBanner />}

      <MotorSection_Ficha result={ficha.result} />
      {ficha.simulated && ficha.result && <SimulatedBanner />}

      {curriculumPreview && curriculumPreview.temas.length > 0 && (
        <MotorButton
          label="❓ Generar Pop Quiz (5 min)"
          loadingLabel="❓ Generando quiz..."
          color="#7C3AED"
          onClick={() => {
            if (!curriculumPreview || curriculumPreview.temas.length === 0) return;
            quiz.generate({ grado_nivel: '5to Primaria', palabras_clave: curriculumPreview.temas, tema_clase: curriculumPreview.temas[0] });
          }}
          loading={quiz.loading}
        />
      )}
      <MotorSection_Quiz result={quiz.result} />
      {quiz.simulated && quiz.result && <SimulatedBanner />}

      {synthesis.result && (
        <MotorButton
          label="👩‍🏫 Generar Panel del Tutor"
          loadingLabel="👩‍🏫 Generando..."
          color="#0891B2"
          onClick={() => {
            if (!synthesis.result) { showToast('Primero genera la síntesis.', 'warning'); return; }
            tutor.generate({ grado_nivel: '5to Primaria', unidad_json: JSON.stringify(synthesis.result), diagnosticos: '', temas: curriculumPreview?.temas || [] });
          }}
          loading={tutor.loading}
        />
      )}
      <MotorSection_Tutor result={tutor.result} />
      {tutor.simulated && tutor.result && <SimulatedBanner />}

      {plan.result && (
        <MotorButton
          label="📅 Generar PDC Trimestral"
          loadingLabel="📅 Generando..."
          color="#6D28D9"
          onClick={() => {
            if (!plan.result) { showToast('Primero genera el plan de clase.', 'warning'); return; }
            pdc.generate({ grado_nivel: '5to Primaria', nivel: 'Primaria', grado: '5to', materia: curriculumPreview?.temas?.[0] || 'Ciencias Sociales', unidad_real: curriculumPreview?.unidad_real || 'Unidad 1', temas: curriculumPreview?.temas || [], plan_json: JSON.stringify(plan.result), diagnosticos: '' });
          }}
          loading={pdc.loading}
        />
      )}
      <MotorSection_PDC result={pdc.result} />
      {pdc.simulated && pdc.result && <SimulatedBanner />}

      {assessment.result && (
        <MotorButton
          label="🔄 Generar Recalibración Adaptativa"
          loadingLabel="🔄 Generando..."
          color="#EA580C"
          onClick={() => {
            if (!assessment.result) { showToast('Primero genera la evaluación.', 'warning'); return; }
            recalibrate.generate({ grado_nivel: '5to Primaria', evaluacion_json: JSON.stringify(assessment.result), unidad_json: JSON.stringify(synthesis.result), diagnosticos: '' });
          }}
          loading={recalibrate.loading}
        />
      )}
      <MotorSection_Recalibrate result={recalibrate.result} />
      {recalibrate.simulated && recalibrate.result && <SimulatedBanner />}

      {plan.result && (
        <MotorButton
          label="🎯 Generar Micro-Objetivos Diarios"
          loadingLabel="🎯 Generando..."
          color="#DB2777"
          onClick={() => {
            if (!plan.result) { showToast('Primero genera el plan de clase.', 'warning'); return; }
            micro.generate({ grado_nivel: '5to Primaria', unidad_real: curriculumPreview?.unidad_real || 'Unidad 1', plan_json: JSON.stringify(plan.result), temas: curriculumPreview?.temas || [], diagnosticos: '' });
          }}
          loading={micro.loading}
        />
      )}
      <MotorSection_Micro result={micro.result} />
      {micro.simulated && micro.result && <SimulatedBanner />}

      <MotorSection_Export
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