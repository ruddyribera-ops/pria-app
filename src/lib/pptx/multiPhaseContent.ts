/**
 * multiPhaseContent — Phase content generation and result merging.
 *
 * generatePhaseContent: fallback mock content for a specific phase (when AI returns no structured output).
 * mergePhaseResults:     flatten all phase results into a single MergedData-like object for the editor.
 */

import type { MotorType } from '../../types';
import { generateMockOutput, type PromptContext } from './promptRunner';

// ──────────────────────────────────────────────────
// Phase content types (subset of what AI returns)
// ──────────────────────────────────────────────────

interface ConceptCard {
  title: string;
  description: string;
  icon: string;
}

interface ActivityItem {
  title: string;
  instructions?: string;
  questions?: Array<{ text: string; options?: string[] }>;
}

// ──────────────────────────────────────────────────
// Fallback content per phase (simple templates)
// ──────────────────────────────────────────────────

function fallbackEsquema(params: Record<string, unknown>): Record<string, unknown> {
  return {
    titulo: (params.tema as string) || 'Tema de la clase',
    objetivosBloom: [
      'Identificar los conceptos clave del tema',
      'Comprender las relaciones entre los conceptos',
      'Aplicar los conceptos en ejercicios prácticos',
    ],
    conceptosClave: [
      { title: 'Concepto 1', description: 'Descripción del primer concepto', icon: '📘' },
      { title: 'Concepto 2', description: 'Descripción del segundo concepto', icon: '📗' },
      { title: 'Concepto 3', description: 'Descripción del tercer concepto', icon: '📙' },
    ],
  };
}

function fallbackDesarrollo(_params: Record<string, unknown>): Record<string, unknown> {
  return {
    cards: [
      {
        title: 'Introducción',
        paragraphs: ['Contenido introductorio del tema. Explicación paso a paso.'],
        copyToNotebook: 'Escribe en tu cuaderno las ideas principales.',
      },
      {
        title: 'Desarrollo',
        paragraphs: ['Desarrollo detallado del contenido con ejemplos y aplicaciones.'],
        copyToNotebook: 'Anota los ejemplos y resuelve los ejercicios propuestos.',
      },
      {
        title: 'Cierre',
        paragraphs: ['Resumen de los puntos clave aprendidos en la clase.'],
      },
    ],
  };
}

function fallbackActividades(_params: Record<string, unknown>): Record<string, unknown> {
  return {
    actividades: [
      {
        title: 'Actividad 1: Reflexión individual',
        instructions: 'Responde las siguientes preguntas en tu cuaderno.',
        questions: [
          { text: '¿Qué aprendiste hoy?' },
          { text: '¿Cómo puedes aplicar esto en tu vida diaria?' },
        ],
      },
      {
        title: 'Actividad 2: Trabajo en parejas',
        instructions: 'Comparte tus respuestas con un compañero y discutan las diferencias.',
      },
    ],
    paraCopiar: [
      '📝 Concepto clave: [definición del concepto]',
      '📝 Ejemplo: [ejemplo ilustrativo]',
      '📝 Fórmula/Regla: [regla o fórmula importante]',
    ],
  };
}

function fallbackEncabezado(params: Record<string, unknown>): Record<string, unknown> {
  return {
    objetivo: (params.objetivo_general as string) || 'Que los estudiantes comprendan y apliquen los conceptos del tema.',
    materiales: ['Pizarra', 'Marcadores', 'Cuaderno', 'Lápiz', 'Texto de referencia'],
    competencias: ['Pensamiento crítico', 'Comunicación efectiva', 'Resolución de problemas'],
    conocimientosPrevios: ['Conocimientos básicos del área', 'Lectura comprensiva'],
  };
}

function fallbackSecuencia(_params: Record<string, unknown>): Record<string, unknown> {
  return {
    inicio: { duracion: '10 min', actividad: 'Retomar conocimientos previos mediante preguntas guiadas.' },
    desarrollo: { duracion: '25 min', actividad: 'Explicación del nuevo contenido con ejemplos prácticos.' },
    cierre: { duracion: '10 min', actividad: 'Reflexión final y resolución de dudas.' },
  };
}

function fallbackEvaluacionPlan(_params: Record<string, unknown>): Record<string, unknown> {
  return {
    instrumentos: ['Lista de cotejo', 'Observación directa'],
    criterios: ['Participación activa', 'Comprensión del contenido', 'Calidad del trabajo'],
    diferenciacion: 'Adaptaciones según necesidades del grupo.',
    tarea: 'Resolver los ejercicios propuestos en casa.',
  };
}

