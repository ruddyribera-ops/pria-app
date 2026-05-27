import PptxGenJS from 'pptxgenjs';

// ─── Design System ─────────────────────────────────────────────────────────
const FONT_TITLE = 'Bitter';
const FONT_BODY = 'Calibri';
const COLOR_BG = '1c1e24';
const COLOR_ACCENT = '3A9E5E';
const COLOR_WHITE = 'FFFFFF';
const COLOR_TEXT = '1e1e2f';
const COLOR_SUBTLE = '6b6b80';
const COLOR_BLUE = '2563EB';
const COLOR_PURPLE = '9333EA';
const COLOR_ORANGE = 'D97706';
const COLOR_GREEN = '059669';
const COLOR_RED = 'DC2626';
const COLOR_VIOLET = '7C3AED';
const COLOR_CYAN = '0891B2';
const COLOR_PINK = 'DB2777';

// ─── Type Definitions ────────────────────────────────────────────────────────
// Imported from server Zod schemas via motor-types.ts
import type {
  SynthesisOutput,
  ABPOutput,
  AssessmentOutput,
  PlanOutput,
  SlideItem,
  FichaOutput,
  QuizOutput,
  TutorOutput,
  PDCOutput,
  RecalibrateOutput,
  MicroOutput,
} from '../../types/motor-types';

// Generator-only extension: adds DUA adaptions UI fields not in Zod schema
interface SynthesisSlideExtended extends SynthesisOutput {
  adaptaciones_dua?: {
    representacion?: string[];
    expresion?: string[];
    compromiso?: string[];
  };
}

// ─── Slide Builders ─────────────────────────────────────────────────────────

function buildCoverSlide(pptx: PptxGenJS, title: string) {
  const slide = pptx.addSlide();
  slide.background = { color: COLOR_BG };
  slide.addText(title || 'Material Educativo', {
    x: 0.5, y: 1.5, w: 9, h: 2,
    fontSize: 36, color: COLOR_WHITE, fontFace: FONT_TITLE,
    bold: true, align: 'center',
  });
  slide.addText('Generado por PRIA v10', {
    x: 0.5, y: 3.5, w: 9, h: 0.6,
    fontSize: 14, color: COLOR_ACCENT, fontFace: FONT_BODY,
    align: 'center',
  });
  slide.addText(new Date().toLocaleDateString('es-BO'), {
    x: 0.5, y: 4.2, w: 9, h: 0.4,
    fontSize: 11, color: COLOR_SUBTLE, fontFace: FONT_BODY,
    align: 'center',
  });
}

function buildCreditsSlide(pptx: PptxGenJS) {
  const credits = pptx.addSlide();
  credits.background = { color: COLOR_BG };
  credits.addText('Generado por PRIA v10', {
    x: 0.5, y: 2, w: 9, h: 1.5,
    fontSize: 28, color: COLOR_WHITE, fontFace: FONT_TITLE, bold: true, align: 'center',
  });
  credits.addText('Sistema de Planificación Docente con IA', {
    x: 0.5, y: 3.5, w: 9, h: 0.6,
    fontSize: 14, color: COLOR_ACCENT, fontFace: FONT_BODY, align: 'center',
  });
}

function addHeaderSlide(pptx: PptxGenJS, title: string, color: string): PptxGenJS.Slide {
  const slide = pptx.addSlide();
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 0.75, fill: { color },
  });
  slide.addText(title, {
    x: 0.4, y: 0.15, w: 9.2, h: 0.45,
    fontSize: 16, bold: true, color: COLOR_WHITE, fontFace: FONT_TITLE,
    valign: 'middle',
  });
  return slide;
}

