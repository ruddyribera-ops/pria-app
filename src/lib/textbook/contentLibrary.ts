/**
 * Content library for PRIA v10
 * Maps (grado, materia, motor) to tailored prompts, vocabulary, and examples.
 *
 * Future: expand to all 12 grades × 10 materias = 120 combinations.
 */

export type Grado = '3ro-primaria' | '4to-primaria' | '5to-primaria' | '6to-primaria';
export type Materia = 'lenguaje' | 'matematicas' | 'ciencias-naturales' | 'ciencias-sociales';
export type Motor = 'sintesis' | 'plan' | 'slides' | 'quiz' | 'ficha';

export interface ContentConfig {
  grado: Grado;
  materia: Materia;
  motor: Motor;

  // Lexical complexity (age-appropriate vocabulary)
  vocabularyLevel: 'simple' | 'intermediate' | 'advanced';

  // Pedagogical approach
  approach: string; // e.g., "Visual + kinesthetic + reading aloud"

  // Specific guidance for this motor
  motorGuidance: string; // e.g., "Use short sentences, no abstract concepts"

  // Example topics appropriate for this grade/materia
  exampleTopics: string[];

  // Bloom's taxonomy verbs appropriate for this level
  bloomVerbs: string[];
}

const LIBRARY: Record<string, ContentConfig> = {
  // ============================================================
  // 3ro Primaria × Lenguaje (age 8-9, vocabularyLevel: simple)
  // ============================================================
  '3ro-primaria:lenguaje:sintesis': {
    grado: '3ro-primaria',
    materia: 'lenguaje',
    motor: 'sintesis',
    vocabularyLevel: 'simple',
    approach: 'Cuentos ilustrados, rimas, trabalenguas, vocabulario visual',
    motorGuidance: 'Vocabulario muy simple. Oraciones cortas. Temas de la vida cotidiana: familia, escuela, animales, naturaleza.',
    exampleTopics: [
      'La familia y los oficios',
      'Animales de Bolivia',
      'Cuentos populares andinos',
      'La escuela y los amigos'
    ],
    bloomVerbs: ['Recordar', 'Comprender']
  },
  '3ro-primaria:lenguaje:plan': {
    grado: '3ro-primaria',
    materia: 'lenguaje',
    motor: 'plan',
    vocabularyLevel: 'simple',
    approach: 'Juegos de roles, dramatización, lectura en voz alta',
    motorGuidance: 'Plan de 30-40 min: Activación (5 min), Cuento/rima (10 min), Activity kinestésica (10 min), Dibujo/escritura simple (10 min), Cierre (5 min).',
    exampleTopics: [
      'Dramatización de un cuento popular',
      'Rimas y trabalenguas',
      'Dibujo de la historia contada'
    ],
    bloomVerbs: ['Recordar', 'Comprender']
  },
  '3ro-primaria:lenguaje:slides': {
    grado: '3ro-primaria',
    materia: 'lenguaje',
    motor: 'slides',
    vocabularyLevel: 'simple',
    approach: 'Imágenes grandes, poco texto, colores vivos',
    motorGuidance: '6 slides máximo. Mucha imagen, poco texto.letras grandes.',
    exampleTopics: [
      'Slide 1: Portada con ilustración grande',
      'Slide 2: Palabra nueva con dibujo',
      'Slide 3: La historia en 2-3 imágenes',
      'Slide 4: Actividad (colorear, dibujar)',
      'Slide 5: Cierre con pregunta simple',
      'Slide 6: Tarea (traer un dibujo)'
    ],
    bloomVerbs: ['Recordar', 'Comprender']
  },
  '3ro-primaria:lenguaje:quiz': {
    grado: '3ro-primaria',
    materia: 'lenguaje',
    motor: 'quiz',
    vocabularyLevel: 'simple',
    approach: '3 preguntas: 1 opción múltiple con imágenes, 2 verdadero/falso con apoyo visual',
    motorGuidance: 'Oral o visual, no escrito. Tiempo: 3-5 min.',
    exampleTopics: [
      '¿Qué pasó primero? (secuencia)',
      '¿Verdadero o falso? con tarjetas',
      'Señalar la imagen correcta'
    ],
    bloomVerbs: ['Recordar', 'Comprender']
  },
  '3ro-primaria:lenguaje:ficha': {
    grado: '3ro-primaria',
    materia: 'lenguaje',
    motor: 'ficha',
    vocabularyLevel: 'simple',
    approach: 'Espacios grandes para escribir/dibujar, actividades manipulativas',
    motorGuidance: 'Ficha con 2-3 actividades. Espacios para dibujo, no más de 3 líneas de escritura.',
    exampleTopics: [
      'Colorea la imagen y escribe el nombre',
      'Une con líneas las palabras',
      'Dibuja lo que aprendiste'
    ],
    bloomVerbs: ['Recordar', 'Comprender']
  },

  // ============================================================
  // 4to Primaria × Lenguaje (age 9-10, vocabularyLevel: simple→intermediate)
  // ============================================================
  '4to-primaria:lenguaje:sintesis': {
    grado: '4to-primaria',
    materia: 'lenguaje',
    motor: 'sintesis',
    vocabularyLevel: 'simple',
    approach: 'Cuentos más largos, fábulas, descripción de lugares',
    motorGuidance: 'Vocabulario cotidiano + palabras nuevas explicadas. Temas de identidad cultural boliviana.',
    exampleTopics: [
      'Fábulas y moralejas',
      'Tradiciones de Bolivia (Carnaval, Alasita)',
      'Descripción de lugares',
      'Cuentos con valores'
    ],
    bloomVerbs: ['Recordar', 'Comprender', 'Aplicar']
  },
  '4to-primaria:lenguaje:plan': {
    grado: '4to-primaria',
    materia: 'lenguaje',
    motor: 'plan',
    vocabularyLevel: 'simple',
    approach: 'Lectura compartida, discusión en grupo, escritura creativa guiada',
    motorGuidance: 'Plan de 45 min: Activación (5 min), Lectura compartida (15 min), Discusión (10 min), Escritura creativa (10 min), Cierre (5 min).',
    exampleTopics: [
      'Lectura de una fábula + moraleja',
      'Descripción de un lugar conocido',
      'Escritura de un final alternativo'
    ],
    bloomVerbs: ['Recordar', 'Comprender', 'Aplicar']
  },
  '4to-primaria:lenguaje:slides': {
    grado: '4to-primaria',
    materia: 'lenguaje',
    motor: 'slides',
    vocabularyLevel: 'simple',
    approach: 'Visual + textual equilibrado, ejemplos concretos',
    motorGuidance: '8 slides máximo. Equilibrio imagen/texto. Ejemplos de Bolivia.',
    exampleTopics: [
      'Slide 1: Portada',
      'Slide 2: Objetivo',
      'Slide 3-6: Contenido con imágenes',
      'Slide 7: Actividad (3 preguntas)',
      'Slide 8: Cierre + tarea'
    ],
    bloomVerbs: ['Recordar', 'Comprender', 'Aplicar']
  },
  '4to-primaria:lenguaje:quiz': {
    grado: '4to-primaria',
    materia: 'lenguaje',
    motor: 'quiz',
    vocabularyLevel: 'simple',
    approach: '4 preguntas: 2 opción múltiple, 1 verdadero/falso, 1 respuesta corta',
    motorGuidance: 'Evaluar comprensión, no memorización. Tiempo: 5 min.',
    exampleTopics: [
      'Comprensión de la fábula leída',
      'Identificar la moraleja',
      'Vocabulario contextual'
    ],
    bloomVerbs: ['Recordar', 'Comprender', 'Aplicar']
  },
  '4to-primaria:lenguaje:ficha': {
    grado: '4to-primaria',
    materia: 'lenguaje',
    motor: 'ficha',
    vocabularyLevel: 'simple',
    approach: 'Ficha con lectura + actividades progresivas',
    motorGuidance: 'Ficha imprimible. 3 actividades: lectura, comprensión, escritura corta.',
    exampleTopics: [
      'Lee el texto y responde 3 preguntas',
      'Completa el esquema con palabras',
      'Escribe tu opinión en 3 líneas'
    ],
    bloomVerbs: ['Recordar', 'Comprender', 'Aplicar']
  },

  // ============================================================
  // 5to Primaria × Lenguaje (age 10-11, vocabularyLevel: intermediate)
  // ============================================================
  '5to-primaria:lenguaje:sintesis': {
    grado: '5to-primaria',
    materia: 'lenguaje',
    motor: 'sintesis',
    vocabularyLevel: 'intermediate',
    approach: 'Lectoescritura, comprensión lectora, expresión oral y escrita',
    motorGuidance: 'Use textos narrativos, informativos y poéticos apropiados para 10-11 años. Incluir análisis de estructura textual y vocabulario contextual.',
    exampleTopics: [
      'Mitos y leyendas de Bolivia y Latinoamérica',
      'Narración de aventuras y ficción',
      'Textos informativos sobre historia natural',
      'Poesía: haiku, tanka, coplas',
      'Biografías de personajes históricos'
    ],
    bloomVerbs: ['Recordar', 'Comprender', 'Aplicar', 'Analizar', 'Sintetizar']
  },
  '5to-primaria:lenguaje:plan': {
    grado: '5to-primaria',
    materia: 'lenguaje',
    motor: 'plan',
    vocabularyLevel: 'intermediate',
    approach: 'ABP con neuroinclusión, lectura dialógica, escritura creativa',
    motorGuidance: 'Plan de 45 min: Activación (5 min), Lectura activa (15 min), Análisis/Discusión (10 min), Escritura (10 min), Cierre (5 min).',
    exampleTopics: [
      'Análisis de un mito regional',
      'Creación de un cuento corto',
      'Lectura compartida de un capítulo',
      'Taller de escritura poética'
    ],
    bloomVerbs: ['Recordar', 'Comprender', 'Aplicar', 'Analizar']
  },
  '5to-primaria:lenguaje:slides': {
    grado: '5to-primaria',
    materia: 'lenguaje',
    motor: 'slides',
    vocabularyLevel: 'intermediate',
    approach: 'Visual + textual, infografías simples, ejemplos de la vida cotidiana',
    motorGuidance: '10 slides máximo. Cada slide con 1 idea principal. Usar ejemplos concretos de Bolivia cuando sea posible.',
    exampleTopics: [
      'Slide 1: Portada con tema del día',
      'Slide 2: Objetivo de aprendizaje',
      'Slide 3-7: Contenido con ejemplos',
      'Slide 8: Actividad (3 preguntas)',
      'Slide 9: Plenario (cierre)',
      'Slide 10: Tarea para casa'
    ],
    bloomVerbs: ['Recordar', 'Comprender', 'Aplicar']
  },
  '5to-primaria:lenguaje:quiz': {
    grado: '5to-primaria',
    materia: 'lenguaje',
    motor: 'quiz',
    vocabularyLevel: 'intermediate',
    approach: '5 preguntas: 2 opción múltiple, 2 verdadero/falso, 1 desarrollo corto',
    motorGuidance: 'Las preguntas deben evaluar comprensión lectora, no memorización. Tiempo: 5 min.',
    exampleTopics: [
      'Lectura de un párrafo breve + 2 preguntas de comprensión',
      'Identificar ideas principales',
      'Vocabulario contextual',
      'Inferir significados'
    ],
    bloomVerbs: ['Recordar', 'Comprender']
  },
  '5to-primaria:lenguaje:ficha': {
    grado: '5to-primaria',
    materia: 'lenguaje',
    motor: 'ficha',
    vocabularyLevel: 'intermediate',
    approach: 'Ficha de práctica individual: lectura + 3 actividades progresivas',
    motorGuidance: 'Ficha imprimible. Usar espacios para que el estudiante escriba. Incluir autoevaluación.',
    exampleTopics: [
      'Lee el texto y responde',
      'Completa el mapa conceptual',
      'Escribe tu opinión en 3 líneas'
    ],
    bloomVerbs: ['Recordar', 'Comprender', 'Aplicar']
  },

  // ============================================================
  // 6to Primaria × Lenguaje (age 11-12, vocabularyLevel: advanced)
  // ============================================================
  '6to-primaria:lenguaje:sintesis': {
    grado: '6to-primaria',
    materia: 'lenguaje',
    motor: 'sintesis',
    vocabularyLevel: 'advanced',
    approach: 'Textos argumentativos, periodísticos, literarios completos',
    motorGuidance: 'Análisis crítico. Comparación de perspectivas. Vocabulario académico básico.',
    exampleTopics: [
      'Noticias y artículos de opinión',
      'Poesía contemporánea boliviana',
      'Novelas cortas y cuentos largos',
      'Argumentación y debate'
    ],
    bloomVerbs: ['Comprender', 'Aplicar', 'Analizar', 'Evaluar']
  },
  '6to-primaria:lenguaje:plan': {
    grado: '6to-primaria',
    materia: 'lenguaje',
    motor: 'plan',
    vocabularyLevel: 'advanced',
    approach: 'Debate dirigido, análisis crítico, investigación guiada',
    motorGuidance: 'Plan de 50 min: Activación (5 min), Lectura crítica (15 min), Análisis/discusión (15 min), Escritura argumentativa (10 min), Cierre (5 min).',
    exampleTopics: [
      'Análisis de un artículo de opinión',
      'Debate sobre un tema relevante',
      'Escritura de un texto argumentativo'
    ],
    bloomVerbs: ['Comprender', 'Aplicar', 'Analizar', 'Evaluar']
  },
  '6to-primaria:lenguaje:slides': {
    grado: '6to-primaria',
    materia: 'lenguaje',
    motor: 'slides',
    vocabularyLevel: 'advanced',
    approach: 'Infografías, datos, análisis comparativo',
    motorGuidance: '12 slides máximo. Datos, estadísticas, comparaciones. Enfoque analítico.',
    exampleTopics: [
      'Slide 1: Portada con tema',
      'Slide 2: Pregunta generadora',
      'Slide 3-9: Contenido con datos/ejemplos',
      'Slide 10: Actividad analítica',
      'Slide 11: Plenario',
      'Slide 12: Bibliografía + tarea'
    ],
    bloomVerbs: ['Comprender', 'Aplicar', 'Analizar', 'Evaluar']
  },
  '6to-primaria:lenguaje:quiz': {
    grado: '6to-primaria',
    materia: 'lenguaje',
    motor: 'quiz',
    vocabularyLevel: 'advanced',
    approach: '5 preguntas: 1 opción múltiple, 2 verdadero/falso, 2 desarrollo corto',
    motorGuidance: 'Evaluar análisis y evaluación, no solo comprensión. Tiempo: 10 min.',
    exampleTopics: [
      'Análisis de texto argumentativo',
      'Identificar falacias',
      'Comparar perspectivas',
      'Vocabulario técnico'
    ],
    bloomVerbs: ['Comprender', 'Analizar', 'Evaluar']
  },
  '6to-primaria:lenguaje:ficha': {
    grado: '6to-primaria',
    materia: 'lenguaje',
    motor: 'ficha',
    vocabularyLevel: 'advanced',
    approach: 'Ficha de análisis con actividades de orden superior',
    motorGuidance: 'Ficha con 4 actividades progresivas. Espacio para análisis escrito.',
    exampleTopics: [
      'Lee el artículo y haz un resumen crítico',
      'Identifica los argumentos principales',
      'Escribe tu posición justificada',
      'Autoevaluación con rúbrica'
    ],
    bloomVerbs: ['Comprender', 'Analizar', 'Evaluar']
  },
};

