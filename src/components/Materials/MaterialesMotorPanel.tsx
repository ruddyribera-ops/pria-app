import type { CurriculumResult } from '../../lib/ingest/types';
import type { SynthesisOutput, ABPOutput, AssessmentOutput, PlanOutput, SlidesOutput, FichaOutput, QuizOutput, TutorOutput, PDCOutput, RecalibrateOutput, MicroOutput } from '../../types/motor-types';
import type { FidelityReport } from '../../lib/ai/minimaxClient';
import MotorButton from '../Materials/MotorButton';
import MotorSection_Synthesis from '../Motores/MotorSection_Synthesis';
import MotorSection_ABP from '../Motores/MotorSection_ABP';
import MotorSection_Assessment from '../Motores/MotorSection_Assessment';
import MotorSection_Plan from '../Motores/MotorSection_Plan';
import MotorSection_Slides from '../Motores/MotorSection_Slides';
import InlineSlideEditor from '../Motores/InlineSlideEditor';
import MotorSection_Ficha from '../Motores/MotorSection_Ficha';
import MotorSection_Quiz from '../Motores/MotorSection_Quiz';
import MotorSection_Tutor from '../Motores/MotorSection_Tutor';
import MotorSection_PDC from '../Motores/MotorSection_PDC';
import MotorSection_Recalibrate from '../Motores/MotorSection_Recalibrate';
import MotorSection_Micro from '../Motores/MotorSection_Micro';
import MotorButtonRow from '../Motores/MotorButtonRow';
import styles from './MaterialesMotorPanel.module.css';

interface MotorHook {
  result: unknown;
  loading: boolean;
  simulated: boolean;
  generate: (params: Record<string, unknown>, onStream?: (text: string) => void) => Promise<void>;
  generateStreaming: (params: Record<string, unknown>, onStream?: (text: string) => void) => Promise<void>;
}

interface Props {
  curriculumPreview: CurriculumResult | null;
  synthesis: MotorHook & { result: SynthesisOutput | null };
  abp: MotorHook & { result: ABPOutput | null };
  assessment: MotorHook & { result: AssessmentOutput | null };
  plan: MotorHook & { result: PlanOutput | null };
  slides: MotorHook & { result: SlidesOutput | null; fidelity?: FidelityReport | null };
  ficha: MotorHook & { result: FichaOutput | null };
  quiz: MotorHook & { result: QuizOutput | null };
  tutor: MotorHook& { result: TutorOutput | null };
  pdc: MotorHook& { result: PDCOutput | null };
  recalibrate: MotorHook & { result: RecalibrateOutput | null };
  micro: MotorHook & { result: MicroOutput | null };
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const SimulatedBanner = () => (
  <div className={styles.simulatedBanner}>
    ✨ Vista previa generada. Edita los parámetros para refinar.
  </div>
);

export default function MaterialesMotorPanel({
  curriculumPreview,
  synthesis,
  abp,
  assessment,
  plan,
  slides,
  ficha,
  quiz,
  tutor,
  pdc,
  recalibrate,
  micro,
  showToast,
}: Props) {
  return (
    <>
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
          label="📊 Diseñar evaluación"
          loadingLabel="📊 Diseñando evaluación..."
          color="#9333EA"
          progressPhases={['Definiendo criterios', 'Creando niveles', 'Alineando al currículo', 'Puliendo detalles']}
          onClick={() => {
            if (!abp.result) { showToast('Primero crea el proyecto ABP.', 'warning'); return; }
            assessment.generate({ grado_nivel: '5to Primaria', proyecto_pbl: abp.result?.proyecto?.titulo || 'Proyecto', unidad_json: JSON.stringify(synthesis.result), diagnosticos: '' });
          }}
          loading={assessment.loading}
        />
      )}
      <MotorSection_Assessment result={assessment.result} />
      {assessment.simulated && assessment.result && <SimulatedBanner />}