// ── Synthesis ────────────────────────────────────────────────────────────────
function buildSynthesisSlides(pptx: PptxGenJS, data: SynthesisSlideExtended) {
  if (!data?.unidad_sintetizada) return;
  const s = data.unidad_sintetizada;

  const overview = addHeaderSlide(pptx, '🧠 Síntesis Neuro-Inclusiva', COLOR_ACCENT);
  overview.addText(s.titulo || '', {
    x: 0.4, y: 1.0, w: 9.2, h: 0.8,
    fontSize: 18, bold: true, color: COLOR_TEXT, fontFace: FONT_TITLE,
  });
  overview.addText(`Enfoque: ${s.enfoque_didactico || 'N/A'}`, {
    x: 0.4, y: 1.85, w: 9.2, h: 0.4,
    fontSize: 12, color: COLOR_ACCENT, fontFace: FONT_BODY,
  });
  if (s.proyecto_pbl) {
    overview.addText(`Proyecto ABP: ${String(s.proyecto_pbl).slice(0, 150)}`, {
      x: 0.4, y: 2.35, w: 9.2, h: 0.5,
      fontSize: 11, color: COLOR_SUBTLE, fontFace: FONT_BODY,
    });
  }

  // Topic slides
  const temas = Array.isArray(s.temas_desarrollados) ? s.temas_desarrollados : [];
  temas.forEach((tema, i) => {
    const slide = pptx.addSlide();
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.75, fill: { color: COLOR_ACCENT },
    });
    slide.addText(`${i + 1}. ${tema.nombre || ''}`, {
      x: 0.4, y: 0.15, w: 9.2, h: 0.45,
      fontSize: 16, bold: true, color: COLOR_WHITE, fontFace: FONT_TITLE,
      valign: 'middle',
    });

    const intel = Array.isArray(tema.inteligencias_sugeridas)
      ? tema.inteligencias_sugeridas.join(' | ')
      : '';
    if (intel) {
      slide.addText(`[${intel}]`, {
        x: 0.4, y: 0.9, w: 9.2, h: 0.35,
        fontSize: 9, color: COLOR_ACCENT, fontFace: FONT_BODY,
      });
    }

    if (Array.isArray(tema.conceptos_clave)) {
      slide.addText('Conceptos: ' + tema.conceptos_clave.join(', '), {
        x: 0.4, y: 1.3, w: 9.2, h: 0.5,
        fontSize: 10, color: COLOR_BLUE, fontFace: FONT_BODY,
      });
    }

    if (Array.isArray(tema.actividades)) {
      const acts = (tema.actividades || []).map((a: string | { tipo: string; inteligencia: string }, idx: number) => {
        const text = typeof a === 'string' ? a : `${a.tipo || ''}: ${a.inteligencia || ''}`;
        return { text: `[${idx + 1}] ${text}`, options: { bullet: false, fontSize: 11, color: COLOR_TEXT, fontFace: FONT_BODY, breakLine: true } };
      });
      slide.addText(acts, { x: 0.4, y: 1.9, w: 9.2, h: 3, valign: 'top' });
    }
  });

  // DUA slide
  if (data.adaptaciones_dua) {
    const dua = addHeaderSlide(pptx, 'Adaptaciones DUA', COLOR_ACCENT);
    const rows = [
      ...((data.adaptaciones_dua.representacion || []).map((r: string) => `Representación: ${r}`)),
      ...((data.adaptaciones_dua.expresion || []).map((e: string) => `Expresión: ${e}`)),
      ...((data.adaptaciones_dua.compromiso || []).map((c: string) => `Compromiso: ${c}`)),
    ];
    if (rows.length) {
      dua.addText(rows.join('\n'), {
        x: 0.4, y: 1.0, w: 9.2, h: 4.5,
        fontSize: 11, color: COLOR_TEXT, fontFace: FONT_BODY, valign: 'top',
      });
    }
  }
}