function fallbackMecanica(params: Record<string, unknown>): Record<string, unknown> {
  return {
    objetivoJuego: `Repasar y afianzar los conceptos de ${(params.tema as string) || 'la unidad'}`,
    reglas: ['Cada equipo responde por turnos', 'Respuesta correcta suma puntos', 'Gana el equipo con más puntos'],
    materiales: ['Tablero', 'Fichas', 'Dado', 'Tarjetas de preguntas'],
    formacionEquipos: 'Grupos de 3-4 estudiantes',
    puntuacion: 'Respuesta correcta: +10 pts | Bonus: +5 pts',
  };
}

function fallbackContenidoJuego(_params: Record<string, unknown>): Record<string, unknown> {
  return {
    preguntas: [
      { pregunta: '¿Cuál es la respuesta correcta?', opciones: ['A) Opción 1', 'B) Opción 2', 'C) Opción 3', 'D) Opción 4'], respuesta: 0 },
      { pregunta: 'Explica el concepto principal.', tipo: 'abierta' },
    ],
    desafios: ['Desafío rápido: responde en 10 segundos', 'Desafío grupal: todos deben estar de acuerdo'],
    bonus: ['Pregunta doble', 'Comodín del profesor'],
    variantes: ['Versión individual', 'Versión en línea'],
  };
}

function fallbackEstructuraQuiz(params: Record<string, unknown>): Record<string, unknown> {
  return {
    numPreguntas: 8,
    tiposPregunta: ['Opción múltiple', 'Verdadero/Falso', 'Respuesta abierta'],
    puntuacionMaxima: 100,
    tiempoLimite: '15 minutos',
    tema: (params.tema as string) || 'General',
  };
}

function fallbackPreguntasQuiz(_params: Record<string, unknown>): Record<string, unknown> {
  return {
    preguntas: [
      { texto: 'Pregunta 1: ¿...?', opciones: ['A', 'B', 'C', 'D'], correcta: 0, tipo: 'multiple' },
      { texto: 'Pregunta 2: ¿Verdadero o falso?', tipo: 'vf', correcta: true },
      { texto: 'Pregunta 3: Explica brevemente...', tipo: 'abierta' },
    ],
  };
}

function fallbackVisionGeneral(params: Record<string, unknown>): Record<string, unknown> {
  return {
    competencias: ['Competencia 1', 'Competencia 2', 'Competencia 3'],
    indicadores: ['Indicador de logro 1', 'Indicador de logro 2'],
    contenidosGenerales: [
      { unidad: 'Unidad 1', temas: ['Tema 1.1', 'Tema 1.2'] },
      { unidad: 'Unidad 2', temas: ['Tema 2.1', 'Tema 2.2'] },
    ],
    materia: (params.materia as string) || 'General',
    nivel: (params.nivel as string) || 'Primaria',
    grado: (params.grado as string) || '1°',
  };
}

function fallbackDesglose(_params: Record<string, unknown>): Record<string, unknown> {
  return {
    semanas: [
      {
        semana: 1,
        tema: 'Introducción',
        actividades: ['Presentación del tema', 'Actividad diagnóstica', 'Lectura guiada'],
      },
      {
        semana: 2,
        tema: 'Desarrollo',
        actividades: ['Explicación teórica', 'Ejercicios prácticos', 'Trabajo en grupos'],
      },
    ],
  };
}


function fallbackMapaConceptual(_params: Record<string, unknown>): Record<string, unknown> {
  return {
    ejes: ['Eje temático 1', 'Eje temático 2'],
    subTemas: ['Subtema 1.1', 'Subtema 1.2', 'Subtema 2.1'],
    conexiones: ['Conexión entre eje 1 y eje 2'],
  };
}

function fallbackDesarrolloSynthesis(_params: Record<string, unknown>): Record<string, unknown> {
  return {
    contenidoExpandido: [
      { subtema: 'Subtema 1', contenido: 'Desarrollo detallado del subtema 1.', ejemplos: ['Ejemplo 1'] },
      { subtema: 'Subtema 2', contenido: 'Desarrollo detallado del subtema 2.', ejemplos: ['Ejemplo 2'] },
    ],
    actividadesSugeridas: ['Mapa conceptual', 'Discusión grupal', 'Ejercicio de aplicación'],
  };
}

