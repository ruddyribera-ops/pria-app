import PptxGenJS from 'pptxgenjs';
import { FONTS, FONT_SIZES, COLORS, MARGIN, HEADER_H, CONTENT_W, RADIUS, SLIDE_H, SLIDE_W, PAGE_NUM_X, PAGE_NUM_Y } from './types';
import { addHeaderSlide, buildCoverSlide } from './cover';
import type { SynthesisOutput } from '../../../types/motor-types';
import type { Palette } from '../types';
import type { TeacherInfo } from '../../export/pdf';

/** Blooms verb registry for learning objectives */
const BLOOM_VERBS = [
  'Recordar', 'Comprender', 'Aplicar', 'Analizar', 'Evaluar', 'Crear',
] as const;

/**
 * Build full Síntesis Curricular presentation
 * Following handcrafted slide design patterns:
 * - Clean cover with teacher prominence
 * - Concise numbered objectives
 * - One topic per slide with visual blocks (DEFINICIÓN, ejemplos)
 * - No repetitive "actividades prácticas y reflexivas" text
 */
export function buildSynthesisSlides(pptx: PptxGenJS, data: SynthesisOutput, palette?: Palette, teacherInfo?: TeacherInfo): void {
  if (!data?.unidad_sintetizada) return;
  const s = data.unidad_sintetizada;
  const temas = Array.isArray(s.temas_desarrollados) ? s.temas_desarrollados : [];
  let slideNum = 1;

  // ── Slide 1: Cover ──────────────────────────────────────────────────────────
  buildCoverSlide(pptx, 'Síntesis Curricular', s.titulo || '');
  slideNum++;

  // ── Slide 2: Objetivos de Aprendizaje ──────────────────────────────────────
  const objSlide = addHeaderSlide(pptx, 'Objetivos de Aprendizaje', undefined, slideNum++, palette);

  // Try to extract objectives from notas_docente, otherwise use Bloom placeholders
  const objectives = extractObjectives(s.notas_docente, temas);

  let y = HEADER_H + 0.35;
  objectives.forEach((obj, i) => {
    // Colored number badge (cleaner than verb badges)
    objSlide.addShape(pptx.ShapeType.roundRect, {
      x: MARGIN, y, w: 0.4, h: 0.4,
      fill: { color: COLORS.primary }, rectRadius: 0.08,
    });
    objSlide.addText(String(i + 1), {
      x: MARGIN, y, w: 0.4, h: 0.4,
      fontSize: 14, fontFace: FONTS.body, bold: true,
      color: COLORS.textLight, align: 'center', valign: 'middle',
    });

    // Objective text - clean and concise
    objSlide.addText(obj, {
      x: MARGIN + 0.55, y, w: CONTENT_W - 0.55, h: 0.4,
      fontSize: FONT_SIZES.body, fontFace: FONTS.body,
      color: COLORS.text, valign: 'middle',
    });

    y += 0.55;
    if (y > SLIDE_H - 0.6) return; // safety guard
  });

  // ── Slide 3: Enfoque Didáctico (conciso) ─────────────────────────────────
  const enfSlide = addHeaderSlide(pptx, 'Enfoque Didáctico', undefined, slideNum++, palette);

  if (s.enfoque_didactico) {
    // Clean methodology label
    enfSlide.addText(s.enfoque_didactico, {
      x: MARGIN, y: HEADER_H + 0.3, w: CONTENT_W, h: 0.5,
      fontSize: 18, fontFace: FONTS.body, bold: true,
      color: COLORS.primary, valign: 'middle',
    });

    // Three methodology pillars in a row
    const pillars = ['ABP', 'Neuroinclusión', 'DUA'];
    const pillarColors = [COLORS.accent, COLORS.warning, COLORS.info];
    let px = MARGIN;
    pillars.forEach((p, pi) => {
      const pw = 2.0;
      enfSlide.addShape(pptx.ShapeType.roundRect, {
        x: px, y: HEADER_H + 0.9, w: pw, h: 0.35,
        fill: { color: pillarColors[pi] }, rectRadius: 0.08,
      });
      enfSlide.addText(p, {
        x: px, y: HEADER_H + 0.9, w: pw, h: 0.35,
        fontSize: 11, fontFace: FONTS.body, bold: true,
        color: COLORS.textLight, align: 'center', valign: 'middle',
      });
      px += pw + 0.2;
    });

    // Core concepts from topics - concise list
    if (temas.length) {
      enfSlide.addText('Conceptos clave:', {
        x: MARGIN, y: HEADER_H + 1.45, w: CONTENT_W, h: 0.3,
        fontSize: 12, fontFace: FONTS.body, bold: true,
        color: COLORS.text,
      });

      const allConcepts = temas.flatMap(t => Array.isArray(t.conceptos_clave) ? t.conceptos_clave : []);
      const uniqueConcepts = [...new Set(allConcepts)].slice(0, 6);
      enfSlide.addText(uniqueConcepts.join(' · '), {
        x: MARGIN, y: HEADER_H + 1.75, w: CONTENT_W, h: 0.6,
        fontSize: FONT_SIZES.bodySmall, fontFace: FONTS.body,
        color: COLORS.textMuted,
      });
    }
  }

  // ── Slides 4-N: Individual Topic Slides (one per tema) ─────────────────────
  // Following handcrafted pattern: clean title, concept block, key points
  temas.slice(0, 6).forEach((tema, temaIdx) => {
    const topicSlide = pptx.addSlide();
    topicSlide.background = { color: COLORS.bg };

    // Left accent bar
    topicSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 0.12, h: SLIDE_H,
      fill: { color: COLORS.primary },
    });

    // Topic number
    topicSlide.addShape(pptx.ShapeType.ellipse, {
      x: MARGIN, y: MARGIN, w: 0.5, h: 0.5,
      fill: { color: COLORS.primary },
    });
    topicSlide.addText(String(temaIdx + 1), {
      x: MARGIN, y: MARGIN, w: 0.5, h: 0.5,
      fontSize: 16, fontFace: FONTS.body, bold: true,
      color: COLORS.textLight, align: 'center', valign: 'middle',
    });

    // Topic title
    topicSlide.addText(tema.nombre || `Tema ${temaIdx + 1}`, {
      x: MARGIN + 0.7, y: MARGIN, w: CONTENT_W - 0.7, h: 0.5,
      fontSize: 24, fontFace: FONTS.title, bold: true,
      color: COLORS.text, valign: 'middle',
    });

    // Horizontal divider
    topicSlide.addShape(pptx.ShapeType.rect, {
      x: MARGIN, y: 1.1, w: CONTENT_W, h: 0.03,
      fill: { color: COLORS.border },
    });

    // Concept block - "CONCEPTO" style header
    topicSlide.addText('CONCEPTO', {
      x: MARGIN, y: 1.35, w: 1.5, h: 0.3,
      fontSize: 9, fontFace: FONTS.body, bold: true,
      color: COLORS.primary, charSpacing: 2,
    });

    // Key concepts
    const concepts = Array.isArray(tema.conceptos_clave) ? tema.conceptos_clave.slice(0, 4) : [];
    let conceptY = 1.7;
    concepts.forEach((concept) => {
      // Bullet point
      topicSlide.addShape(pptx.ShapeType.ellipse, {
        x: MARGIN + 0.1, y: conceptY + 0.12, w: 0.12, h: 0.12,
        fill: { color: COLORS.accent },
      });
      topicSlide.addText(concept, {
        x: MARGIN + 0.35, y: conceptY, w: CONTENT_W - 0.5, h: 0.4,
        fontSize: FONT_SIZES.body, fontFace: FONTS.body,
        color: COLORS.text, valign: 'top',
      });
      conceptY += 0.45;
    });

    // Inteligencias sugeridas - small badges
    const intelY = 3.9;
    topicSlide.addText('Inteligencias:', {
      x: MARGIN, y: intelY, w: 1.5, h: 0.3,
      fontSize: 10, fontFace: FONTS.body, bold: true,
      color: COLORS.textMuted,
    });

    const inteligencias = Array.isArray(tema.inteligencias_sugeridas) ? tema.inteligencias_sugeridas : [];
    let badgeX = MARGIN + 1.5;
    const intColors = [COLORS.accent, COLORS.warning, COLORS.info];
    inteligencias.slice(0, 3).forEach((intl, ii) => {
      const badgeW = intl.length * 0.08 + 0.8;
      topicSlide.addShape(pptx.ShapeType.roundRect, {
        x: badgeX, y: intelY - 0.05, w: badgeW, h: 0.3,
        fill: { color: intColors[ii % intColors.length], transparency: 20 }, rectRadius: 0.06,
      });
      topicSlide.addText(intl, {
        x: badgeX, y: intelY - 0.05, w: badgeW, h: 0.3,
        fontSize: 9, fontFace: FONTS.body,
        color: COLORS.text, align: 'center', valign: 'middle',
      });
      badgeX += badgeW + 0.15;
    });

    // Page number
    topicSlide.addText(String(slideNum), {
      x: PAGE_NUM_X - 0.15, y: PAGE_NUM_Y - 0.15, w: 0.4, h: 0.4,
      fontSize: FONT_SIZES.pageNumber, fontFace: FONTS.body, bold: true,
      color: COLORS.textMuted, align: 'center', valign: 'middle',
    });

    slideNum++;
  });

  // ── Slide 5: Inteligencias Múltiples ────────────────────────────────────────
  const intSlide = addHeaderSlide(pptx, 'Inteligencias Múltiples', undefined, slideNum++, palette);

  // Table header
  const tblY = HEADER_H + 0.3;
  const colTemaW = 3.2;
  const colIntW = CONTENT_W - colTemaW;

  intSlide.addShape(pptx.ShapeType.rect, {
    x: MARGIN, y: tblY, w: CONTENT_W, h: 0.4,
    fill: { color: COLORS.primary },
  });
  intSlide.addText('Tema', {
    x: MARGIN + 0.1, y: tblY, w: colTemaW - 0.1, h: 0.4,
    fontSize: 11, fontFace: FONTS.body, bold: true,
    color: COLORS.textLight, valign: 'middle',
  });
  intSlide.addText('Inteligencias Activadas', {
    x: MARGIN + colTemaW, y: tblY, w: colIntW, h: 0.4,
    fontSize: 11, fontFace: FONTS.body, bold: true,
    color: COLORS.textLight, valign: 'middle',
  });

  const intColors = [COLORS.accent, COLORS.warning, COLORS.info, COLORS.success, COLORS.purple];
  temas.slice(0, 7).forEach((tema, i) => {
    const ry = tblY + 0.45 + i * 0.48;
    const bgColor = i % 2 === 0 ? COLORS.surface : COLORS.bg;

    intSlide.addShape(pptx.ShapeType.rect, {
      x: MARGIN, y: ry, w: CONTENT_W, h: 0.45,
      fill: { color: bgColor },
    });

    intSlide.addText(tema.nombre || `Tema ${i + 1}`, {
      x: MARGIN + 0.1, y: ry, w: colTemaW - 0.1, h: 0.45,
      fontSize: 10, fontFace: FONTS.body, bold: false,
      color: COLORS.text, valign: 'middle',
    });

    const inteligencias = Array.isArray(tema.inteligencias_sugeridas)
      ? tema.inteligencias_sugeridas
      : [];
    inteligencias.forEach((intl, ji) => {
      const badgeColor = intColors[ji % intColors.length];
      intSlide.addShape(pptx.ShapeType.roundRect, {
        x: MARGIN + colTemaW + ji * 1.5, y: ry + 0.07, w: 1.4, h: 0.3,
        fill: { color: badgeColor, transparency: 20 }, rectRadius: 0.06,
      });
      intSlide.addText(intl, {
        x: MARGIN + colTemaW + ji * 1.5, y: ry + 0.07, w: 1.4, h: 0.3,
        fontSize: 9, fontFace: FONTS.body,
        color: COLORS.text, align: 'center', valign: 'middle',
      });
    });
  });

  // ── Slide 6: Proyecto ABP ────────────────────────────────────────────────────
  const abpSlide = addHeaderSlide(pptx, '🎯 Proyecto ABP', undefined, slideNum++, palette);

  if (s.proyecto_pbl) {
    // Big callout card
    abpSlide.addShape(pptx.ShapeType.roundRect, {
      x: MARGIN, y: HEADER_H + 0.35, w: CONTENT_W, h: 2.6,
      fill: { color: COLORS.surface }, rectRadius: RADIUS,
      shadow: { type: 'outer', blur: 6, offset: 3, color: '#000000', opacity: 0.08 },
    });

    // Left accent bar
    abpSlide.addShape(pptx.ShapeType.rect, {
      x: MARGIN, y: HEADER_H + 0.35, w: 0.08, h: 2.6,
      fill: { color: COLORS.accent },
    });

    abpSlide.addText('Pregunta Generadora', {
      x: MARGIN + 0.3, y: HEADER_H + 0.5, w: CONTENT_W - 0.6, h: 0.35,
      fontSize: 12, fontFace: FONTS.body, bold: true,
      color: COLORS.accent,
    });
    abpSlide.addText(s.proyecto_pbl, {
      x: MARGIN + 0.3, y: HEADER_H + 0.85, w: CONTENT_W - 0.6, h: 1.6,
      fontSize: FONT_SIZES.body, fontFace: FONTS.body,
      color: COLORS.text,
    });

    // Topics involved badge row
    if (temas.length) {
      const involved = temas.map(t => t.nombre).filter(Boolean).slice(0, 4);
      let bx = MARGIN + 0.3;
      involved.forEach((name) => {
        abpSlide.addShape(pptx.ShapeType.roundRect, {
          x: bx, y: HEADER_H + 2.55, w: name.length * 0.1 + 1.0, h: 0.3,
          fill: { color: COLORS.primary, transparency: 85 }, rectRadius: 0.06,
        });
        abpSlide.addText(name, {
          x: bx, y: HEADER_H + 2.55, w: name.length * 0.1 + 1.0, h: 0.3,
          fontSize: 9, fontFace: FONTS.body,
          color: COLORS.primary, align: 'center', valign: 'middle',
        });
        bx += name.length * 0.1 + 1.15;
      });
    }
  } else {
    abpSlide.addText('El proyecto ABP se definirá en la fase de desarrollo.', {
      x: MARGIN, y: HEADER_H + 0.5, w: CONTENT_W, h: 0.5,
      fontSize: FONT_SIZES.body, fontFace: FONTS.body, color: COLORS.textMuted,
    });
  }

  // Reference to ABP motor
  abpSlide.addShape(pptx.ShapeType.roundRect, {
    x: MARGIN, y: SLIDE_H - 0.9, w: CONTENT_W, h: 0.55,
    fill: { color: COLORS.primary, transparency: 90 }, rectRadius: RADIUS,
  });
  abpSlide.addText('💡 Para desarrollar el proyecto completo usa el Motor ABP →', {
    x: MARGIN + 0.2, y: SLIDE_H - 0.9, w: CONTENT_W - 0.4, h: 0.55,
    fontSize: 11, fontFace: FONTS.body, italic: true,
    color: COLORS.primary, valign: 'middle',
  });

  // ── Slide 7: Notas para el Docente ─────────────────────────────────────────
  const docSlide = addHeaderSlide(pptx, '📝 Notas para el Docente', undefined, slideNum++, palette);

  if (s.notas_docente) {
    // Split into bullet paragraphs
    const paragraphs = s.notas_docente.split(/\n|[\.\;]/).filter(p => p.trim().length > 10);
    let dy = HEADER_H + 0.3;
    paragraphs.slice(0, 6).forEach((para) => {
      docSlide.addText(`• ${para.trim()}`, {
        x: MARGIN + 0.2, y: dy, w: CONTENT_W - 0.4, h: 0.55,
        fontSize: FONT_SIZES.bodySmall, fontFace: FONTS.body,
        color: COLORS.text,
      });
      dy += 0.6;
      if (dy > SLIDE_H - 0.6) return;
    });
  }

  // DUA strategies section
  const duaStrategies = [
    { title: 'Representación', icon: '👁', strategies: ['Multimedia', 'Segmentación', 'Alternativas perceptibles'] },
    { title: 'Expresión', icon: '✍', strategies: ['Herramientas de apoyo', 'Retroalimentación', 'Trabajo colaborativo'] },
    { title: 'Compromiso', icon: '🎯', strategies: ['Intereses elevados', 'Objetivos relevantes', 'Evaluación formativa'] },
  ];

  let dsY = HEADER_H + 0.3;
  if (!s.notas_docente || s.notas_docente.trim().length < 20) {
    // Show DUA strategies when notas_docente is empty
    duaStrategies.forEach((sec) => {
      docSlide.addShape(pptx.ShapeType.roundRect, {
        x: MARGIN, y: dsY, w: CONTENT_W, h: 1.0,
        fill: { color: COLORS.surface }, rectRadius: RADIUS,
      });
      docSlide.addText(`${sec.icon} ${sec.title}`, {
        x: MARGIN + 0.2, y: dsY + 0.08, w: CONTENT_W - 0.4, h: 0.3,
        fontSize: 12, fontFace: FONTS.body, bold: true,
        color: COLORS.primary,
      });
      docSlide.addText(sec.strategies.join(' · '), {
        x: MARGIN + 0.2, y: dsY + 0.4, w: CONTENT_W - 0.4, h: 0.5,
        fontSize: FONT_SIZES.bodySmall, fontFace: FONTS.body,
        color: COLORS.textMuted,
      });
      dsY += 1.1;
    });
  } else {
    // Append DUA box at bottom when notas exists
    docSlide.addShape(pptx.ShapeType.roundRect, {
      x: MARGIN, y: SLIDE_H - 1.2, w: CONTENT_W, h: 0.9,
      fill: { color: COLORS.warning, transparency: 85 }, rectRadius: RADIUS,
    });
    docSlide.addText('Estrategias DUA transversales: Diseño Universal de Aprendizaje aplicado en todas las actividades.', {
      x: MARGIN + 0.2, y: SLIDE_H - 1.2, w: CONTENT_W - 0.4, h: 0.9,
      fontSize: FONT_SIZES.bodySmall, fontFace: FONTS.body, italic: true,
      color: COLORS.text,
    });
  }

  // ── Slide 8: Evaluación ─────────────────────────────────────────────────────
  const evalSlide = addHeaderSlide(pptx, '📊 Evaluación', undefined, slideNum++, palette);

  // Placeholder criteria
  const evalCriteria = [
    'Comprensión conceptual de los temas desarrollados',
    'Aplicación en situaciones de la vida real',
    'Colaboración y comunicación efectiva',
    'Creatividad en la propuesta de soluciones',
    'Reflexión crítica y metacognición',
  ];

  evalSlide.addText('Criterios de evaluación', {
    x: MARGIN, y: HEADER_H + 0.3, w: CONTENT_W, h: 0.35,
    fontSize: 12, fontFace: FONTS.body, bold: true,
    color: COLORS.text,
  });

  let ey = HEADER_H + 0.7;
  evalCriteria.forEach((crit, i) => {
    evalSlide.addShape(pptx.ShapeType.ellipse, {
      x: MARGIN, y: ey + 0.05, w: 0.28, h: 0.28,
      fill: { color: COLORS.success },
    });
    evalSlide.addText(String(i + 1), {
      x: MARGIN, y: ey + 0.05, w: 0.28, h: 0.28,
      fontSize: 9, fontFace: FONTS.body, bold: true,
      color: COLORS.textLight, align: 'center', valign: 'middle',
    });
    evalSlide.addText(crit, {
      x: MARGIN + 0.4, y: ey, w: CONTENT_W - 0.5, h: 0.38,
      fontSize: FONT_SIZES.bodySmall, fontFace: FONTS.body,
      color: COLORS.text,
    });
    ey += 0.5;
  });

  // Next motor reference card
  evalSlide.addShape(pptx.ShapeType.roundRect, {
    x: MARGIN, y: SLIDE_H - 1.1, w: CONTENT_W, h: 0.8,
    fill: { color: COLORS.surface }, rectRadius: RADIUS,
  });
  evalSlide.addShape(pptx.ShapeType.rect, {
    x: MARGIN, y: SLIDE_H - 1.1, w: 0.08, h: 0.8,
    fill: { color: COLORS.success },
  });
  evalSlide.addText('Próximo paso: Motor de Evaluación', {
    x: MARGIN + 0.25, y: SLIDE_H - 1.05, w: CONTENT_W - 0.5, h: 0.35,
    fontSize: 12, fontFace: FONTS.body, bold: true,
    color: COLORS.success,
  });
  evalSlide.addText('Genera rúbricas detalladas y criterios específicos de evaluación con el Motor de Evaluación →', {
    x: MARGIN + 0.25, y: SLIDE_H - 0.7, w: CONTENT_W - 0.5, h: 0.35,
    fontSize: FONT_SIZES.bodySmall, fontFace: FONTS.body,
    color: COLORS.textMuted,
  });

  // ── Slide 9: Diseño Inverso (Backward Design) ───────────────────────────────
  const bdSlide = addHeaderSlide(pptx, '🔄 Diseño Inverso (Backward Design)', undefined, slideNum++, palette);

  // Three stages of Backward Design
  const stages = [
    {
      stage: 'Etapa 1',
      title: 'Resultados Deseados',
      icon: '🎯',
      questions: [
        '¿Qué comprensiones durables buscamos?',
        '¿Cuáles son los objetivos de aprendizaje?',
        '¿Qué competencias transversales se desarrollan?',
      ],
      color: COLORS.accent,
    },
    {
      stage: 'Etapa 2',
      title: 'Evidencia Aceptable',
      icon: '📋',
      questions: [
        '¿Cómo sabremos que los estudiantes aprendieron?',
        '¿Qué desempeños demuestran comprensión?',
        '¿Qué rúbricas definirán el éxito?',
      ],
      color: COLORS.warning,
    },
    {
      stage: 'Etapa 3',
      title: 'Experiencias de Aprendizaje',
      icon: '📚',
      questions: [
        '¿Qué actividades conducen a los resultados?',
        '¿Cómo secuencia las experiencias?',
        '¿Qué ajustes DUA se necesitan?',
      ],
      color: COLORS.info,
    },
  ];

  const stageW = (CONTENT_W - 0.4) / 3;
  let sx = MARGIN;

  stages.forEach((stg) => {
    // Stage card
    bdSlide.addShape(pptx.ShapeType.roundRect, {
      x: sx, y: HEADER_H + 0.3, w: stageW - 0.15, h: 3.5,
      fill: { color: COLORS.surface }, rectRadius: RADIUS,
      shadow: { type: 'outer', blur: 4, offset: 2, color: '#000000', opacity: 0.06 },
    });

    // Colored top bar
    bdSlide.addShape(pptx.ShapeType.rect, {
      x: sx, y: HEADER_H + 0.3, w: stageW - 0.15, h: 0.08,
      fill: { color: stg.color },
    });

    // Icon and stage label
    bdSlide.addText(stg.icon, {
      x: sx + 0.15, y: HEADER_H + 0.5, w: 0.5, h: 0.5,
      fontSize: 24, align: 'center', valign: 'middle',
    });
    bdSlide.addText(stg.stage, {
      x: sx + 0.6, y: HEADER_H + 0.5, w: stageW - 0.8, h: 0.3,
      fontSize: 10, fontFace: FONTS.body, color: stg.color, bold: true,
    });
    bdSlide.addText(stg.title, {
      x: sx + 0.15, y: HEADER_H + 0.85, w: stageW - 0.3, h: 0.4,
      fontSize: 13, fontFace: FONTS.body, bold: true, color: COLORS.text,
    });

    // Divider line
    bdSlide.addShape(pptx.ShapeType.rect, {
      x: sx + 0.15, y: HEADER_H + 1.3, w: stageW - 0.45, h: 0.02,
      fill: { color: COLORS.border },
    });

    // Questions
    let qy = HEADER_H + 1.45;
    stg.questions.forEach((q) => {
      bdSlide.addText('• ' + q, {
        x: sx + 0.15, y: qy, w: stageW - 0.3, h: 0.55,
        fontSize: FONT_SIZES.bodySmall, fontFace: FONTS.body, color: COLORS.textMuted,
      });
      qy += 0.6;
    });

    sx += stageW + 0.1;
  });

  // Bottom note about Backward Design
  bdSlide.addShape(pptx.ShapeType.roundRect, {
    x: MARGIN, y: SLIDE_H - 0.9, w: CONTENT_W, h: 0.6,
    fill: { color: COLORS.primary, transparency: 92 }, rectRadius: RADIUS,
  });
  bdSlide.addText('💡 El Diseño Inverso (Backward Design) asegura que las actividades siempre estén alineadas con los objetivos de aprendizaje.', {
    x: MARGIN + 0.2, y: SLIDE_H - 0.9, w: CONTENT_W - 0.4, h: 0.6,
    fontSize: FONT_SIZES.bodySmall, fontFace: FONTS.body, italic: true, color: COLORS.primary,
    valign: 'middle',
  });

  // Teacher info footer on last slide
  if (teacherInfo?.nombre) {
    const dateStr = new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
    bdSlide.addText(`Docente: ${teacherInfo.nombre} · ${dateStr}`, {
      x: 0, y: SLIDE_H - 0.35, w: SLIDE_W, h: 0.3,
      fontSize: 8, fontFace: FONTS.body, color: COLORS.textMuted, align: 'center', valign: 'middle',
    });
  }
}

