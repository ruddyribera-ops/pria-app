/**
 * promptRunner.ts â€” Local AI prompt execution engine
 * ==================================================
 * Executes motor generation in 3 modes:
 * 1. FULL_AI  â€” call backend /motores/{type} endpoint (backend loads prompts from disk)
 * 2. MOCK     â€” generate structured mock matching prompt output schema
 * 3. SKIP     â€” no-op
 *
 * NOTE: All prompt templates live on the backend (server/src/motores/prompts/*.md).
 * Frontend does NOT load prompts â€” it sends params to the backend which
 * handles prompt substitution internally.
 */

import type { MotorType } from '../../hooks/useMotorGeneration';
import { callMinimax } from '../ai/minimaxClient';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Mode configuration
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type PromptMode = 'FULL_AI' | 'MOCK' | 'SKIP';

export interface PromptContext {
  motorType: MotorType;
  phaseId: string;
  params: Record<string, unknown>;
  accumulated: Record<string, unknown>;
}

export interface PromptResult {
  mode: PromptMode;
  promptText?: string;
  rawOutput?: string;
  structuredOutput?: unknown;
  error?: string;
  simulated?: boolean;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Prompt file loader and variable substitution
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€






// loadPromptFile() eliminado â€” los prompts ya se importan estÃ¡ticamente
// al inicio del archivo (import *Prompt from '...?raw'). El @vite-ignore
// solo servÃ­a para suprimir errores reales.

/**
 * Substitute {variable} tokens in prompt template with actual values.
 * Handles: simple variables, boolean flags, array/list formatting.
 */
export function substituteVariables(
  template: string,
  variables: Record<string, unknown>,
): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const token = '{' + key + '}';

    if (value === undefined || value === null) {
      result = result.replace(new RegExp(token.replace(/[{}]/g, '\\$&'), 'g'), '');
      continue;
    }

    let replacement: string;
    if (typeof value === 'boolean') {
      replacement = value ? 'Sí' : 'No';
    } else if (Array.isArray(value)) {
      // Format arrays as bullet lists for prompt readability
      replacement = value.map(item => '- ' + item).join('\n');
    } else if (typeof value === 'object') {
      // Format objects/JSON as readable text
      replacement = JSON.stringify(value, null, 2);
    } else {
      replacement = String(value);
    }

    result = result.replace(new RegExp(token.replace(/[{}]/g, '\\$&'), 'g'), replacement);
  }

  return result;
}

/**
 * Format accumulated phase results as contexto_anterior for the prompt.
 * Condenses previous phases into a readable summary.
 */