      {(curriculumPreview?.temas?.length ?? 0) > 0 || synthesis.result ? (
        <MotorButton
          label="📋 Planificar los 45 minutos"
          loadingLabel="📋 Planificando la clase..."
          color="#D97706"
          progressPhases={['Leyendo el tema', 'Estructurando 4 momentos', 'Añadiendo pausas kinestésicas', 'Puliendo actividades']}
          onClick={() => {
            const curriculumTemas: string[] = curriculumPreview?.temas ?? [];
            const synthesisTemas: string[] = synthesis.result?.unidad_sintetizada?.temas_desarrollados?.map((t: { nombre: string }) => t.nombre) ?? [];
            const temas = curriculumTemas.length > 0 ? curriculumTemas : synthesisTemas;
            if (!temas.length) { showToast('Primero genera la Síntesis o carga un material con temas.', 'warning'); return; }
            plan.generate({ grado_nivel: '5to Primaria', tema_clase: temas[0], conceptos_clave: temas.slice(0, 3), palabras_clave: temas, diagnosticos: '', objetivo_general: 'Comprender los conceptos fundamentales de ' + temas[0] });
          }}
          loading={plan.loading}
        />
      ) : null}
      <MotorSection_Plan result={plan.result} />
      {plan.simulated && plan.result && <SimulatedBanner />}

      <MotorButtonRow
        curriculumPreview={curriculumPreview ?? undefined}
        synthesis={synthesis.result}
        onGenerateSlides={() => {
          const curriculumTemas: string[] = curriculumPreview?.temas ?? [];
          const synthesisTemas: string[] = synthesis.result?.unidad_sintetizada?.temas_desarrollados?.map((t: { nombre: string }) => t.nombre) ?? [];
          const temas = curriculumTemas.length > 0 ? curriculumTemas : synthesisTemas;
          if (!temas.length) { showToast('Primero genera la Síntesis o carga un material con temas.', 'warning'); return; }
          slides.generate({ grado_nivel: '5to Primaria', tema_clase: temas[0], palabras_clave: temas });
        }}
        slidesLoading={slides.loading}
        onGenerateFicha={() => {
          const curriculumTemas: string[] = curriculumPreview?.temas ?? [];
          const synthesisTemas: string[] = synthesis.result?.unidad_sintetizada?.temas_desarrollados?.map((t: { nombre: string }) => t.nombre) ?? [];
          const temas = curriculumTemas.length > 0 ? curriculumTemas : synthesisTemas;
          if (!temas.length) { showToast('Primero genera la Síntesis o carga un material con temas.', 'warning'); return; }
          ficha.generate({ grado_nivel: '5to Primaria', tema: temas[0], conceptos_clave: temas.slice(0, 3) });
        }}
        fichaLoading={ficha.loading}
      />
      <MotorSection_Slides result={slides.result} fidelity={slides.fidelity} showToast={showToast} />
      {slides.result && !slides.simulated && (
        <InlineSlideEditor
          result={slides.result}
          fullText={curriculumPreview?.unidad_real ? undefined : undefined}
          showToast={showToast}
        />
      )}
      {slides.simulated && slides.result && <SimulatedBanner />}

      <MotorSection_Ficha result={ficha.result} />
      {ficha.simulated && ficha.result && <SimulatedBanner />}

