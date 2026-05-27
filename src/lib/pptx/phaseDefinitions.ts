import type { MotorType } from '../../hooks/useMotorGeneration';

export interface PhaseField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'textarea' | 'checkbox';
  placeholder?: string;
  options?: string[];
  default?: string | boolean;
}

export interface PhaseDef {
  id: string;
  label: string;
  subtitle: string;
  description: string;
  /** Form fields shown to the user for this phase */
  fields: PhaseField[];
  /** Expected output keys (for documentation) */
  produces: string[];
}

export interface MotorPhases {
  motorType: MotorType;
  phases: PhaseDef[];
}

export const PHASE_DEFINITIONS: Record<MotorType, PhaseDef[]> = {
  alpha2: [],
  abp: [],
  assessment: [],
  tutor: [],
  recalibrate: [],
  micro: [],
  slides: [
    {
      id: 'esquema',
      label: 'Esquema',
      subtitle: 'Paso 1 de 3',
      description: 'Define la estructura general: título, objetivos Bloom y conceptos clave que cubrirá la clase.',
      fields: [
        { name: 'tema', label: 'Tema de la clase', type: 'text', placeholder: 'Ej: Fracciones equivalentes' },
        { name: 'materia', label: 'Materia', type: 'select', options: ['Matemáticas', 'Lenguaje', 'Ciencias Naturales', 'Ciencias Sociales', 'Inglés', 'Educación Física', 'Artes', 'Música', 'Religión'] },
        { name: 'nivel', label: 'Nivel', type: 'select', options: ['Primaria', 'Secundaria'] },
        { name: 'grado', label: 'Grado', type: 'select', options: ['1°','2°','3°','4°','5°','6°'] },
        { name: 'paginas', label: 'Páginas del libro (opcional)', type: 'text', placeholder: 'Ej: 45-62' },
      ],
      produces: ['titulo', 'objetivosBloom', 'conceptosClave'],
    },
    {
      id: 'desarrollo',
      label: 'Desarrollo',
      subtitle: 'Paso 2 de 3',
      description: 'Desarrolla cada concepto con explicaciones detalladas, ejemplos y datos curiosos.',
      fields: [
        { name: 'enfasis', label: 'Énfasis pedagógico', type: 'textarea', placeholder: 'Ej: Incluir ejemplos de la vida cotidiana, conectar con temas anteriores…', default: 'Incluir ejemplos prácticos y conectados a la realidad del estudiante.' },
      ],
      produces: ['cards'],
    },
    {
      id: 'actividades',
      label: 'Actividades',
      subtitle: 'Paso 3 de 3',
      description: 'Añade actividades prácticas, preguntas de reflexión y ejercicios "Para copiar en tu cuaderno".',
      fields: [
        { name: 'tipo_actividades', label: 'Tipo de actividades', type: 'textarea', placeholder: 'Ej: Ejercicios grupales, preguntas abiertas, retos…', default: 'Mezcla de individuales y grupales con preguntas de reflexión.' },
      ],
      produces: ['actividades', 'paraCopiar'],
    },
  ],

  plan: [
    {
      id: 'encabezado',
      label: 'Encabezado',
      subtitle: 'Paso 1 de 3',
      description: 'Define los datos generales de la clase: objetivo, materiales, competencias y conocimientos previos.',
      fields: [
        { name: 'tema_clase', label: 'Tema de la clase', type: 'text', placeholder: 'Ej: Ecuaciones lineales' },
        { name: 'objetivo_general', label: 'Objetivo general', type: 'textarea', placeholder: 'Ej: Que los estudiantes resuelvan ecuaciones de primer grado…' },
        { name: 'conceptos_clave', label: 'Conceptos clave', type: 'text', placeholder: 'Ej: Variable, incógnita, despeje' },
        { name: 'palabras_clave', label: 'Palabras clave (opcional)', type: 'text', placeholder: 'Separadas por coma' },
      ],
      produces: ['objetivo', 'materiales', 'competencias', 'conocimientosPrevios'],
    },
    {
      id: 'secuencia',
      label: 'Secuencia Didáctica',
      subtitle: 'Paso 2 de 3',
      description: 'Construye la clase paso a paso: inicio, desarrollo y cierre con tiempos estimados.',
      fields: [
        { name: 'inteligencias_sugeridas', label: 'Inteligencias múltiples a trabajar', type: 'text', placeholder: 'Ej: Lógico-matemática, lingüística, kinestésica', default: 'Lógico-matemática, lingüística' },
      ],
      produces: ['inicio', 'desarrollo', 'cierre'],
    },
    {
      id: 'evaluacion',
      label: 'Evaluación',
      subtitle: 'Paso 3 de 3',
      description: 'Define cómo evaluarás: instrumentos, criterios, diferenciación y tarea.',
      fields: [
        { name: 'diagnosticos', label: 'Diagnósticos o adecuaciones', type: 'textarea', placeholder: 'Ej: Estudiante con TDAH — permitir movimiento controlado' },
      ],
      produces: ['instrumentos', 'criterios', 'diferenciacion', 'tarea'],
    },
  ],

  ficha: [
    {
      id: 'mecanica',
      label: 'Mecánica del Juego',
      subtitle: 'Paso 1 de 2',
      description: 'Define las reglas base: objetivo, materiales, equipos y sistema de puntuación.',
      fields: [
        { name: 'tema', label: 'Tema', type: 'text', placeholder: 'Ej: La Revolución Industrial' },
        { name: 'nivel', label: 'Nivel', type: 'select', options: ['Primaria', 'Secundaria'] },
        { name: 'grado', label: 'Grado', type: 'select', options: ['1°','2°','3°','4°','5°','6°'] },
        { name: 'materia', label: 'Materia', type: 'select', options: ['Matemáticas', 'Lenguaje', 'Ciencias Naturales', 'Ciencias Sociales', 'Inglés', 'Educación Física', 'Artes', 'Música', 'Religión'] },
      ],
      produces: ['objetivoJuego', 'reglas', 'materiales', 'formacionEquipos', 'puntuacion'],
    },
    {
      id: 'contenido',
      label: 'Contenido del Juego',
      subtitle: 'Paso 2 de 2',
      description: 'Población de preguntas, desafíos, bonus y variantes según el tema.',
      fields: [
        { name: 'num_preguntas', label: 'Número de preguntas', type: 'text', placeholder: 'Ej: 10', default: '10' },
        { name: 'dificultad', label: 'Dificultad', type: 'text', placeholder: 'Ej: Media-alta' },
      ],
      produces: ['preguntas', 'desafios', 'bonus', 'variantes'],
    },
  ],

  quiz: [
    {
      id: 'estructura',
      label: 'Estructura del Quiz',
      subtitle: 'Paso 1 de 2',
      description: 'Configura el formato: número de preguntas, tipos, puntuación y tiempo límite.',
      fields: [
        { name: 'tema', label: 'Tema', type: 'text', placeholder: 'Ej: Verbos irregulares en inglés' },
        { name: 'materia', label: 'Materia', type: 'select', options: ['Matemáticas', 'Lenguaje', 'Ciencias Naturales', 'Ciencias Sociales', 'Inglés', 'Educación Física', 'Artes', 'Música', 'Religión'] },
        { name: 'nivel', label: 'Nivel', type: 'select', options: ['Primaria', 'Secundaria'] },
        { name: 'grado', label: 'Grado', type: 'select', options: ['1°','2°','3°','4°','5°','6°'] },
      ],
      produces: ['numPreguntas', 'tiposPregunta', 'puntuacionMaxima', 'tiempoLimite'],
    },
    {
      id: 'preguntas',
      label: 'Preguntas',
      subtitle: 'Paso 2 de 2',
      description: 'Redacta cada pregunta con opciones y respuesta correcta.',
      fields: [
        { name: 'num_preguntas', label: 'Cantidad de preguntas', type: 'text', placeholder: 'Ej: 8', default: '8' },
        { name: 'incluir_abiertas', label: 'Incluir preguntas abiertas', type: 'checkbox', default: true },
      ],
      produces: ['preguntas'],
    },
  ],

  pdc: [
    {
      id: 'vision_general',
      label: 'Visión General',
      subtitle: 'Paso 1 de 3',
      description: 'Define competencias, indicadores de logro y contenidos generales del trimestre.',
      fields: [
        { name: 'materia', label: 'Materia', type: 'select', options: ['Matemáticas', 'Lenguaje', 'Ciencias Naturales', 'Historia'] },
        { name: 'nivel', label: 'Nivel', type: 'select', options: ['Secundaria', 'Primaria'] },
        { name: 'grado', label: 'Grado', type: 'select', options: ['1er año','2do año','3er año'] },
        { name: 'sugerencias', label: 'Sugerencias o enfoque', type: 'textarea', placeholder: 'Ej: Enfoque en fracciones y ecuaciones lineales' },
      ],
      produces: ['competencias', 'indicadores', 'contenidosGenerales'],
    },
    {
      id: 'desglose',
      label: 'Desglose Semanal',
      subtitle: 'Paso 2 de 3',
      description: 'Distribuye los contenidos en semanas con actividades específicas.',
      fields: [
        { name: 'adecuaciones', label: 'Adecuaciones curriculares', type: 'textarea', placeholder: 'Ej: Estudiante con dislexia — materiales visuales' },
      ],
      produces: ['semanas'],
    },
    {
      id: 'evaluacion',
      label: 'Plan de Evaluación',
      subtitle: 'Paso 3 de 3',
      description: 'Define instrumentos, criterios, recursos y bibliografía del trimestre.',
      fields: [
        { name: 'instrumentos', label: 'Instrumentos de evaluación', type: 'text', placeholder: 'Ej: Rúbrica, lista de cotejo, portafolio', default: 'Rúbrica analítica, lista de cotejo, prueba escrita' },
      ],
      produces: ['instrumentos', 'criterios', 'recursos', 'bibliografia'],
    },
  ],

  synthesis: [
    {
      id: 'mapa_conceptual',
      label: 'Mapa Conceptual',
      subtitle: 'Paso 1 de 2',
      description: 'Define los ejes temáticos, sub-temas y conexiones de la unidad.',
      fields: [
        { name: 'unidad', label: 'Unidad o materia', type: 'text', placeholder: 'Ej: Álgebra básica' },
        { name: 'grado_nivel', label: 'Grado y nivel', type: 'text', placeholder: 'Ej: 3er año Secundaria' },
        { name: 'temas', label: 'Temas a cubrir', type: 'textarea', placeholder: 'Ej: Ecuaciones lineales, sistemas de ecuaciones, inecuaciones' },
      ],
      produces: ['ejes', 'subTemas', 'conexiones'],
    },
    {
      id: 'desarrollo',
      label: 'Desarrollo',
      subtitle: 'Paso 2 de 2',
      description: 'Expande cada sub-tema con contenido detallado, ejemplos y actividades sugeridas.',
      fields: [
        { name: 'diagnosticos', label: 'Diagnósticos o notas', type: 'textarea', placeholder: 'Ej: Grupo con base sólida en operaciones básicas' },
      ],
      produces: ['contenidoExpandido', 'ejemplos', 'actividadesSugeridas'],
    },
  ],
};

export function getPhaseDefs(motorType: MotorType): PhaseDef[] {
  return PHASE_DEFINITIONS[motorType] || [];
}

export function getPhase(motorType: MotorType, phaseIndex: number): PhaseDef | null {
  const phases = PHASE_DEFINITIONS[motorType];
  return phases && phaseIndex >= 0 && phaseIndex < phases.length ? phases[phaseIndex] : null;
}

export const TOTAL_PHASES: Record<MotorType, number> = {
  alpha2: 0,
  abp: 0,
  assessment: 0,
  tutor: 0,
  recalibrate: 0,
  micro: 0,
  slides: 3,
  plan: 3,
  ficha: 2,
  quiz: 2,
  pdc: 3,
  synthesis: 2,
};