// ──────────────────────────────────────────────────
// Phase → fallback map
// ──────────────────────────────────────────────────

const PHASE_FALLBACKS: Record<string, (params: Record<string, unknown>) => Record<string, unknown>> = {
  esquema: fallbackEsquema,
  desarrollo: fallbackDesarrollo,
  actividades: fallbackActividades,
  encabezado: fallbackEncabezado,
  secuencia: fallbackSecuencia,
  evaluacion: fallbackEvaluacionPlan,
  mecanica: fallbackMecanica,
  contenido: fallbackContenidoJuego,
  estructura: fallbackEstructuraQuiz,
  preguntas: fallbackPreguntasQuiz,
  vision_general: fallbackVisionGeneral,
  desglose: fallbackDesglose,
  mapa_conceptual: fallbackMapaConceptual,
  desarrolloSynthesis: fallbackDesarrolloSynthesis,
};

const MOTOR_PHASE_MAP: Record<string, string[]> = {
  slides: ['esquema', 'desarrollo', 'actividades'],
  plan: ['encabezado', 'secuencia', 'evaluacion'],
  ficha: ['mecanica', 'contenido'],
  quiz: ['estructura', 'preguntas'],
  pdc: ['vision_general', 'desglose', 'evaluacion'],
  synthesis: ['mapa_conceptual', 'desarrolloSynthesis'],
};

// ──────────────────────────────────────────────────
// Exported functions
// ──────────────────────────────────────────────────

/**
 * Generate fallback content for a specific phase.
 * Used when AI structuredOutput is null/empty.
 */
export function generatePhaseContent(
  motorType: string,
  phaseId: string,
  _accumulated: Record<string, unknown>,
  params: Record<string, unknown>,
): Record<string, unknown> {
  // Try explicit phase fallback
  const fallbackFn = PHASE_FALLBACKS[phaseId];
  if (fallbackFn) {
    return fallbackFn(params);
  }

  // Fallback: use the mock generator from promptRunner
  try {
    const context: PromptContext = {
      motorType: motorType as MotorType,
      phaseId,
      params,
      accumulated: _accumulated,
    };
    const mock = generateMockOutput(context);
    if (mock && typeof mock === 'object') {
      return mock as Record<string, unknown>;
    }
  } catch {
    // silent
  }

  return {};
}

/**
 * Merge all phase results into a single flat object for the editor.
 * Shape matches MergedData interface in SlideEditorPanel.
 */
export function mergePhaseResults(
  motorType: string,
  results: Record<string, unknown>,
  params: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};

  // Base metadata from params
  merged.title = (params.tema as string) || (results['titulo'] as string) || '';
  merged.subject = (params.materia as string) || (params.asignatura as string) || '';
  merged.grade = (params.grado as string) || (params.nivel as string) || '';

  // Flatten phase results — spread each phase's content into merged
  const phases = MOTOR_PHASE_MAP[motorType] || Object.keys(results);
  for (const phaseId of phases) {
    const phaseContent = results[phaseId];
    if (phaseContent && typeof phaseContent === 'object') {
      Object.assign(merged, phaseContent);
    }
  }

  // Slide-specific: map esquema fields
  const esquema = results['esquema'] as Record<string, unknown> | undefined;
  if (esquema) {
    if (!merged.title) merged.title = (esquema.titulo as string) || '';
    merged.bloomObjectives = esquema.objetivosBloom as string[] | undefined;
    merged.concepts = esquema.conceptosClave as ConceptCard[] | undefined;
  }

  // Slide-specific: map actividades fields
  const actividades = results['actividades'] as Record<string, unknown> | undefined;
  if (actividades) {
    merged.activities = actividades.actividades as ActivityItem[] | undefined;
    merged.copyBoxes = actividades.paraCopiar as string[] | undefined;
  }

  // Plan-specific alias
  if (!merged.bloomObjectives) {
    merged.bloomObjectives = (merged as Record<string, unknown>).objetivosBloom as string[] | undefined;
  }

  // Defaults
  if (!merged.bloomObjectives) merged.bloomObjectives = [];
  if (!merged.concepts) merged.concepts = [];
  if (!merged.activities) merged.activities = [];
  if (!merged.copyBoxes) merged.copyBoxes = [];

  return merged;
}