      {(curriculumPreview?.temas?.length ?? 0) > 0 || synthesis.result ? (
        <MotorButton
          label="❓ Crear quiz rápido (5 min)"
          loadingLabel="❓ Preparando preguntas..."
          color="#7C3AED"
          progressPhases={['Seleccionando conceptos clave', 'Creando preguntas variadas', 'Añadiendo adaptaciones DUA']}
          onClick={() => {
            const curriculumTemas: string[] = curriculumPreview?.temas ?? [];
            const synthesisTemas: string[] = synthesis.result?.unidad_sintetizada?.temas_desarrollados?.map((t: { nombre: string }) => t.nombre) ?? [];
            const temas = curriculumTemas.length > 0 ? curriculumTemas : synthesisTemas;
            if (!temas.length) { showToast('Primero genera la Síntesis o carga un material con temas.', 'warning'); return; }
            quiz.generate({ grado_nivel: '5to Primaria', palabras_clave: temas, tema_clase: temas[0] });
          }}
          loading={quiz.loading}
        />
      ) : null}
      <MotorSection_Quiz result={quiz.result} />
      {quiz.simulated && quiz.result && <SimulatedBanner />}

      {synthesis.result && (
        <MotorButton
          label="👩‍🏫 Preparar panel del tutor"
          loadingLabel="👩‍🏫 Armando el panel..."
          color="#0891B2"
          progressPhases={['Leyendo la unidad', 'Identificando dificultades', 'Sugiriendo estrategias']}
          onClick={() => {
            if (!synthesis.result) { showToast('Primero genera la síntesis.', 'warning'); return; }
            tutor.generate({ grado_nivel: '5to Primaria', unidad_json: JSON.stringify(synthesis.result), diagnosticos: '', temas: curriculumPreview?.temas || [] });
          }}
          loading={tutor.loading}
        />
      )}
      <MotorSection_Tutor result={tutor.result} />
      {tutor.simulated && tutor.result && <SimulatedBanner />}

      {synthesis.result ? (
        <MotorButton
          label="📅 Armar PDC trimestral"
          loadingLabel="📅 Armando el PDC..."
          color="#6D28D9"
          progressPhases={['Estructurando trimestres', 'Asignando semanas', 'Alineando objetivos']}
          onClick={() => {
            if (!plan.result) { showToast('Primero genera el plan de clase.', 'warning'); return; }
            pdc.generate({ grado_nivel: '5to Primaria', nivel: 'Primaria', grado: '5to', materia: curriculumPreview?.temas?.[0] || 'Ciencias Sociales', unidad_real: curriculumPreview?.unidad_real || 'Unidad 1', temas: curriculumPreview?.temas || [], plan_json: JSON.stringify(plan.result), diagnosticos: '' });
          }}
          loading={pdc.loading}
          subtitle={!plan.result ? 'Genera el plan primero' : undefined}
        />
      ) : (
        <MotorButton
          label="📅 Armar PDC trimestral"
          loadingLabel="📅 Armando el PDC..."
          color="#9CA3AF"
          onClick={() => { showToast('Primero genera Síntesis y Plan.', 'warning'); }}
          loading={false}
          subtitle="Requiere Síntesis + Plan"
          disabled
        />
      )}
      <MotorSection_PDC result={pdc.result} />
      {pdc.simulated && pdc.result && <SimulatedBanner />}

      {assessment.result && (
        <MotorButton
          label="🔄 Recalibrar adaptación"
          loadingLabel="🔄 Recalibrando..."
          color="#EA580C"
          progressPhases={['Analizando resultados', 'Ajustando adaptaciones', 'Sugiriendo cambios']}
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
          label="🎯 Definir micro-objetivos"
          loadingLabel="🎯 Definiendo micro-objetivos..."
          color="#DB2777"
          progressPhases={['Desglosando el plan', 'Creando objetivos diarios', 'Vinculando con temas']}
          onClick={() => {
            if (!plan.result) { showToast('Primero genera el plan de clase.', 'warning'); return; }
            micro.generate({ grado_nivel: '5to Primaria', unidad_real: curriculumPreview?.unidad_real || 'Unidad 1', plan_json: JSON.stringify(plan.result), temas: curriculumPreview?.temas || [], diagnosticos: '' });
          }}
          loading={micro.loading}
        />
      )}
      <MotorSection_Micro result={micro.result} />
      {micro.simulated && micro.result && <SimulatedBanner />}
    </>
  );
}