export function formatContextoAnterior(
  accumulated: Record<string, unknown>,
  _motorType: MotorType,
): string {
  if (Object.keys(accumulated).length === 0) return 'Sin contexto previo.';

  const entries = Object.entries(accumulated);
  const lines: string[] = [];

  for (const [phaseId, content] of entries) {
    if (!content || typeof content !== 'object') continue;

    lines.push('## Fase anterior: ' + phaseId);

    const obj = content as Record<string, unknown>;
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) continue;

      if (Array.isArray(value)) {
        lines.push('  ' + key + ':');
        value.forEach(item => lines.push('    - ' + item));
      } else if (typeof value === 'object') {
        lines.push('  ' + key + ': ' + JSON.stringify(value));
      } else {
        lines.push('  ' + key + ': ' + String(value));
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Individual mock generators
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Alpha-2: PDF curriculum extraction */
export function mockAlpha2Output(params: Record<string, unknown>): Record<string, unknown> {
  const unidad = (params.unidad as string) || (params.unidad_real as string) || 'Unidad 2';
  const temasRaw = params.temas;
  const temasEntrada: string[] = Array.isArray(temasRaw)
    ? temasRaw as string[]
    : typeof temasRaw === 'string'
      ? (temasRaw as string).split(/[,\n]/).map(t => t.trim()).filter(Boolean)
      : [];

  const defaultTemas = [
    'Origen del ser humano',
    'Poblamiento de AmÃ©rica',
    'Caza y pesca en la prehistoria',
    'Agricultura y domesticaciÃ³n',
    'Primeras aldeas',
    'CerÃ¡mica y textilerÃ­a',
  ];

  const defaultContenido: Record<string, string> = {
    'Origen del ser humano': 'Los primeros seres humanos aparecieron en Ãfrica hace aproximadamente 2 millones de aÃ±os. Eran nÃ³madas que se desplazaban en busca de alimentos y refugio. Utilizaban herramientas de piedra y vivÃ­an en pequeÃ±os grupos familiares.',
    'Poblamiento de AmÃ©rica': 'Los primeros pobladores de AmÃ©rica llegaron desde Asia a travÃ©s del estrecho de Bering durante la Ãºltima glaciaciÃ³n, hace aproximadamente 15,000 aÃ±os. Eran cazadores-recolectores que siguieron a los grandes animales.',
    'Caza y pesca en la prehistoria': 'La caza y la pesca eran las principales actividades de subsistencia. Los hombres cazaban grandes animales como mamuts y bisontes, mientras las mujeres recolectaban frutos y raÃ­ces.',
    'Agricultura y domesticaciÃ³n': 'El descubrimiento de la agricultura hace unos 10,000 aÃ±os transformÃ³ la vida humana. Los pueblos aprendieron a cultivar plantas como el maÃ­z, la papa y el trigo, y a domesticar animales como la llama y el perro.',
    'Primeras aldeas': 'Con la agricultura, los grupos humanos se volvieron sedentarios. Construyeron las primeras aldeas cerca de rÃ­os y valles fÃ©rtiles. Desarrollaron la cerÃ¡mica para almacenar alimentos y agua.',
    'CerÃ¡mica y textilerÃ­a': 'La cerÃ¡mica permitiÃ³ cocinar y almacenar alimentos. Los pueblos prehispÃ¡nicos desarrollaron tÃ©cnicas avanzadas de textilerÃ­a usando algodÃ³n y lana de camÃ©lidos.',
  };

  const defaultPaginas: Record<string, string> = {
    'Origen del ser humano': 'pp. 22-29',
    'Poblamiento de AmÃ©rica': 'pp. 30-37',
    'Caza y pesca en la prehistoria': 'pp. 38-43',
    'Agricultura y domesticaciÃ³n': 'pp. 44-51',
    'Primeras aldeas': 'pp. 52-58',
    'CerÃ¡mica y textilerÃ­a': 'pp. 59-65',
  };

  const temas = temasEntrada.length > 0 ? temasEntrada : defaultTemas;
  const contenido_temas: Record<string, string> = {};
  const paginas_temas: Record<string, string> = {};
  temas.forEach((tema, i) => {
    contenido_temas[tema] = defaultContenido[tema] || ('Contenido de ' + tema + ' â€” al menos 10 caracteres de texto simulado para validaciÃ³n del schema.');
    paginas_temas[tema] = defaultPaginas[tema] || ('pp. ' + (i * 8 + 10) + '-' + (i * 8 + 17));
  });

  return { unidad_real: unidad, temas, contenido_temas, paginas_temas };
}

/** Synthesis (M0a): unidad sintetizada */
export function mockSynthesisOutput(params: Record<string, unknown>): Record<string, unknown> {
  const unidad_real = (params.unidad as string) || (params.unidad_real as string) || 'Unidad 1';
  const temasRaw = params.temas;
  const temas: string[] = Array.isArray(temasRaw)
    ? temasRaw as string[]
    : typeof temasRaw === 'string'
      ? (temasRaw as string).split(/[,\n]/).map(t => t.trim()).filter(Boolean)
      : ['Tema de ejemplo A', 'Tema de ejemplo B', 'Tema de ejemplo C'];
  const diagnosticos = (params.diagnosticos as string) || '';

  const temasDesarrollados = temas.map((tema, i) => {
    const inteligencias = [
      ['LingÃ¼Ã­stica', 'LÃ³gico-matemÃ¡tica'],
      ['Visual-espacial', 'KinestÃ©sica'],
      ['Musical', 'Interpersonal'],
      ['Naturalista', 'Intrapersonal'],
    ][i % 4];

    return {
      nombre: tema,
      conceptos_clave: [
        'Concepto fundamental de ' + tema,
        'AplicaciÃ³n prÃ¡ctica de ' + tema,
        'ConexiÃ³n de ' + tema + ' con la vida cotidiana',
      ],
      inteligencias_sugeridas: inteligencias,
      actividades: [
        { tipo: 'Investigativa', inteligencia: inteligencias[0] },
        { tipo: 'Colaborativa', inteligencia: inteligencias[1] },
      ],
    };
  });

  let notasDocente = 'DUA: Usar mÃºltiples formas de representaciÃ³n. ';
  if (diagnosticos.toLowerCase().includes('tdah')) {
    notasDocente += 'Para TDAH: pausas activas cada 15 min, trabajo en bursts de 10 min. ';
  }
  if (diagnosticos.toLowerCase().includes('tea')) {
    notasDocente += 'Para TEA: anticipar la rutina, agenda visual al inicio, estructura clara. ';
  }
  if (diagnosticos.toLowerCase().includes('dislexia')) {
    notasDocente += 'Para Dislexia: aceptar respuestas orales, no penalizar ortografÃ­a. ';
  }
  if (!diagnosticos || diagnosticos === 'No especificado') {
    notasDocente += 'Estrategias universales aplicadas para aula heterogÃ©nea.';
  }

  return {
    unidad_sintetizada: {
      titulo: unidad_real,
      enfoque_didactico: 'ABP con neuroinclusiÃ³n',
      temas_desarrollados: temasDesarrollados,
      notas_docente: notasDocente,
      proyecto_pbl: 'Crear un proyecto integrador que conecte los conceptos de ' + temas.slice(0, 2).join(' y ') + ' con situaciones reales del entorno del estudiante.',
    },
  };
}

/** ABP (M0b): proyecto de aprendizaje basado en proyectos */
export function mockABPOutput(params: Record<string, unknown>): Record<string, unknown> {
  const titulo = (params.unidad as string) || (params.unidad_real as string) || 'Unidad';
  return {
    proyecto: {
      titulo: 'Exploradores del Conocimiento: ' + titulo,
      pregunta_generadora: 'Â¿CÃ³mo podemos investigar y compartir nuestro aprendizaje sobre ' + titulo + ' de forma creativa?',
      fases: [
        {
          nombre: 'Fase 1: InvestigaciÃ³n',
          duracion: '1 semana',
          actividades: ['Formar equipos de investigaciÃ³n', 'Buscar informaciÃ³n en recursos digitales', 'Crear un mapa conceptual colaborativo'],
          adaptaciones: [{ diagnostico: 'TDAH', adaptacion: 'Trabajo en bursts de 15 min con pausas activas' }],
        },
        {
          nombre: 'Fase 2: CreaciÃ³n',
          duracion: '2 semanas',
          actividades: ['DiseÃ±ar el producto final', 'Trabajar en equipos para construir el producto', 'RevisiÃ³n entre pares y mejoras'],
          adaptaciones: [{ diagnostico: 'TEA', adaptacion: 'Estructura clara con agenda visual diaria' }],
        },
        {
          nombre: 'Fase 3: PresentaciÃ³n',
          duracion: '1 semana',
          actividades: ['Preparar presentaciÃ³n oral', 'Exponer al resto de la clase', 'ReflexiÃ³n escrita sobre lo aprendido'],
          adaptaciones: [],
        },
      ],
      productos: ['Producto visual (cartel o presentaciÃ³n)', 'PresentaciÃ³n oral', 'Auto-evaluaciÃ³n escrita'],
      adaptaciones_inclusivas: [
        { diagnostico: 'TDAH', adaptacion: 'Pausas activas cada 15 min, metas cortas, checklist visual' },
        { diagnostico: 'TEA', adaptacion: 'Agenda visual, anticipaciÃ³n de cambios, instrucciones claras' },
        { diagnostico: 'DISLEXIA', adaptacion: 'Aceptar formatos orales y visuales, no penalizar ortografÃ­a' },
      ],
      evaluacion: {
        criterios: ['ComprensiÃ³n del tema', 'Creatividad del producto', 'Trabajo en equipo', 'ExpresiÃ³n oral'],
        instrumentos: ['RÃºbrica de evaluaciÃ³n', 'Auto-evaluaciÃ³n', 'CoevaluaciÃ³n entre pares'],
      },
    },
  };
}

/** Assessment (M0c): rÃºbrica + autoevaluaciÃ³n + coevaluaciÃ³n */
export function mockAssessmentOutput(params: Record<string, unknown>): Record<string, unknown> {
  const proyecto = (params.proyecto_pbl as string) || (params.unidad as string) || 'Proyecto';
  return {
    evaluacion: {
      proyecto,
      rubrica: {
        criterios: [
          { nombre: 'Contenido', peso: '30%', niveles: { excelente: 'Demuestra comprensiÃ³n profunda del tema con ejemplos propios', suficiente: 'Comprende el tema y puede explicarlo correctamente', en_desarrollo: 'Comprende parcialmente, necesita apoyo para explicar', inicial: 'No demuestra comprensiÃ³n del tema' } },
          { nombre: 'Creatividad', peso: '25%', niveles: { excelente: 'Producto original, innovador y bien elaborado', suficiente: 'Producto creativo con buenos acabados', en_desarrollo: 'Producto bÃ¡sico con poco esfuerzo creativo', inicial: 'Producto incompleto o copiado' } },
          { nombre: 'Trabajo en equipo', peso: '25%', niveles: { excelente: 'Lidera, colabora y resuelve conflictos', suficiente: 'Colabora activamente y cumple su rol', en_desarrollo: 'Participa pero necesita recordatorios', inicial: 'No colabora o dificulta el trabajo grupal' } },
          { nombre: 'ExpresiÃ³n oral', peso: '20%', niveles: { excelente: 'Expone con claridad, seguridad y responde preguntas', suficiente: 'Expone el contenido correctamente', en_desarrollo: 'Expone con dificultad, necesita apoyo', inicial: 'No logra exponer sus ideas' } },
        ],
      },
      autoevaluacion: {
        preguntas: [
          { pregunta: 'Â¿CompletÃ© todas las tareas asignadas?', tipo: 'si_no' },
          { pregunta: 'Â¿InvestiguÃ© por mi cuenta para aprender mÃ¡s?', tipo: 'si_no' },
          { pregunta: 'Â¿EntreguÃ© mi trabajo a tiempo?', tipo: 'si_no' },
          { pregunta: 'Â¿AyudÃ© a mis compaÃ±eros cuando lo necesitaron?', tipo: 'si_no' },
        ],
        reflexion: ['Mi mayor logro fue...', 'Algo que puedo mejorar es...', 'La prÃ³xima vez harÃ­a diferente...'],
      },
      coevaluacion: {
        preguntas: [
          { pregunta: 'Â¿Mi compaÃ±ero aportÃ³ ideas al equipo?', tipo: 'escala_1_4' },
          { pregunta: 'Â¿CumpliÃ³ con su parte del trabajo?', tipo: 'escala_1_4' },
          { pregunta: 'Â¿EscuchÃ³ y respetÃ³ las ideas de otros?', tipo: 'escala_1_4' },
        ],
      },
      adaptaciones: [
        { diagnostico: 'TDAH', adaptacion: 'Tiempo extra, dividir tareas, checklist visual de pasos' },
        { diagnostico: 'TEA', adaptacion: 'RÃºbrica visual con imÃ¡genes, anticipar criterios, instrucciones concretas' },
        { diagnostico: 'DISLEXIA', adaptacion: 'Aceptar respuestas orales/grabadas, no penalizar ortografÃ­a' },
      ],
    },
  };
}

/** Plan de clase (M1a): secuencia didÃ¡ctica 45 min */
export function mockPlanOutput(params: Record<string, unknown>): Record<string, unknown> {
  const tema_clase = (params.tema_clase as string) || (params.tema as string) || 'el tema';
  const conceptos_clave = (params.conceptos_clave as string) || tema_clase;
  const diagnosticos = (params.diagnosticos as string) || '';
  const inteligencias = (params.inteligencias_sugeridas as string) || 'LingÃ¼Ã­stica, LÃ³gico-matemÃ¡tica, KinestÃ©sica';
  const inteligenciaList = inteligencias.split(',').map(s => s.trim()).filter(Boolean);

  const inteligencias_multiples = inteligenciaList.map(int => ({
    inteligencia: int,
    actividad: 'Actividad para desarrollar la inteligencia ' + int + ' mediante ' + tema_clase,
  }));

  const tabla_adaptaciones: { diagnostico: string; adaptacion: string }[] = [];
  if (diagnosticos.toLowerCase().includes('tdah')) tabla_adaptaciones.push({ diagnostico: 'TDAH', adaptacion: 'Pausas activas cada 15 min, trabajo en bursts de 10 min' });
  if (diagnosticos.toLowerCase().includes('tea')) tabla_adaptaciones.push({ diagnostico: 'TEA', adaptacion: 'Agenda visual, anticipaciÃ³n de cambios, estructura clara' });
  if (diagnosticos.toLowerCase().includes('dislexia')) tabla_adaptaciones.push({ diagnostico: 'DISLEXIA', adaptacion: 'Instrucciones orales + escritas, no penalizar ortografÃ­a' });

  return {
    mapa_cognitivo: {
      verbos_bloom: ['Recordar', 'Comprender', 'Aplicar'],
      nivel_taxonomia: 'bÃ¡sico-intermedio',
      enfoque_sensorial: 'visual-y-kinestÃ©sico',
    },
    inteligencias_multiples,
    secuencia_didactica: {
      bloques: [
        { nombre: 'Inicio', duracion: 10, objetivo: 'Activar conocimientos previos', actividad: 'ActivaciÃ³n mediante pregunta generadora sobre ' + tema_clase + '. PresentaciÃ³n del objetivo.', nota: 'Usar material visual.' },
        { nombre: 'Desarrollo', duracion: 25, objetivo: 'Introducir y practicar ' + conceptos_clave, actividad: 'ExplicaciÃ³n con apoyo visual. Ejercicios guiados. Trabajo en parejas.', nota: 'Pausa kinestÃ©sica a los 15 min.' },
        { nombre: 'Cierre', duracion: 10, objetivo: 'Aplicar y consolidar', actividad: 'Resumen colaborativo de ' + tema_clase + '. Preguntas de metacogniciÃ³n.', nota: 'Movimiento activo breve.' },
      ],
    },
    dua_neuroinclusion: ['MÃºltiples formas de representaciÃ³n', 'MÃºltiples formas de acciÃ³n y expresiÃ³n', 'MÃºltiples formas de implicaciÃ³n'],
    tabla_adaptaciones_clase: tabla_adaptaciones,
    perfil_aula_resumido: diagnosticos && diagnosticos !== 'No especificado' ? 'Aula diversa con ' + diagnosticos : 'Aula heterogÃ©nea sin diagnÃ³sticos especÃ­ficos',
    recursos_necesarios: ['Pizarra y marcadores', 'Libro de texto', 'Fichas de trabajo', 'Proyector (opcional)'],
  };
}

/** Slides (M1b): 10 slides para presentaciÃ³n */
export function mockSlidesOutput(params: Record<string, unknown>): unknown[] {
  const palabras_clave = (params.palabras_clave as string) || (params.tema as string) || 'Tema';
  const keywords = palabras_clave.split(',').map(s => s.trim()).filter(Boolean);
  const titulo = keywords[0] || 'Tema de la clase';

  const slideDefs = [
    { tipo: 'portada' as const },
    { tipo: 'objetivos' as const },
    { tipo: 'concepto' as const },
    { tipo: 'concepto' as const },
    { tipo: 'concepto' as const },
    { tipo: 'pausa' as const },
    { tipo: 'concepto' as const },
    { tipo: 'concepto' as const },
    { tipo: 'concepto' as const },
    { tipo: 'cierre' as const },
  ];

  return slideDefs.map((def, i) => {
    const num = i + 1;
    const kw = keywords[i % keywords.length] || 'Concepto ' + i;
    switch (def.tipo) {
      case 'portada':
        return { numero: num, tipo: 'portada', titulo: titulo, texto_pantalla: 'Aprende sobre ' + titulo, guion_docente: 'Bienvenida. Presentar el tema y objetivos.', prompt_imagen: 'Flat illustration children educational style exploring ' + titulo + ' bright classroom warm palette' };
      case 'objetivos':
        return { numero: num, tipo: 'objetivos', titulo: 'Objetivos', texto_pantalla: keywords.map(k => '- Comprender ' + k).join('\n'), guion_docente: 'Leer cada objetivo y verificar comprensiÃ³n.', prompt_imagen: 'Illustration children goals targets educational style warm palette', callout: 'Â¿Preguntas sobre los objetivos?' };
      case 'pausa':
        return { numero: num, tipo: 'pausa', titulo: 'Â¡Movimiento!', texto_pantalla: 'LevÃ¡ntate y estiramos 2 minutos', guion_docente: 'Dirigir actividad fÃ­sica breve.', prompt_imagen: 'Illustration children stretching moving classroom warm palette', callout: 'Â¡Buen trabajo! Volvamos a aprender.' };
      case 'cierre':
        return { numero: num, tipo: 'cierre', titulo: 'Resumen Final', texto_pantalla: 'Hoy aprendimos:\n' + keywords.map((k, idx) => (idx + 1) + '. ' + k).join('\n'), guion_docente: 'Resumen colaborativo. Preguntas finales.', prompt_imagen: 'Illustration happy children celebrating learning warm palette', callout: 'Â¡MisiÃ³n cumplida!' };
      default:
        return { numero: num, tipo: 'concepto', titulo: kw, texto_pantalla: 'ExplicaciÃ³n detallada de ' + kw, guion_docente: 'Explicar ' + kw + '. Dar ejemplos. Preguntar comprensiÃ³n.', prompt_imagen: 'Flat illustration child learning ' + kw + ' warm palette' };
    }
  });
}

/** Ficha (M1c): gamified worksheet */
export function mockFichaOutput(params: Record<string, unknown>): Record<string, unknown> {
  const tema = (params.tema as string) || 'el tema';
  const conceptos_raw = (params.conceptos_clave as string) || tema;
  const diagnosticos = (params.diagnosticos as string) || '';
  const conceptos = conceptos_raw.split(',').map(s => s.trim()).filter(Boolean);

  const adaptaciones: { mision: string; diagnostico: string; ajuste: string }[] = [];
  if (diagnosticos.toLowerCase().includes('tdah')) adaptaciones.push({ mision: 'Oraculo', diagnostico: 'TDAH', ajuste: '10 preguntas mÃ¡ximo, pausas cada 5' });
  if (diagnosticos.toLowerCase().includes('tea')) adaptaciones.push({ mision: 'Lienzo', diagnostico: 'TEA', ajuste: 'Modelo dado, menos detalles requeridos' });

  return {
    ficha_trabajo: {
      titulo_gancho: 'MisiÃ³n: Guardianes de ' + (conceptos[0] || 'la Clase'),
      historia_gancho: 'El Reino de las Palabras necesita nuevos guardias. Para ser uno, debes completar 5 misiones secretas usando tus conocimientos de ' + (conceptos[0] || 'la clase') + '. Â¿Aceptas el reto?',
      misiones: {
        oraculo: conceptos.map(c => ({ pregunta: 'Â¿CuÃ¡l es el concepto principal de ' + c + '?', opciones: ['A) OpciÃ³n A', 'B) OpciÃ³n B', 'C) OpciÃ³n C', 'D) OpciÃ³n D'], respuesta_correcta: 'B' })),
        puente: conceptos.map(c => ({ palabra: c, significado: 'DefiniciÃ³n de ' + c + ' en el contexto de la clase' })),
        sopa: conceptos.map(c => c.toUpperCase().slice(0, 4)),
        pergamino: { frase_con_espacios: 'Los estudiantes aplican ___ en situaciones prÃ¡cticas.', palabras_secretas: conceptos.slice(0, 2) },
        lienzo: 'Dibuja un personaje que aplique "' + (conceptos[0] || 'el concepto') + '" en su vida diaria.',
      },
      adaptaciones_por_mision: adaptaciones.length > 0 ? adaptaciones : undefined,
    },
  };
}

/** Quiz (M2a): pop quiz rÃ¡pido */
export function mockQuizOutput(params: Record<string, unknown>): Record<string, unknown> {
  const palabras_clave = (params.palabras_clave as string) || 'el tema';
  return {
    quiz: {
      titulo: 'Pop Quiz: ' + palabras_clave,
      instrucciones: 'Responde de la forma que prefieras.',
      preguntas: [
        { numero: 1, tipo: 'escrita' as const, pregunta: 'Define con tus palabras: ' + palabras_clave, opciones: ['a', 'b', 'c', 'd'], respuesta: 'b' },
        { numero: 2, tipo: 'oral' as const, pregunta: 'Explica brevemente por quÃ© es importante ' + palabras_clave, respuesta: 'Es importante porque permite comprender mejor el tema.' },
        { numero: 3, tipo: 'visual' as const, pregunta: 'Dibuja o describe un ejemplo de ' + palabras_clave },
        { numero: 4, tipo: 'desafio' as const, pregunta: 'Crea una pregunta sobre ' + palabras_clave + ' para tu compaÃ±ero' },
      ],
      clave_respuestas: [
        { pregunta: 1, respuesta: 'b', explicacion: 'DefiniciÃ³n correcta del concepto.' },
        { pregunta: 2, respuesta: 'Respuesta libre', explicacion: 'EvalÃºa comprensiÃ³n personal.' },
      ],
      adaptaciones: [
        { diagnostico: 'TDAH', adaptacion: 'Reducir a 3 preguntas, dar mÃ¡s tiempo' },
        { diagnostico: 'DISLEXIA', adaptacion: 'Leer preguntas en voz alta, aceptar respuestas orales' },
      ],
    },
  };
}

/** Tutor (M2b): panel de control docente */
export function mockTutorOutput(params: Record<string, unknown>): Record<string, unknown> {
  const tema = (params.tema_clase as string) || 'el tema';
  return {
    panel_tutor: {
      resumen_clase: 'Clase sobre ' + tema,
      puntos_clave: ['Concepto 1: Fundamentos', 'Concepto 2: AplicaciÃ³n', 'Concepto 3: Conexiones'],
      momentos_criticos: [
        { momento: 'TransiciÃ³n inicio-desarrollo', accion: 'Verificar comprensiÃ³n', senial: 'Estudiantes distraÃ­dos' },
        { momento: 'Mitad del desarrollo', accion: 'Pausa activa de 2 min', senial: 'Inquietud motora general' },
      ],
      checklist_pre_clase: ['Material impreso', 'Proyector listo', 'Fichas de trabajo', 'Marcadores'],
      adaptaciones_rapidas: [
        { diagnostico: 'TDAH', senial: 'Inquietud motora', intervencion: 'Pausa activa de 2 min' },
        { diagnostico: 'TEA', senial: 'Ansiedad ante cambio', intervencion: 'Mostrar agenda visual y anticipar' },
      ],
      preguntas_frecuentes: [
        { pregunta: 'Â¿QuÃ© hago si un estudiante no entiende?', respuesta_breve: 'Reformular con ejemplo concreto y verificar' },
        { pregunta: 'Â¿CÃ³mo manejar el ritmo de la clase?', respuesta_breve: 'Tener actividad de extensiÃ³n y de refuerzo listas' },
      ],
    },
  };
}

/** PDC Trimestral: planificaciÃ³n curricular trimestral */
export function mockPDCOutput(params: Record<string, unknown>): Record<string, unknown> {
  const m = (params.materia as string) || 'Ciencias Sociales';
  const nivel = (params.nivel as string) || 'Secundaria';
  const grado = (params.grado as string) || '3er aÃ±o';
  return {
    pdc: {
      encabezado: { nivel, grado, materia: m, trimestre: 1, ano_escolar: 2026 },
      unidades: [{
        numero: 1,
        titulo: 'Fundamentos de ' + m,
        semanas: '1-4',
        horas: 15,
        objetivo_holistico: 'Desarrollar comprensiÃ³n de ' + m + ' (Ser, Saber, Hacer, Decidir)',
        contenidos: { ser: ['Responsabilidad', 'ColaboraciÃ³n'], saber: ['Conceptos fundamentales de ' + m], hacer: ['Ejercicios prÃ¡cticos', 'Proyectos grupales'], decidir: ['SelecciÃ³n de estrategias', 'EvaluaciÃ³n de resultados'] },
        metodologia_dua: ['MÃºltiples formas de representaciÃ³n', 'MÃºltiples formas de expresiÃ³n'],
        evaluacion: { formativa: 'AutoevaluaciÃ³n', sumativa: 'Proyecto final' },
      }],
      observaciones: { adaptaciones: ['Adaptaciones DUA segÃºn diagnÃ³stico del aula'], notas_docente: 'Revisar diagnÃ³stico del aula antes de aplicar' },
    },
  };
}

/** Recalibrate: recalibraciÃ³n pedagÃ³gica post-evaluaciÃ³n */
export function mockRecalibrateOutput(_params: Record<string, unknown>): Record<string, unknown> {
  return {
    recalibracion: {
      diagnostico_general: 'Resultados satisfactorios. 70% alcanzÃ³ nivel suficiente o superior.',
      fortalezas: ['ParticipaciÃ³n activa', 'Trabajo en equipo', 'Compromiso con las tareas'],
      areas_mejora: ['ExpresiÃ³n oral', 'Uso de vocabulario tÃ©cnico', 'Profundidad en anÃ¡lisis'],
      ajustes_sugeridos: [
        { area: 'ExpresiÃ³n oral', accion: 'Incluir mÃ¡s presentaciones cortas semanales', impacto_esperado: 'Mejorar fluidez en 20%' },
        { area: 'Vocabulario tÃ©cnico', accion: 'Glosario visual semanal', impacto_esperado: 'Incorporar 5-10 tÃ©rminos por unidad' },
      ],
      recomendaciones_proximo_trimestre: ['Aumentar prÃ¡ctica oral', 'Incorporar glosario visual', 'AÃ±adir rÃºbricas de autoevaluaciÃ³n'],
      adaptaciones_refinadas: [
        { diagnostico: 'TDAH', ajuste: 'Checklist visual de pasos + pausas programadas cada 12 min' },
        { diagnostico: 'TEA', ajuste: 'Agenda visual con pictogramas + anticipaciÃ³n de transiciones' },
      ],
    },
  };
}

/** Micro: micro-objetivos diarios */
export function mockMicroOutput(params: Record<string, unknown>): Record<string, unknown> {
  const unidad = (params.unidad_real as string) || 'Unidad';
  return {
    micro_objetivos: {
      unidad,
      semanas: [
        {
          semana: 1,
          tema: 'Tema 1: IntroducciÃ³n',
          objetivos_diarios: [
            { dia: 1, objetivo: 'Identificar conceptos clave del tema', criterio_logro: 'Nombra 3 conceptos correctamente', actividad_clave: 'Lluvia de ideas guiada' },
            { dia: 2, objetivo: 'Comprender relaciones entre conceptos', criterio_logro: 'Explica conexiones con ejemplos', actividad_clave: 'Mapa conceptual en parejas' },
            { dia: 3, objetivo: 'Aplicar conceptos en ejercicios', criterio_logro: 'Resuelve 3 de 4 ejercicios', actividad_clave: 'Ficha de trabajo individual' },
            { dia: 4, objetivo: 'Analizar casos prÃ¡cticos', criterio_logro: 'Identifica patrones en 2 casos', actividad_clave: 'AnÃ¡lisis grupal de casos' },
            { dia: 5, objetivo: 'Evaluar comprensiÃ³n de la semana', criterio_logro: 'Responde correctamente 70% del quiz', actividad_clave: 'Quiz rÃ¡pido + reflexiÃ³n' },
          ],
        },
      ],
      evaluacion_semanal: [{ semana: 1, indicadores: ['ComprensiÃ³n conceptual', 'AplicaciÃ³n prÃ¡ctica'], instrumento: 'Ticket de salida + Quiz semanal' }],
    },
  };
}
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Main executor â€” route to appropriate mock generator
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function generateMockOutput(context: PromptContext): unknown {
  const { motorType, params } = context;

  switch (motorType) {
    case 'alpha2':    return mockAlpha2Output(params);
    case 'synthesis': return mockSynthesisOutput(params);
    case 'abp':       return mockABPOutput(params);
    case 'assessment':return mockAssessmentOutput(params);
    case 'plan':       return mockPlanOutput(params);
    case 'slides':     return mockSlidesOutput(params);
    case 'ficha':       return mockFichaOutput(params);
    case 'quiz':        return mockQuizOutput(params);
    case 'tutor':       return mockTutorOutput(params);
    case 'pdc':         return mockPDCOutput(params);
    case 'recalibrate': return mockRecalibrateOutput(params);
    case 'micro':       return mockMicroOutput(params);
    default:           return {};
  }
}

/**
 * Full execution pipeline for a motor phase.
 * 1. Try MiniMax M2.7 if API key available
 * 2. Fall back to structured mock
 */
export async function executePrompt(
  context: PromptContext,
  mode: PromptMode,
): Promise<PromptResult> {
  if (mode === 'SKIP') {
    return { mode: 'SKIP', structuredOutput: {} };
  }

  if (mode === 'MOCK') {
    try {
      const output = generateMockOutput(context);
      return { mode: 'MOCK', structuredOutput: output };
    } catch (err) {
      return { mode: 'MOCK', error: String(err), structuredOutput: {} };
    }
  }

  if (mode === 'FULL_AI') {
    try {
      const { motorType, params, accumulated: _accumulated } = context;

      // Normalize params
      const normalizedParams = { ...params };
      if (motorType === 'synthesis' || motorType === 'alpha2') {
        if (normalizedParams.unidad && !normalizedParams.unidad_real) {
          normalizedParams.unidad_real = normalizedParams.unidad;
        }
        if (typeof normalizedParams.temas === 'string') {
          normalizedParams.temas = (normalizedParams.temas as string)
            .split(/[,\n]/).map((t: string) => t.trim()).filter(Boolean);
        }
      }

      // callMinimax with motorType routes to backend /motores/{type}
      // Backend loads prompt from disk and calls MiniMax internally.
      const result = await callMinimax('', '', {
        motorType: motorType as 'synthesis' | 'alpha2' | 'abp' | 'assessment' | 'plan' | 'slides' | 'ficha' | 'quiz' | 'tutor' | 'pdc' | 'recalibrate' | 'micro',
        params: normalizedParams,
      });

      if (!result.ok) {
        console.warn('MiniMax API failed:', result.error, 'â€” falling back to MOCK');
        return {
          mode: 'FULL_AI',
          error: result.error,
          simulated: true,
          structuredOutput: generateMockOutput(context),
        };
      }

      // Parse JSON response
      try {
        const parsed = JSON.parse(result.text);
        return { mode: 'FULL_AI', rawOutput: result.text, simulated: result.simulated, structuredOutput: parsed };
      } catch {
        return {
          mode: 'FULL_AI',
          error: 'Failed to parse AI response as JSON',
          rawOutput: result.text,
          simulated: true,
          structuredOutput: generateMockOutput(context),
        };
      }
    } catch (err) {
      return {
        mode: 'FULL_AI',
        error: String(err),
        simulated: true,
        structuredOutput: generateMockOutput(context),
      };
    }
  }

  return { mode: 'SKIP', structuredOutput: {} };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Streaming variant â€” wraps executePrompt
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Streaming variant: calls backend and invokes onChunk with result.
 * NOTE: Backend does not support true SSE yet â€” this delivers
 * the full response as a single onChunk call.
 */
export async function executePromptStreaming(
  context: PromptContext,
  mode: PromptMode,
  onChunk: (text: string) => void,
): Promise<PromptResult> {
  const result = await executePrompt(context, mode);
  if (result.structuredOutput) {
    onChunk(JSON.stringify(result.structuredOutput));
  }
  return result;
}