// ── ABP ─────────────────────────────────────────────────────────────────────
function buildABPSlides(pptx: PptxGenJS, data: ABPOutput) {
  if (!data?.proyecto) return;
  const p = data.proyecto;

  const title = pptx.addSlide();
  title.background = { color: COLOR_BLUE };
  title.addText('🚀 Proyecto ABP', {
    x: 0.5, y: 0.8, w: 9, h: 0.8,
    fontSize: 26, color: COLOR_WHITE, fontFace: FONT_TITLE, bold: true, align: 'center',
  });
  title.addText(p.titulo || '', {
    x: 0.5, y: 1.8, w: 9, h: 1,
    fontSize: 18, color: COLOR_WHITE, fontFace: FONT_BODY, align: 'center',
  });
  if (p.pregunta_generadora) {
    title.addText(`❓ ${p.pregunta_generadora}`, {
      x: 0.5, y: 3.0, w: 9, h: 0.8,
      fontSize: 13, color: COLOR_WHITE, fontFace: FONT_BODY, align: 'center', italic: true,
    });
  }

  const fases = Array.isArray(p.fases) ? p.fases : [];
  fases.forEach((fase, i) => {
    const slide = pptx.addSlide();
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.75, fill: { color: COLOR_BLUE },
    });
    slide.addText(`${fase.nombre || `Fase ${i + 1}`} — ${fase.duracion || ''}`, {
      x: 0.4, y: 0.15, w: 9.2, h: 0.45,
      fontSize: 15, bold: true, color: COLOR_WHITE, fontFace: FONT_TITLE,
      valign: 'middle',
    });

    const acts = Array.isArray(fase.actividades) ? fase.actividades : [];
    const actItems = acts.map((a: string, idx: number) => ({
      text: `[${idx + 1}] ${a}`,
      options: { bullet: false, fontSize: 12, color: COLOR_TEXT, fontFace: FONT_BODY, breakLine: true },
    }));
    slide.addText(actItems, { x: 0.4, y: 1.0, w: 9.2, h: 4, valign: 'top' });

    if (acts.length === 0) {
      slide.addText('Sin actividades definidas', {
        x: 0.4, y: 1.0, w: 9.2, h: 0.5, fontSize: 11, color: COLOR_SUBTLE, fontFace: FONT_BODY,
      });
    }
  });

  if (Array.isArray(p.productos) && p.productos.length) {
    const prod = addHeaderSlide(pptx, '📦 Productos Finales', COLOR_BLUE);
    const items = p.productos.map((pr: string) => ({
      text: pr,
      options: { bullet: true, fontSize: 13, color: COLOR_TEXT, fontFace: FONT_BODY, breakLine: true },
    }));
    prod.addText(items, { x: 0.4, y: 1.0, w: 9.2, h: 4.5, valign: 'top' });
  }
}

// ── Plan ─────────────────────────────────────────────────────────────────────
function buildPlanSlides(pptx: PptxGenJS, data: PlanOutput) {
  if (!data?.secuencia_didactica?.bloques) return;
  data.secuencia_didactica.bloques.forEach((bloque) => {
    const slide = pptx.addSlide();
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.75, fill: { color: COLOR_ORANGE },
    });
    slide.addText(`${bloque.nombre || ''} — ${bloque.duracion || 0} min`, {
      x: 0.4, y: 0.15, w: 9.2, h: 0.45,
      fontSize: 16, bold: true, color: COLOR_WHITE, fontFace: FONT_TITLE,
      valign: 'middle',
    });
    if (bloque.objetivo) {
      slide.addText(bloque.objetivo, {
        x: 0.4, y: 0.95, w: 9.2, h: 0.5,
        fontSize: 11, color: COLOR_ORANGE, fontFace: FONT_BODY, italic: true,
      });
    }
    if (bloque.actividad) {
      slide.addText(bloque.actividad, {
        x: 0.4, y: 1.5, w: 9.2, h: 3.5,
        fontSize: 12, color: COLOR_TEXT, fontFace: FONT_BODY, valign: 'top',
      });
    }
    if (bloque.nota) {
      slide.addText(`💡 ${bloque.nota}`, {
        x: 0.4, y: 5.2, w: 9.2, h: 0.4,
        fontSize: 10, color: COLOR_PURPLE, fontFace: FONT_BODY,
      });
    }
  });
}

// ── Slides ───────────────────────────────────────────────────────────────────
function buildSlidesSlides(pptx: PptxGenJS, data: SlideItem[]) {
  if (!Array.isArray(data) || data.length === 0) return;

  data.forEach((slide) => {
    const s = pptx.addSlide();
    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.75, fill: { color: COLOR_GREEN },
    });
    s.addText(`Slide ${slide.numero || 0} — [${slide.tipo || 'content'}]`, {
      x: 0.4, y: 0.15, w: 9.2, h: 0.45,
      fontSize: 14, bold: true, color: COLOR_WHITE, fontFace: FONT_TITLE,
      valign: 'middle',
    });
    s.addText(slide.titulo || '', {
      x: 0.4, y: 0.9, w: 9.2, h: 0.6,
      fontSize: 16, bold: true, color: COLOR_TEXT, fontFace: FONT_TITLE,
    });
    if (slide.texto_pantalla) {
      s.addText(slide.texto_pantalla, {
        x: 0.4, y: 1.6, w: 9.2, h: 3,
        fontSize: 11, color: COLOR_TEXT, fontFace: FONT_BODY, valign: 'top',
      });
    }
    if (slide.guion_docente) {
      s.addText(`📝 ${slide.guion_docente}`, {
        x: 0.4, y: 4.7, w: 9.2, h: 0.8,
        fontSize: 9, color: COLOR_SUBTLE, fontFace: FONT_BODY, italic: true,
      });
    }
  });
}