/**
 * Extract learning objectives from notas_docente or synthesize from temas
 */
function extractObjectives(notas?: string, temas?: Array<{ nombre?: string; conceptos_clave?: string[] }>): string[] {
  if (notas && notas.trim().length > 20) {
    // Pull sentences that look like objectives (contain action verbs)
    const sentences = notas.split(/[\.\n]/).filter(s => {
      const lower = s.toLowerCase();
      return BLOOM_VERBS.some(v => lower.includes(v.toLowerCase())) ||
        lower.includes('aprender') || lower.includes('comprender') ||
        lower.includes('desarrollar') || lower.includes('aplicar');
    });
    if (sentences.length >= 3) {
      return sentences.slice(0, 6).map(s => s.trim()).filter(s => s.length > 10);
    }
  }

  // Fallback: synthesize from temas and Bloom's taxonomy
  if (temas && temas.length > 0) {
    return temas.slice(0, 6).map((tema, i) => {
      const verb = BLOOM_VERBS[i % BLOOM_VERBS.length];
      const topic = tema.nombre || `el tema ${i + 1}`;
      return `${verb} ${topic.toLowerCase()} mediante actividades prácticas y reflexivas`;
    });
  }

  // Ultimate fallback
  return [
    'Comprender los conceptos fundamentales de la unidad',
    'Aplicar los conocimientos en situaciones prácticas',
    'Analizar la información de manera crítica',
    'Crear propuestas creativas de solución',
  ];
}
