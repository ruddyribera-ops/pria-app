import PptxGenJS from 'pptxgenjs';
import type { SlideItem } from '../../types/motor-types';
// Import all slide builders
import { buildCoverSlide, buildCreditsSlide } from './slides/cover';
import { buildSynthesisSlides } from './slides/synthesis';
import { buildABPSlides } from './slides/abp';
import { buildPlanSlides } from './slides/plan';
import { buildSlidesSlides } from './slides/slides';
import { buildFichaSlides } from './slides/ficha';
import { buildQuizSlides } from './slides/quiz';
import { buildAssessmentSlides } from './slides/assessment';
import { buildTutorSlides } from './slides/tutor';
import { buildPDCSlides } from './slides/pdc';
import { buildRecalibrationSlides } from './slides/recalibrate';
import { buildMicroSlides } from './slides/micro';
import type { SynthesisOutput, ABPOutput, AssessmentOutput, PlanOutput, FichaOutput, QuizOutput, TutorOutput, PDCOutput, RecalibrateOutput, MicroOutput } from '../../types/motor-types';

export interface ExportInput {
  title?: string;
  synthesis?: SynthesisOutput | null;
  abp?: ABPOutput | null;
  assessment?: AssessmentOutput | null;
  plan?: PlanOutput | null;
  slides?: SlideItem[] | null;
  ficha?: FichaOutput | null;
  quiz?: QuizOutput | null;
  tutor?: TutorOutput | null;
  pdc?: PDCOutput | null;
  recalibrate?: RecalibrateOutput | null;
  micro?: MicroOutput | null;
  curriculumPreview?: { unidad_real: string; temas: string[] } | null;
}

export async function exportAllMotorsToPPTX(input: ExportInput): Promise<Blob> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'PRIA v10';
  pptx.title = input.title || 'Material Educativo';

  buildCoverSlide(pptx, input.title || 'Material Educativo');
  if (input.synthesis) buildSynthesisSlides(pptx, input.synthesis);
  if (input.abp) buildABPSlides(pptx, input.abp);
  if (input.assessment) buildAssessmentSlides(pptx, input.assessment);
  if (input.plan) buildPlanSlides(pptx, input.plan);
  if (input.slides) buildSlidesSlides(pptx, input.slides);
  if (input.ficha) buildFichaSlides(pptx, input.ficha);
  if (input.quiz) buildQuizSlides(pptx, input.quiz);
  if (input.tutor) buildTutorSlides(pptx, input.tutor);
  if (input.pdc) buildPDCSlides(pptx, input.pdc);
  if (input.recalibrate) buildRecalibrationSlides(pptx, input.recalibrate);
  if (input.micro) buildMicroSlides(pptx, input.micro);

  buildCreditsSlide(pptx);
  return await pptx.write({ outputType: 'blob' }) as Blob;
}

// Legacy exports
export interface ExportOptions { title: string; subtitle?: string; author?: string; }

export async function exportSlidesToPPTX(slides: SlideItem[], options: ExportOptions): Promise<Blob> {
  const pptx = new PptxGenJS();
  pptx.title = options.title;
  pptx.author = options.author || 'PRIA v10';
  pptx.subject = options.subtitle || 'Contenido Educativo';
  const cover = pptx.addSlide();
  cover.addText(options.title, { x: 1, y: 2.5, w: 8, h: 1.5, fontSize: 36, bold: true, color: '#3A9E5E', align: 'center' });
  cover.addText('Generado por PRIA v10', { x: 0, y: 5, w: 10, h: 0.5, fontSize: 10, color: '#6b6b80', align: 'center' });
  for (const slide of slides) {
    const s = pptx.addSlide();
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.8, fill: { color: '#3A9E5E' } });
    s.addText(`${slide.numero}`, { x: 0.3, y: 0.15, w: 0.5, h: 0.5, fontSize: 14, bold: true, color: '#FFFFFF', align: 'center', valign: 'middle' });
    s.addText(slide.titulo || 'Sin titulo', { x: 0.9, y: 0.15, w: 8.5, h: 0.5, fontSize: 18, bold: true, color: '#FFFFFF', valign: 'middle' });
    if (slide.texto_pantalla) s.addText(slide.texto_pantalla, { x: 0.5, y: 1.2, w: 9, h: 4, fontSize: 14, color: '#1e1e2f', valign: 'top' });
    if (slide.guion_docente) s.addText(slide.guion_docente, { x: 0.5, y: 5.2, w: 9, h: 0.5, fontSize: 10, color: '#6b6b80', italic: true });
  }
  return await pptx.write({ outputType: 'blob' }) as Blob;
}

export async function exportContentToPPTX(title: string, content: object, options?: Partial<ExportOptions>): Promise<Blob> {
  const pptx = new PptxGenJS();
  pptx.title = title;
  pptx.author = options?.author || 'PRIA v10';
  const cover = pptx.addSlide();
  cover.addText(title, { x: 1, y: 2, w: 8, h: 1.5, fontSize: 32, bold: true, color: '#3A9E5E', align: 'center' });
  cover.addText('Generado por PRIA v10', { x: 1, y: 3.5, w: 8, h: 0.8, fontSize: 14, color: '#6b6b80', align: 'center' });
  const entries = Object.entries(content);
  let slideNum = 2;
  for (const [key, value] of entries.slice(0, 20)) {
    if (!value) continue;
    const slide = pptx.addSlide();
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.8, fill: { color: '#3A9E5E' } });
    slide.addText(String(key).replace(/_/g, ' ').toUpperCase(), { x: 0.5, y: 0.15, w: 9, h: 0.5, fontSize: 16, bold: true, color: '#FFFFFF' });
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    slide.addText(text.slice(0, 2000), { x: 0.5, y: 1.2, w: 9, h: 4.5, fontSize: 12, color: '#1e1e2f', valign: 'top' });
    slideNum++;
    if (slideNum > 22) break;
  }
  return await pptx.write({ outputType: 'blob' }) as Blob;
}