// ── Ficha ────────────────────────────────────────────────────────────────────
function buildFichaSlides(pptx: PptxGenJS, data: FichaOutput) {
  if (!data?.ficha_trabajo) return;
  const ft = data.ficha_trabajo;

  const intro = pptx.addSlide();
  intro.background = { color: COLOR_RED };
  intro.addText('🎮 Ficha Gamificada', {
    x: 0.5, y: 0.8, w: 9, h: 0.8,
    fontSize: 26, color: COLOR_WHITE, fontFace: FONT_TITLE, bold: true, align: 'center',
  });
  intro.addText(ft.titulo_gancho || '', {
    x: 0.5, y: 1.8, w: 9, h: 0.8,
    fontSize: 18, color: COLOR_WHITE, fontFace: FONT_BODY, align: 'center',
  });
  intro.addText((ft.historia_gancho || '').slice(0, 300), {
    x: 0.5, y: 2.8, w: 9, h: 1.5,
    fontSize: 12, color: COLOR_WHITE, fontFace: FONT_BODY, align: 'center',
  });

  const misiones = ft.misiones || {};
  // Oraculo
  if (Array.isArray(misiones.oraculo) && misiones.oraculo.length) {
    const slide = addHeaderSlide(pptx, '🔮 Oráculo — Pregunta de Investigación', COLOR_RED);
    misiones.oraculo.forEach((m, i) => {
      slide.addText(`${i + 1}. ${m.pregunta || ''}`, {
        x: 0.4, y: 1.0 + i * 0.8, w: 9.2, h: 0.7,
        fontSize: 12, color: COLOR_TEXT, fontFace: FONT_BODY,
      });
    });
  }
  // Puente
  if (Array.isArray(misiones.puente) && misiones.puente.length) {
    const slide = addHeaderSlide(pptx, '🌉 Puente — Emparejar', COLOR_RED);
    misiones.puente.forEach((p, i) => {
      slide.addText(`${p.palabra}: ${p.significado}`, {
        x: 0.4, y: 1.0 + i * 0.6, w: 9.2, h: 0.5,
        fontSize: 12, color: COLOR_TEXT, fontFace: FONT_BODY,
      });
    });
  }
  // Pergamino
  if (misiones.pergamino) {
    const slide = addHeaderSlide(pptx, '📜 Pergamino — Completar', COLOR_RED);
    slide.addText(misiones.pergamino.frase_con_espacios || '', {
      x: 0.4, y: 1.0, w: 9.2, h: 0.8, fontSize: 13, color: COLOR_TEXT, fontFace: FONT_BODY,
    });
    slide.addText('Palabras: ' + ((misiones.pergamino.palabras_secretas || []).join(', ')), {
      x: 0.4, y: 1.9, w: 9.2, h: 0.5, fontSize: 10, color: COLOR_RED, fontFace: FONT_BODY,
    });
  }
}

// ── Quiz ─────────────────────────────────────────────────────────────────────
function buildQuizSlides(pptx: PptxGenJS, data: QuizOutput) {
  if (!data?.quiz?.preguntas) return;
  data.quiz.preguntas.forEach((p) => {
    const slide = pptx.addSlide();
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.75, fill: { color: COLOR_VIOLET },
    });
    slide.addText(`Pregunta ${p.numero} — [${p.tipo || 'escrita'}]`, {
      x: 0.4, y: 0.15, w: 9.2, h: 0.45,
      fontSize: 14, bold: true, color: COLOR_WHITE, fontFace: FONT_TITLE,
      valign: 'middle',
    });
    slide.addText(p.pregunta || '', {
      x: 0.4, y: 1.0, w: 9.2, h: 1.5,
      fontSize: 14, color: COLOR_TEXT, fontFace: FONT_BODY,
    });
    if (Array.isArray(p.opciones) && p.opciones.length) {
      const opts = p.opciones.map((o: string, idx: number) => ({
        text: `${String.fromCharCode(97 + idx)}) ${o}`,
        options: { fontSize: 12, color: COLOR_TEXT, fontFace: FONT_BODY, breakLine: true },
      }));
      slide.addText(opts, { x: 0.4, y: 2.6, w: 9.2, h: 2.5 });
    }
  });
}

