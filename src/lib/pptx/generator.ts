import PptxGenJS from 'pptxgenjs';
import type { SlideItem } from '../../types/motor-types';
// Import all slide builders
import { buildCoverSlide, buildCreditsSlide, type TeacherInfo } from './slides/cover';
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
import type { SlideContent } from './types';
import type { Palette } from './types';
import { getPalette } from './designSystem';

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
  teacherInfo?: TeacherInfo;
}

export async function exportAllMotorsToPPTX(input: ExportInput): Promise<Blob> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'PRIA v10';
  pptx.title = input.title || 'Material Educativo';

  const pal: Palette = input.curriculumPreview?.unidad_real
    ? getPalette(input.curriculumPreview.unidad_real)
    : getPalette('');

  buildCoverSlide(pptx, input.title || 'Material Educativo', pal, input.teacherInfo);
  if (input.synthesis) buildSynthesisSlides(pptx, input.synthesis, pal);
  if (input.abp) buildABPSlides(pptx, input.abp);
  if (input.assessment) buildAssessmentSlides(pptx, input.assessment);
  if (input.plan) buildPlanSlides(pptx, input.plan, pal);
  if (input.slides) buildSlidesSlides(pptx, input.slides, { palette: pal });
  if (input.ficha) buildFichaSlides(pptx, input.ficha);
  if (input.quiz) buildQuizSlides(pptx, input.quiz, 1, pal);
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

/**
 * Build a complete PPTX slide deck from AI-generated SlideContent.
 * Replaces the deprecated buildSlides.ts buildSlideDeck function.
 * Used by SlideEditorPanel for slides-mode editing and download.
 */
export async function buildSlideDeck(content: SlideContent, subject: string): Promise<Blob> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'WIDE', width: 10, height: 5.625 });
  pptx.layout = 'WIDE';

  const pal = getPalette(subject);
  let slideNum = 0;

  // Slide 1: Cover
  slideNum++;
  const coverSlide = pptx.addSlide();
  coverSlide.background = { color: pal.bg };
  coverSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 3.8, h: 5.625, fill: { color: pal.primary } });
  coverSlide.addText(content.cover.title, {
    x: 4.4, y: 1.2, w: 5.2, h: 1.5,
    fontSize: 32, fontFace: 'Inter', color: pal.primary, bold: true,
  });
  coverSlide.addText(content.cover.subtitle, {
    x: 4.4, y: 2.7, w: 5.2, h: 0.6,
    fontSize: 14, fontFace: 'Inter', color: pal.textDark,
  });
  coverSlide.addText(`${content.cover.grade} · ${content.cover.subject}`, {
    x: 4.4, y: 4.2, w: 5.2, h: 0.4,
    fontSize: 11, fontFace: 'Inter', color: pal.accent,
  });

  // Slide 2: Objectives
  if (content.objectives.length > 0) {
    slideNum++;
    const objSlide = pptx.addSlide();
    objSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.6, fill: { color: pal.secondary } });
    objSlide.addText('🎯 Objetivos de Aprendizaje', {
      x: 0.5, y: 0.25, w: 9, h: 0.5,
      fontSize: 18, fontFace: 'Inter', color: pal.primary, bold: true,
    });
    content.objectives.forEach((obj, i) => {
      const y = 1.1 + i * 0.75;
      objSlide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5, y, w: 9, h: 0.65,
        fill: { color: '#F8F8FF' }, rectRadius: 0.1,
        shadow: { type: 'outer', blur: 4, offset: 1, color: '#000000', opacity: 0.08 },
      });
      objSlide.addText(`${i + 1}. ${obj}`, {
        x: 0.7, y, w: 8.6, h: 0.65,
        fontSize: 13, fontFace: 'Inter', color: pal.textDark, valign: 'middle',
      });
    });
  }

  // Content Slides
  for (const slide of content.slides) {
    slideNum++;
    const cSlide = pptx.addSlide();
    cSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.6, fill: { color: pal.secondary } });
    cSlide.addText(slide.title, {
      x: 0.5, y: 0.2, w: 9, h: 0.45,
      fontSize: 16, fontFace: 'Inter', color: pal.primary, bold: true,
    });
    let yPos = 0.75;
    for (const para of slide.paragraphs) {
      cSlide.addText(para, { x: 0.5, y: yPos, w: 9, h: 0.8, fontSize: 12, fontFace: 'Inter', color: pal.textDark });
      yPos += 0.85;
    }
    if (slide.copyToNotebook) {
      cSlide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5, y: yPos, w: 9, h: 0.5,
        fill: { color: '#FFFBEB' }, line: { color: '#F59E0B', width: 0.5 }, rectRadius: 0.1,
      });
      cSlide.addText(`📝 ${slide.copyToNotebook}`, {
        x: 0.7, y: yPos, w: 8.6, h: 0.5,
        fontSize: 11, fontFace: 'Inter', color: '#92400E', valign: 'middle',
      });
      yPos += 0.6;
    }
    if (slide.bullets) {
      for (const bullet of slide.bullets) {
        cSlide.addText(`• ${bullet}`, { x: 0.6, y: yPos, w: 8.8, h: 0.3, fontSize: 11, fontFace: 'Inter', color: pal.textDark });
        yPos += 0.32;
      }
    }
  }

  // Activity Slides
  if (content.activities) {
    for (const act of content.activities) {
      slideNum++;
      const aSlide = pptx.addSlide();
      aSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.6, fill: { color: pal.secondary } });
      aSlide.addText(act.title, {
        x: 0.5, y: 0.2, w: 9, h: 0.45,
        fontSize: 16, fontFace: 'Inter', color: pal.primary, bold: true,
      });
      aSlide.addText(act.instruction, {
        x: 0.5, y: 0.7, w: 9, h: 0.4,
        fontSize: 12, fontFace: 'Inter', color: pal.textDark,
      });
      let yPos = 1.2;
      act.questions.forEach((q, qi) => {
        aSlide.addText(`${qi + 1}. ${q.text}`, {
          x: 0.5, y: yPos, w: 9, h: 0.35,
          fontSize: 12, fontFace: 'Inter', color: pal.textDark, bold: true,
        });
        yPos += 0.38;
        if (q.options) {
          q.options.forEach((opt, oi) => {
            aSlide.addText(`${['A', 'B', 'C', 'D'][oi] || String(oi)}. ${opt}`, {
              x: 0.7, y: yPos, w: 8.6, h: 0.28,
              fontSize: 11, fontFace: 'Inter', color: pal.textDark,
            });
            yPos += 0.32;
          });
        }
        yPos += 0.1;
      });
    }
  }

  return await pptx.write({ outputType: 'blob' }) as Blob;
}