const DEFAULT_CONFIG: Omit<ContentConfig, 'grado' | 'materia' | 'motor'> = {
  vocabularyLevel: 'intermediate',
  approach: 'ABP con neuroinclusión, múltiples inteligencias',
  motorGuidance: 'Usa vocabulario apropiado para el grado y conecta con la realidad del estudiante.',
  exampleTopics: ['Tema del currículo actual'],
  bloomVerbs: ['Recordar', 'Comprender', 'Aplicar', 'Analizar']
};

/**
 * Get content config for a (grado, materia, motor) combination.
 * Returns a sensible default if the combination is not in the library.
 */
export function getContentConfig(
  grado: Grado | string,
  materia: Materia | string,
  motor: Motor | string
): ContentConfig {
  const key = `${grado}:${materia}:${motor}`;
  const config = LIBRARY[key];
  if (config) return config;

  // Generic default based on motor
  return {
    grado: grado as Grado,
    materia: materia as Materia,
    motor: motor as Motor,
    ...DEFAULT_CONFIG
  };
}

/**
 * Get all available combinations in the library.
 */
export function getAvailableCombinations(): string[] {
  return Object.keys(LIBRARY);
}

/**
 * Get a tailored prompt enhancement string for a (grado, materia, motor) combination.
 * Returns text that can be prepended/appended to the base motor prompt.
 */
export function getPromptEnhancement(
  grado: Grado | string,
  materia: Materia | string,
  motor: Motor | string
): string {
  const config = getContentConfig(grado, materia, motor);
  return `
CONTEXTO PEDAGÓGICO (${config.grado}, ${config.materia}):
- Nivel de vocabulario: ${config.vocabularyLevel}
- Enfoque: ${config.approach}
- Guía específica: ${config.motorGuidance}
- Ejemplos de temas apropiados: ${config.exampleTopics.join(', ')}
- Verbos de Bloom sugeridos: ${config.bloomVerbs.join(', ')}
`.trim();
}

// For testing in browser console:
// getContentConfig('5to-primaria', 'lenguaje', 'sintesis')
// getPromptEnhancement('5to-primaria', 'lenguaje', 'plan')
// getAvailableCombinations()