// ── Assessment ────────────────────────────────────────────────────────────────
function buildAssessmentSlides(pptx: PptxGenJS, data: AssessmentOutput) {
  if (!data?.evaluacion) return;
  const ev = data.evaluacion;

  const cover = pptx.addSlide();
  cover.background = { color: COLOR_PURPLE };
  cover.addText('📊 Rúbrica y Evaluación', {
    x: 0.5, y: 1, w: 9, h: 0.8,
    fontSize: 26, color: COLOR_WHITE, fontFace: FONT_TITLE, bold: true, align: 'center',
  });
  cover.addText(`Proyecto: ${ev.proyecto || ''}`, {
    x: 0.5, y: 2, w: 9, h: 0.5,
    fontSize: 14, color: COLOR_WHITE, fontFace: FONT_BODY, align: 'center',
  });

  if (ev.rubrica?.criterios) {
    ev.rubrica.criterios.forEach((c) => {
      const slide = pptx.addSlide();
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 10, h: 0.75, fill: { color: COLOR_PURPLE },
      });
      slide.addText(`${c.nombre} (${c.peso || ''})`, {
        x: 0.4, y: 0.15, w: 9.2, h: 0.45,
        fontSize: 15, bold: true, color: COLOR_WHITE, fontFace: FONT_TITLE,
        valign: 'middle',
      });
      const niveles = c.niveles || {};
      const rows = [
        { text: 'Excelente:', options: { bold: true, fontSize: 11, color: COLOR_TEXT, fontFace: FONT_BODY, breakLine: true } },
        { text: String(niveles.excelente || ''), options: { fontSize: 11, color: COLOR_SUBTLE, fontFace: FONT_BODY, breakLine: true } },
        { text: '', options: { fontSize: 6, breakLine: true } },
        { text: 'Suficiente:', options: { bold: true, fontSize: 11, color: COLOR_TEXT, fontFace: FONT_BODY, breakLine: true } },
        { text: String(niveles.suficiente || ''), options: { fontSize: 11, color: COLOR_SUBTLE, fontFace: FONT_BODY, breakLine: true } },
        { text: '', options: { fontSize: 6, breakLine: true } },
        { text: 'En Desarrollo:', options: { bold: true, fontSize: 11, color: COLOR_TEXT, fontFace: FONT_BODY, breakLine: true } },
        { text: String(niveles.en_desarrollo || ''), options: { fontSize: 11, color: COLOR_SUBTLE, fontFace: FONT_BODY, breakLine: true } },
        { text: '', options: { fontSize: 6, breakLine: true } },
        { text: 'Inicial:', options: { bold: true, fontSize: 11, color: COLOR_TEXT, fontFace: FONT_BODY, breakLine: true } },
        { text: String(niveles.inicial || ''), options: { fontSize: 11, color: COLOR_SUBTLE, fontFace: FONT_BODY, breakLine: true } },
      ];
      slide.addText(rows, { x: 0.4, y: 1.0, w: 9.2, h: 4.5, valign: 'top' });
    });
  }
}

// ── Tutor ─────────────────────────────────────────────────────────────────────
function buildTutorSlides(pptx: PptxGenJS, data: TutorOutput) {
  if (!data?.panel_tutor) return;
  const pt = data.panel_tutor;

  const cover = pptx.addSlide();
  cover.background = { color: COLOR_CYAN };
  cover.addText('🎓 Panel del Tutor', {
    x: 0.5, y: 0.8, w: 9, h: 0.8,
    fontSize: 26, color: COLOR_WHITE, fontFace: FONT_TITLE, bold: true, align: 'center',
  });
  cover.addText(pt.resumen_clase || '', {
    x: 0.5, y: 1.8, w: 9, h: 1,
    fontSize: 14, color: COLOR_WHITE, fontFace: FONT_BODY, align: 'center',
  });

  if (Array.isArray(pt.puntos_clave) && pt.puntos_clave.length) {
    const pk = addHeaderSlide(pptx, 'Puntos Clave', COLOR_CYAN);
    const items = pt.puntos_clave.map((p: string) => ({
      text: p, options: { bullet: true, fontSize: 13, color: COLOR_TEXT, fontFace: FONT_BODY, breakLine: true },
    }));
    pk.addText(items, { x: 0.4, y: 1.0, w: 9.2, h: 4.5, valign: 'top' });
  }

  if (Array.isArray(pt.momentos_criticos) && pt.momentos_criticos.length) {
    const mc = addHeaderSlide(pptx, 'Momentos Críticos', COLOR_CYAN);
    pt.momentos_criticos.forEach((m, i) => {
      mc.addText(`${i + 1}. ${m.momento}: ${m.accion}`, {
        x: 0.4, y: 1.0 + i * 0.8, w: 9.2, h: 0.7,
        fontSize: 12, color: COLOR_TEXT, fontFace: FONT_BODY,
      });
    });
  }

  if (Array.isArray(pt.preguntas_frecuentes) && pt.preguntas_frecuentes.length) {
    const pf = addHeaderSlide(pptx, 'Preguntas Frecuentes', COLOR_CYAN);
    pt.preguntas_frecuentes.forEach((p, i) => {
      pf.addText(`P: ${p.pregunta}`, {
        x: 0.4, y: 1.0 + i * 0.8, w: 9.2, h: 0.4,
        fontSize: 11, bold: true, color: COLOR_CYAN, fontFace: FONT_BODY,
      });
      pf.addText(`   R: ${p.respuesta_breve || ''}`, {
        x: 0.4, y: 1.35 + i * 0.8, w: 9.2, h: 0.4,
        fontSize: 10, color: COLOR_TEXT, fontFace: FONT_BODY,
      });
    });
  }
}

// ── PDC ─────────────────────────────────────────────────────────────────────
function buildPDCSlides(pptx: PptxGenJS, data: PDCOutput) {
  if (!data?.pdc) return;
  const pdc = data.pdc;

  const cover = pptx.addSlide();
  cover.background = { color: COLOR_PURPLE };
  cover.addText('📆 PDC Trimestral', {
    x: 0.5, y: 0.8, w: 9, h: 0.8,
    fontSize: 26, color: COLOR_WHITE, fontFace: FONT_TITLE, bold: true, align: 'center',
  });
  if (pdc.encabezado) {
    const enc = pdc.encabezado;
    cover.addText(`${enc.materia || ''} — ${enc.nivel || ''} ${enc.grado || ''} | Trimestre ${enc.trimestre || ''}`, {
      x: 0.5, y: 1.8, w: 9, h: 0.5,
      fontSize: 13, color: COLOR_WHITE, fontFace: FONT_BODY, align: 'center',
    });
  }

  if (Array.isArray(pdc.unidades) && pdc.unidades.length) {
    pdc.unidades.forEach((u) => {
      const slide = pptx.addSlide();
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 10, h: 0.75, fill: { color: COLOR_PURPLE },
      });
      slide.addText(`Unidad ${u.numero}: ${u.titulo || ''} (${u.semanas || ''}, ${u.horas || 0}h)`, {
        x: 0.4, y: 0.15, w: 9.2, h: 0.45,
        fontSize: 14, bold: true, color: COLOR_WHITE, fontFace: FONT_TITLE,
        valign: 'middle',
      });
      slide.addText(u.objetivo_holistico || '', {
        x: 0.4, y: 0.95, w: 9.2, h: 0.5,
        fontSize: 11, color: COLOR_PURPLE, fontFace: FONT_BODY, italic: true,
      });
      const rows: Array<{ text: string; options: Record<string, unknown> }> = [];
      if (u.contenidos) {
        const contenidos = u.contenidos as Record<string, string[] | undefined>;
        ['ser', 'saber', 'hacer', 'decidir'].forEach(dim => {
          const arr = contenidos[dim];
          if (Array.isArray(arr) && arr.length) {
            rows.push({ text: `${dim.toUpperCase()}: ${arr.join(', ')}`, options: { fontSize: 10, color: COLOR_TEXT, fontFace: FONT_BODY, breakLine: true } });
          }
        });
      }
      if (rows.length) slide.addText(rows, { x: 0.4, y: 1.5, w: 9.2, h: 4, valign: 'top' });
    });
  }
}

// ── Recalibrate ──────────────────────────────────────────────────────────────
function buildRecalibrationSlides(pptx: PptxGenJS, data: RecalibrateOutput) {
  if (!data?.recalibracion) return;
  const r = data.recalibracion;

  const cover = pptx.addSlide();
  cover.background = { color: COLOR_ORANGE };
  cover.addText('🔄 Recalibración Adaptativa', {
    x: 0.5, y: 0.8, w: 9, h: 0.8,
    fontSize: 26, color: COLOR_WHITE, fontFace: FONT_TITLE, bold: true, align: 'center',
  });
  cover.addText((r.diagnostico_general || '').slice(0, 300), {
    x: 0.5, y: 1.8, w: 9, h: 1.5,
    fontSize: 13, color: COLOR_WHITE, fontFace: FONT_BODY, align: 'center',
  });

  if (Array.isArray(r.fortalezas) && r.fortalezas.length) {
    const f = addHeaderSlide(pptx, '✅ Fortalezas', COLOR_ORANGE);
    const items = r.fortalezas.map((fw: string) => ({
      text: fw, options: { bullet: true, fontSize: 12, color: COLOR_TEXT, fontFace: FONT_BODY, breakLine: true },
    }));
    f.addText(items, { x: 0.4, y: 1.0, w: 9.2, h: 4.5, valign: 'top' });
  }

  if (Array.isArray(r.areas_mejora) && r.areas_mejora.length) {
    const am = addHeaderSlide(pptx, '🔧 Áreas de Mejora', COLOR_ORANGE);
    const items = r.areas_mejora.map((a: string) => ({
      text: a, options: { bullet: true, fontSize: 12, color: COLOR_TEXT, fontFace: FONT_BODY, breakLine: true },
    }));
    am.addText(items, { x: 0.4, y: 1.0, w: 9.2, h: 4.5, valign: 'top' });
  }

  if (Array.isArray(r.ajustes_sugeridos) && r.ajustes_sugeridos.length) {
    const as = addHeaderSlide(pptx, '📋 Ajustes Sugeridos', COLOR_ORANGE);
    r.ajustes_sugeridos.forEach((a, i) => {
      as.addText(`${i + 1}. [${a.area}] ${a.accion}`, {
        x: 0.4, y: 1.0 + i * 0.8, w: 9.2, h: 0.7,
        fontSize: 12, color: COLOR_TEXT, fontFace: FONT_BODY,
      });
    });
  }
}

// ── Micro ─────────────────────────────────────────────────────────────────────
function buildMicroSlides(pptx: PptxGenJS, data: MicroOutput) {
  if (!data?.micro_objetivos) return;
  const mo = data.micro_objetivos;

  const cover = pptx.addSlide();
  cover.background = { color: COLOR_PINK };
  cover.addText('🎯 Micro-Objetivos Diarios', {
    x: 0.5, y: 0.8, w: 9, h: 0.8,
    fontSize: 26, color: COLOR_WHITE, fontFace: FONT_TITLE, bold: true, align: 'center',
  });
  cover.addText(`Unidad: ${mo.unidad || ''}`, {
    x: 0.5, y: 1.8, w: 9, h: 0.5,
    fontSize: 14, color: COLOR_WHITE, fontFace: FONT_BODY, align: 'center',
  });

  const semanas = Array.isArray(mo.semanas) ? mo.semanas : [];
  semanas.forEach((sem) => {
    const slide = pptx.addSlide();
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.75, fill: { color: COLOR_PINK },
    });
    slide.addText(`Semana ${sem.semana}: ${sem.tema || ''}`, {
      x: 0.4, y: 0.15, w: 9.2, h: 0.45,
      fontSize: 15, bold: true, color: COLOR_WHITE, fontFace: FONT_TITLE,
      valign: 'middle',
    });

    const objetivos = Array.isArray(sem.objetivos_diarios) ? sem.objetivos_diarios : [];
    let y = 1.0;
    objetivos.forEach((obj) => {
      slide.addText(`Día ${obj.dia}: ${obj.objetivo || ''}`, {
        x: 0.4, y, w: 9.2, h: 0.35,
        fontSize: 11, bold: true, color: COLOR_PINK, fontFace: FONT_BODY,
      });
      slide.addText(`  Criterio: ${obj.criterio_logro || ''} | Act: ${obj.actividad_clave || ''}`, {
        x: 0.4, y: y + 0.35, w: 9.2, h: 0.5,
        fontSize: 9, color: COLOR_SUBTLE, fontFace: FONT_BODY,
      });
      y += 0.85;
    });
  });
}

// ─── Main Export Function ─────────────────────────────────────────────────────

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

// ─── Legacy export functions (kept for existing calls) ─────────────────────

export interface ExportOptions { title: string; subtitle?: string; author?: string; }

export function exportSlidesToPPTX(
  slides: SlideItem[],
  options: ExportOptions,
): void {
  const pptx = new PptxGenJS();
  pptx.title = options.title;
  pptx.author = options.author || 'PRIA v10';
  pptx.subject = options.subtitle || 'Contenido Educativo';

  const cover = pptx.addSlide();
  cover.addText(options.title, { x: 1, y: 2.5, w: 8, h: 1.5, fontSize: 36, bold: true, color: COLOR_ACCENT, align: 'center' });
  cover.addText('PRIA v10 — Generado con IA', { x: 0, y: 5, w: 10, h: 0.5, fontSize: 10, color: COLOR_SUBTLE, align: 'center' });

  for (const slide of slides) {
    const s = pptx.addSlide();
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.8, fill: { color: COLOR_ACCENT } });
    s.addText(`${slide.numero}`, { x: 0.3, y: 0.15, w: 0.5, h: 0.5, fontSize: 14, bold: true, color: COLOR_WHITE, align: 'center', valign: 'middle' });
    s.addText(slide.titulo || 'Sin título', { x: 0.9, y: 0.15, w: 8.5, h: 0.5, fontSize: 18, bold: true, color: COLOR_WHITE, valign: 'middle' });
    if (slide.texto_pantalla) s.addText(slide.texto_pantalla, { x: 0.5, y: 1.2, w: 9, h: 4, fontSize: 14, color: COLOR_TEXT, valign: 'top' });
    if (slide.guion_docente) s.addText('📝 ' + slide.guion_docente, { x: 0.5, y: 5.2, w: 9, h: 0.5, fontSize: 10, color: COLOR_SUBTLE, italic: true });
  }

  pptx.writeFile({ fileName: `${options.title.replace(/[^a-zA-Z0-9]/g, '_')}.pptx` });
}

export function exportContentToPPTX(
  title: string,
  content: object,
  options?: Partial<ExportOptions>,
): void {
  const pptx = new PptxGenJS();
  pptx.title = title;
  pptx.author = options?.author || 'PRIA v10';

  const cover = pptx.addSlide();
  cover.addText(title, { x: 1, y: 2, w: 8, h: 1.5, fontSize: 32, bold: true, color: COLOR_ACCENT, align: 'center' });
  cover.addText('PRIA v10 — ' + (options?.subtitle || 'Contenido Educativo'), { x: 1, y: 3.5, w: 8, h: 0.8, fontSize: 14, color: COLOR_SUBTLE, align: 'center' });

  const entries = Object.entries(content);
  let slideNum = 2;
  for (const [key, value] of entries.slice(0, 20)) {
    if (!value) continue;
    const slide = pptx.addSlide();
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.8, fill: { color: COLOR_ACCENT } });
    slide.addText(String(key).replace(/_/g, ' ').toUpperCase(), { x: 0.5, y: 0.15, w: 9, h: 0.5, fontSize: 16, bold: true, color: COLOR_WHITE });
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    slide.addText(text.slice(0, 2000), { x: 0.5, y: 1.2, w: 9, h: 4.5, fontSize: 12, color: COLOR_TEXT, valign: 'top' });
    slideNum++;
    if (slideNum > 22) break;
  }

  pptx.writeFile({ fileName: `${title.replace(/[^a-zA-Z0-9]/g, '_')}.pptx` });
}

