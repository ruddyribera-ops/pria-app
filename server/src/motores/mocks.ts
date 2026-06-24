/**
 * mocks.ts — Server-side mock output generators for all 12 PRIA motors.
 * =========================================================================
 * Each function returns a Record<string, unknown> matching the Zod schema
 * for that motor type. Used as fallback when MiniMax API is unavailable.
 *
 * Adapted from src/lib/pptx/promptRunner.ts — stripped of Vite/React deps.
 */

// ── Motor type union (mirrors MotorType from useMotorGeneration) ──
export type MotorType =
  | 'alpha2' | 'synthesis' | 'abp' | 'assessment'
  | 'plan' | 'slides' | 'ficha' | 'quiz'
  | 'tutor' | 'pdc' | 'recalibrate' | 'micro'
  | 'source_narrator';

// ────────────────────────────────────────────────────────────
// Individual mock generators
// ────────────────────────────────────────────────────────────

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
    'Poblamiento de América',
    'Caza y pesca en la prehistoria',
    'Agricultura y domesticación',
    'Primeras aldeas',
    'Cerámica y textilería',
  ];

  const defaultContenido: Record<string, string> = {
    'Origen del ser humano': 'Los primeros seres humanos aparecieron en África hace aproximadamente 2 millones de años. Eran nómadas que se desplazaban en busca de alimentos y refugio. Utilizaban herramientas de piedra y vivían en pequeños grupos familiares.',
    'Poblamiento de América': 'Los primeros pobladores de América llegaron desde Asia a través del estrecho de Bering durante la última glaciación, hace aproximadamente 15,000 años. Eran cazadores-recolectores que siguieron a los grandes animales.',
    'Caza y pesca en la prehistoria': 'La caza y la pesca eran las principales actividades de subsistencia. Los hombres cazaban grandes animales como mamuts y bisontes, mientras las mujeres recolectaban frutos y raíces.',
    'Agricultura y domesticación': 'El descubrimiento de la agricultura hace unos 10,000 años transformó la vida humana. Los pueblos aprendieron a cultivar plantas como el maíz, la papa y el trigo, y a domesticar animales como la llama y el perro.',
    'Primeras aldeas': 'Con la agricultura, los grupos humanos se volvieron sedentarios. Construyeron las primeras aldeas cerca de ríos y valles fértiles. Desarrollaron la cerámica para almacenar alimentos y agua.',
    'Cerámica y textilería': 'La cerámica permitió cocinar y almacenar alimentos. Los pueblos prehispánicos desarrollaron técnicas avanzadas de textilería usando algodón y lana de camélidos.',
  };

  const defaultPaginas: Record<string, string> = {
    'Origen del ser humano': 'pp. 22-29',
    'Poblamiento de América': 'pp. 30-37',
    'Caza y pesca en la prehistoria': 'pp. 38-43',
    'Agricultura y domesticación': 'pp. 44-51',
    'Primeras aldeas': 'pp. 52-58',
    'Cerámica y textilería': 'pp. 59-65',
  };

  const temas = temasEntrada.length > 0 ? temasEntrada : defaultTemas;
  const contenido_temas: Record<string, string> = {};
  const paginas_temas: Record<string, string> = {};
  temas.forEach((tema, i) => {
    contenido_temas[tema] = defaultContenido[tema] || ('Contenido de ' + tema + ' — al menos 10 caracteres de texto simulado para validación del schema.');
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
      ['Lingüística', 'Lógico-matemática'],
      ['Visual-espacial', 'Kinestésica'],
      ['Musical', 'Interpersonal'],
      ['Naturalista', 'Intrapersonal'],
    ][i % 4];

    return {
      nombre: tema,
      conceptos_clave: [
        'Concepto fundamental de ' + tema,
        'Aplicación práctica de ' + tema,
        'Conexión de ' + tema + ' con la vida cotidiana',
      ],
      inteligencias_sugeridas: inteligencias,
      actividades: [
        { tipo: 'Investigativa', inteligencia: inteligencias[0] },
        { tipo: 'Colaborativa', inteligencia: inteligencias[1] },
      ],
    };
  });

  let notasDocente = 'DUA: Usar múltiples formas de representación. ';
  if (diagnosticos.toLowerCase().includes('tdah')) {
    notasDocente += 'Para TDAH: pausas activas cada 15 min, trabajo en bursts de 10 min. ';
  }
  if (diagnosticos.toLowerCase().includes('tea')) {
    notasDocente += 'Para TEA: anticipar la rutina, agenda visual al inicio, estructura clara. ';
  }
  if (diagnosticos.toLowerCase().includes('dislexia')) {
    notasDocente += 'Para Dislexia: aceptar respuestas orales, no penalizar ortografía. ';
  }
  if (!diagnosticos || diagnosticos === 'No especificado') {
    notasDocente += 'Estrategias universales aplicadas para aula heterogénea.';
  }

  return {
    unidad_sintetizada: {
      titulo: unidad_real,
      enfoque_didactico: 'ABP con neuroinclusión',
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
      pregunta_generadora: '¿Cómo podemos investigar y compartir nuestro aprendizaje sobre ' + titulo + ' de forma creativa?',
      fases: [
        {
          nombre: 'Fase 1: Investigación',
          duracion: '1 semana',
          actividades: ['Formar equipos de investigación', 'Buscar información en recursos digitales', 'Crear un mapa conceptual colaborativo'],
          adaptaciones: [{ diagnostico: 'TDAH', adaptacion: 'Trabajo en bursts de 15 min con pausas activas' }],
        },
        {
          nombre: 'Fase 2: Creación',
          duracion: '2 semanas',
          actividades: ['Diseñar el producto final', 'Trabajar en equipos para construir el producto', 'Revisión entre pares y mejoras'],
          adaptaciones: [{ diagnostico: 'TEA', adaptacion: 'Estructura clara con agenda visual diaria' }],
        },
        {
          nombre: 'Fase 3: Presentación',
          duracion: '1 semana',
          actividades: ['Preparar presentación oral', 'Exponer al resto de la clase', 'Reflexión escrita sobre lo aprendido'],
          adaptaciones: [],
        },
      ],
      productos: ['Producto visual (cartel o presentación)', 'Presentación oral', 'Auto-evaluación escrita'],
      adaptaciones_inclusivas: [
        { diagnostico: 'TDAH', adaptacion: 'Pausas activas cada 15 min, metas cortas, checklist visual' },
        { diagnostico: 'TEA', adaptacion: 'Agenda visual, anticipación de cambios, instrucciones claras' },
        { diagnostico: 'DISLEXIA', adaptacion: 'Aceptar formatos orales y visuales, no penalizar ortografía' },
      ],
      evaluacion: {
        criterios: ['Comprensión del tema', 'Creatividad del producto', 'Trabajo en equipo', 'Expresión oral'],
        instrumentos: ['Rúbrica de evaluación', 'Auto-evaluación', 'Coevaluación entre pares'],
      },
    },
  };
}

/** Assessment (M0c): rúbrica + autoevaluación + coevaluación */
export function mockAssessmentOutput(params: Record<string, unknown>): Record<string, unknown> {
  const proyecto = (params.proyecto_pbl as string) || (params.unidad as string) || 'Proyecto';
  return {
    evaluacion: {
      proyecto,
      rubrica: {
        criterios: [
          { nombre: 'Contenido', peso: '30%', niveles: { excelente: 'Demuestra comprensión profunda del tema con ejemplos propios', suficiente: 'Comprende el tema y puede explicarlo correctamente', en_desarrollo: 'Comprende parcialmente, necesita apoyo para explicar', inicial: 'No demuestra comprensión del tema' } },
          { nombre: 'Creatividad', peso: '25%', niveles: { excelente: 'Producto original, innovador y bien elaborado', suficiente: 'Producto creativo con buenos acabados', en_desarrollo: 'Producto básico con poco esfuerzo creativo', inicial: 'Producto incompleto o copiado' } },
          { nombre: 'Trabajo en equipo', peso: '25%', niveles: { excelente: 'Lidera, colabora y resuelve conflictos', suficiente: 'Colabora activamente y cumple su rol', en_desarrollo: 'Participa pero necesita recordatorios', inicial: 'No colabora o dificulta el trabajo grupal' } },
          { nombre: 'Expresión oral', peso: '20%', niveles: { excelente: 'Expone con claridad, seguridad y responde preguntas', suficiente: 'Expone el contenido correctamente', en_desarrollo: 'Expone con dificultad, necesita apoyo', inicial: 'No logra exponer sus ideas' } },
        ],
      },
      autoevaluacion: {
        preguntas: [
          { pregunta: '¿Completé todas las tareas asignadas?', tipo: 'si_no' },
          { pregunta: '¿Investigué por mi cuenta para aprender más?', tipo: 'si_no' },
          { pregunta: '¿Entregué mi trabajo a tiempo?', tipo: 'si_no' },
          { pregunta: '¿Ayudé a mis compañeros cuando lo necesitaron?', tipo: 'si_no' },
        ],
        reflexion: ['Mi mayor logro fue...', 'Algo que puedo mejorar es...', 'La próxima vez haría diferente...'],
      },
      coevaluacion: {
        preguntas: [
          { pregunta: '¿Mi compañero aportó ideas al equipo?', tipo: 'escala_1_4' },
          { pregunta: '¿Cumplió con su parte del trabajo?', tipo: 'escala_1_4' },
          { pregunta: '¿Escuchó y respetó las ideas de otros?', tipo: 'escala_1_4' },
        ],
      },
      adaptaciones: [
        { diagnostico: 'TDAH', adaptacion: 'Tiempo extra, dividir tareas, checklist visual de pasos' },
        { diagnostico: 'TEA', adaptacion: 'Rúbrica visual con imágenes, anticipar criterios, instrucciones concretas' },
        { diagnostico: 'DISLEXIA', adaptacion: 'Aceptar respuestas orales/grabadas, no penalizar ortografía' },
      ],
    },
  };
}

/** Plan de clase (M1a): secuencia didáctica 45 min */
export function mockPlanOutput(params: Record<string, unknown>): Record<string, unknown> {
  const tema_clase = (params.tema_clase as string) || (params.tema as string) || 'el tema';
  const conceptos_clave = (params.conceptos_clave as string) || tema_clase;
  const diagnosticos = (params.diagnosticos as string) || '';
  const inteligencias = (params.inteligencias_sugeridas as string) || 'Lingüística, Lógico-matemática, Kinestésica';
  const inteligenciaList = inteligencias.split(',').map(s => s.trim()).filter(Boolean);

  const inteligencias_multiples = inteligenciaList.map(int => ({
    inteligencia: int,
    actividad: 'Actividad para desarrollar la inteligencia ' + int + ' mediante ' + tema_clase,
  }));

  const tabla_adaptaciones: { diagnostico: string; adaptacion: string }[] = [];
  if (diagnosticos.toLowerCase().includes('tdah')) tabla_adaptaciones.push({ diagnostico: 'TDAH', adaptacion: 'Pausas activas cada 15 min, trabajo en bursts de 10 min' });
  if (diagnosticos.toLowerCase().includes('tea')) tabla_adaptaciones.push({ diagnostico: 'TEA', adaptacion: 'Agenda visual, anticipación de cambios, estructura clara' });
  if (diagnosticos.toLowerCase().includes('dislexia')) tabla_adaptaciones.push({ diagnostico: 'DISLEXIA', adaptacion: 'Instrucciones orales + escritas, no penalizar ortografía' });

  return {
    mapa_cognitivo: {
      verbos_bloom: ['Recordar', 'Comprender', 'Aplicar'],
      nivel_taxonomia: 'básico-intermedio',
      enfoque_sensorial: 'visual-y-kinestésico',
    },
    inteligencias_multiples,
    secuencia_didactica: {
      bloques: [
        { nombre: 'Inicio', duracion: 10, objetivo: 'Activar conocimientos previos', actividad: 'Activación mediante pregunta generadora sobre ' + tema_clase + '. Presentación del objetivo.', nota: 'Usar material visual.' },
        { nombre: 'Desarrollo', duracion: 25, objetivo: 'Introducir y practicar ' + conceptos_clave, actividad: 'Explicación con apoyo visual. Ejercicios guiados. Trabajo en parejas.', nota: 'Pausa kinestésica a los 15 min.' },
        { nombre: 'Cierre', duracion: 10, objetivo: 'Aplicar y consolidar', actividad: 'Resumen colaborativo de ' + tema_clase + '. Preguntas de metacognición.', nota: 'Movimiento activo breve.' },
      ],
    },
    dua_neuroinclusion: ['Múltiples formas de representación', 'Múltiples formas de acción y expresión', 'Múltiples formas de implicación'],
    tabla_adaptaciones_clase: tabla_adaptaciones,
    perfil_aula_resumido: diagnosticos && diagnosticos !== 'No especificado' ? 'Aula diversa con ' + diagnosticos : 'Aula heterogénea sin diagnósticos específicos',
    recursos_necesarios: ['Pizarra y marcadores', 'Libro de texto', 'Fichas de trabajo', 'Proyector (opcional)'],
  };
}

/** Slides (M1b): 10 slides para presentación */
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
        return { numero: num, tipo: 'objetivos', titulo: 'Objetivos', texto_pantalla: keywords.map(k => '- Comprender ' + k).join('\n'), guion_docente: 'Leer cada objetivo y verificar comprensión.', prompt_imagen: 'Illustration children goals targets educational style warm palette', callout: '¿Preguntas sobre los objetivos?' };
      case 'pausa':
        return { numero: num, tipo: 'pausa', titulo: '¡Movimiento!', texto_pantalla: 'Levántate y estiramos 2 minutos', guion_docente: 'Dirigir actividad física breve.', prompt_imagen: 'Illustration children stretching moving classroom warm palette', callout: '¡Buen trabajo! Volvamos a aprender.' };
      case 'cierre':
        return { numero: num, tipo: 'cierre', titulo: 'Resumen Final', texto_pantalla: 'Hoy aprendimos:\n' + keywords.map((k, idx) => (idx + 1) + '. ' + k).join('\n'), guion_docente: 'Resumen colaborativo. Preguntas finales.', prompt_imagen: 'Illustration happy children celebrating learning warm palette', callout: '¡Misión cumplida!' };
      default:
        return { numero: num, tipo: 'concepto', titulo: kw, texto_pantalla: 'Explicación detallada de ' + kw, guion_docente: 'Explicar ' + kw + '. Dar ejemplos. Preguntar comprensión.', prompt_imagen: 'Flat illustration child learning ' + kw + ' warm palette' };
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
  if (diagnosticos.toLowerCase().includes('tdah')) adaptaciones.push({ mision: 'Oraculo', diagnostico: 'TDAH', ajuste: '10 preguntas máximo, pausas cada 5' });
  if (diagnosticos.toLowerCase().includes('tea')) adaptaciones.push({ mision: 'Lienzo', diagnostico: 'TEA', ajuste: 'Modelo dado, menos detalles requeridos' });

  return {
    ficha_trabajo: {
      titulo_gancho: 'Misión: Guardianes de ' + (conceptos[0] || 'la Clase'),
      historia_gancho: 'El Reino de las Palabras necesita nuevos guardias. Para ser uno, debes completar 5 misiones secretas usando tus conocimientos de ' + (conceptos[0] || 'la clase') + '. ¿Aceptas el reto?',
      misiones: {
        oraculo: conceptos.map(c => ({ pregunta: '¿Cuál es el concepto principal de ' + c + '?', opciones: ['A) Opción A', 'B) Opción B', 'C) Opción C', 'D) Opción D'], respuesta_correcta: 'B' })),
        puente: conceptos.map(c => ({ palabra: c, significado: 'Definición de ' + c + ' en el contexto de la clase' })),
        sopa: conceptos.map(c => c.toUpperCase().slice(0, 4)),
        pergamino: { frase_con_espacios: 'Los estudiantes aplican ___ en situaciones prácticas.', palabras_secretas: conceptos.slice(0, 2) },
        lienzo: 'Dibuja un personaje que aplique "' + (conceptos[0] || 'el concepto') + '" en su vida diaria.',
      },
      adaptaciones_por_mision: adaptaciones.length > 0 ? adaptaciones : undefined,
    },
  };
}

/** Quiz (M2a): pop quiz rápido */
export function mockQuizOutput(params: Record<string, unknown>): Record<string, unknown> {
  const palabras_clave = (params.palabras_clave as string) || 'el tema';
  return {
    quiz: {
      titulo: 'Pop Quiz: ' + palabras_clave,
      instrucciones: 'Responde de la forma que prefieras.',
      preguntas: [
        { numero: 1, tipo: 'escrita' as const, pregunta: 'Define con tus palabras: ' + palabras_clave, opciones: ['a', 'b', 'c', 'd'], respuesta: 'b' },
        { numero: 2, tipo: 'oral' as const, pregunta: 'Explica brevemente por qué es importante ' + palabras_clave, respuesta: 'Es importante porque permite comprender mejor el tema.' },
        { numero: 3, tipo: 'visual' as const, pregunta: 'Dibuja o describe un ejemplo de ' + palabras_clave },
        { numero: 4, tipo: 'desafio' as const, pregunta: 'Crea una pregunta sobre ' + palabras_clave + ' para tu compañero' },
      ],
      clave_respuestas: [
        { pregunta: 1, respuesta: 'b', explicacion: 'Definición correcta del concepto.' },
        { pregunta: 2, respuesta: 'Respuesta libre', explicacion: 'Evalúa comprensión personal.' },
      ],
      adaptaciones: [
        { diagnostico: 'TDAH', adaptacion: 'Reducir a 3 preguntas, dar más tiempo' },
        { diagnostico: 'DISLEXIA', adaptacion: 'Leer preguntas en voz alta, aceptar respuestas orales' },
      ],
    },
  };
}

/** Tutor (M2b): panel de control docente */
export function mockTutorOutput(params: Record<string, unknown>): Record<string, unknown> {
  const tema = (params.tema_clase as string) || 'el tema';
  const diagnosticos = (params.diagnosticos as string) || '';
  const adaptaciones_rapidas: { diagnostico: string; senial: string; intervencion: string }[] = [];
  if (diagnosticos.toLowerCase().includes('tdah')) {
    adaptaciones_rapidas.push({ diagnostico: 'TDAH', senial: 'Inquietud motora', intervencion: 'Pausa activa de 2 min' });
  }
  if (diagnosticos.toLowerCase().includes('tea')) {
    adaptaciones_rapidas.push({ diagnostico: 'TEA', senial: 'Ansiedad ante cambio', intervencion: 'Mostrar agenda visual y anticipar' });
  }
  if (diagnosticos.toLowerCase().includes('dislexia')) {
    adaptaciones_rapidas.push({ diagnostico: 'DISLEXIA', senial: 'Evita leer en voz alta', intervencion: 'Aceptar respuesta oral o dibujada' });
  }
  return {
    panel_tutor: {
      resumen_clase: 'Clase sobre ' + tema,
      puntos_clave: ['Concepto 1: Fundamentos', 'Concepto 2: Aplicación', 'Concepto 3: Conexiones'],
      momentos_criticos: [
        { momento: 'Transición inicio-desarrollo', accion: 'Verificar comprensión', senial: 'Estudiantes distraídos' },
        { momento: 'Mitad del desarrollo', accion: 'Pausa activa de 2 min', senial: 'Inquietud motora general' },
      ],
      checklist_pre_clase: ['Material impreso', 'Proyector listo', 'Fichas de trabajo', 'Marcadores'],
      adaptaciones_rapidas: adaptaciones_rapidas.length > 0 ? adaptaciones_rapidas : undefined,
      preguntas_frecuentes: [
        { pregunta: '¿Qué hago si un estudiante no entiende?', respuesta_breve: 'Reformular con ejemplo concreto y verificar' },
        { pregunta: '¿Cómo manejar el ritmo de la clase?', respuesta_breve: 'Tener actividad de extensión y de refuerzo listas' },
      ],
    },
  };
}

/** PDC Trimestral: planificación curricular trimestral */
export function mockPDCOutput(params: Record<string, unknown>): Record<string, unknown> {
  const m = (params.materia as string) || 'Ciencias Sociales';
  const nivel = (params.nivel as string) || 'Secundaria';
  const grado = (params.grado as string) || '3er año';
  return {
    pdc: {
      encabezado: { nivel, grado, materia: m, trimestre: 1, ano_escolar: 2026 },
      unidades: [{
        numero: 1,
        titulo: 'Fundamentos de ' + m,
        semanas: '1-4',
        horas: 15,
        objetivo_holistico: 'Desarrollar comprensión de ' + m + ' (Ser, Saber, Hacer, Decidir)',
        contenidos: { ser: ['Responsabilidad', 'Colaboración'], saber: ['Conceptos fundamentales de ' + m], hacer: ['Ejercicios prácticos', 'Proyectos grupales'], decidir: ['Selección de estrategias', 'Evaluación de resultados'] },
        metodologia_dua: ['Múltiples formas de representación', 'Múltiples formas de expresión'],
        evaluacion: { formativa: 'Autoevaluación', sumativa: 'Proyecto final' },
      }],
      observaciones: { adaptaciones: ['Adaptaciones DUA según diagnóstico del aula'], notas_docente: 'Revisar diagnóstico del aula antes de aplicar' },
    },
  };
}

/** Recalibrate: recalibración pedagógica post-evaluación */
export function mockRecalibrateOutput(params: Record<string, unknown>): Record<string, unknown> {
  const diagnosticos = (params.diagnosticos as string) || '';
  const adaptaciones_refinadas: { diagnostico: string; ajuste: string }[] = [];
  if (diagnosticos.toLowerCase().includes('tdah')) {
    adaptaciones_refinadas.push({ diagnostico: 'TDAH', ajuste: 'Checklist visual de pasos + pausas programadas cada 12 min' });
  }
  if (diagnosticos.toLowerCase().includes('tea')) {
    adaptaciones_refinadas.push({ diagnostico: 'TEA', ajuste: 'Agenda visual con pictogramas + anticipación de transiciones' });
  }
  return {
    recalibracion: {
      diagnostico_general: 'Resultados satisfactorios. 70% alcanzó nivel suficiente o superior.',
      fortalezas: ['Participación activa', 'Trabajo en equipo', 'Compromiso con las tareas'],
      areas_mejora: ['Expresión oral', 'Uso de vocabulario técnico', 'Profundidad en análisis'],
      ajustes_sugeridos: [
        { area: 'Expresión oral', accion: 'Incluir más presentaciones cortas semanales', impacto_esperado: 'Mejorar fluidez en 20%' },
        { area: 'Vocabulario técnico', accion: 'Glosario visual semanal', impacto_esperado: 'Incorporar 5-10 términos por unidad' },
      ],
      recomendaciones_proximo_trimestre: ['Aumentar práctica oral', 'Incorporar glosario visual', 'Añadir rúbricas de autoevaluación'],
      adaptaciones_refinadas: adaptaciones_refinadas.length > 0 ? adaptaciones_refinadas : undefined,
    },
  };
}

/** Micro: micro-objetivos diarios */
export function mockMicroOutput(params: Record<string, unknown>): Record<string, unknown> {
  const unidad = (params.unidad_real as string) || (params.unidad as string) || 'Unidad';
  const temasRaw = params.temas;
  const temas: string[] = Array.isArray(temasRaw)
    ? temasRaw as string[]
    : typeof temasRaw === 'string'
      ? (temasRaw as string).split(/[,\n]/).map(t => t.trim()).filter(Boolean)
      : ['Tema 1'];
  const semanas_trimestre = (params.semanas_trimestre as number) || 4;

  const semanas = temas.slice(0, semanas_trimestre).map((tema, i) => ({
    semana: i + 1,
    tema,
    objetivos_diarios: [
      { dia: 1, objetivo: `Identificar conceptos clave de ${tema}`, criterio_logro: 'Nombra 3 conceptos correctamente', actividad_clave: 'Lluvia de ideas guiada' },
      { dia: 2, objetivo: `Comprender relaciones entre conceptos de ${tema}`, criterio_logro: 'Explica conexiones con ejemplos', actividad_clave: 'Mapa conceptual en parejas' },
      { dia: 3, objetivo: `Aplicar ${tema} en ejercicios prácticos`, criterio_logro: 'Resuelve 3 de 4 ejercicios', actividad_clave: 'Ficha de trabajo individual' },
      { dia: 4, objetivo: `Analizar casos prácticos de ${tema}`, criterio_logro: 'Identifica patrones en 2 casos', actividad_clave: 'Análisis grupal de casos' },
      { dia: 5, objetivo: `Evaluar comprensión de ${tema}`, criterio_logro: 'Responde correctamente 70% del quiz', actividad_clave: 'Quiz rápido + reflexión' },
    ],
  }));

  return {
    micro_objetivos: {
      unidad,
      semanas,
      evaluacion_semanal: semanas.map((s, i) => ({
        semana: i + 1,
        indicadores: ['Comprensión conceptual', 'Aplicación práctica'],
        instrumento: 'Ticket de salida + Quiz semanal',
      })),
    },
  };
}

/** Source Narrator (M0.5): narrativa cultural y contextualización */
export function mockSourceNarratorOutput(params: Record<string, unknown>): Record<string, unknown> {
  const tema_clase = (params.tema_clase as string) || 'Tema de ejemplo';

  return {
    narrative_summary: `La presente narrativa contextualiza ${tema_clase} dentro del panorama cultural boliviano, estableciendo conexiones entre los contenidos temáticos y las tradiciones, prácticas y saberes ancestrales del contexto local andino. A través de un recorrido que integra elementos históricos, simbólicos y didácticos, se busca que el estudiante relacione los conceptos académicos con su entorno cultural vivo, promoviendo una aprendizaje significativo y culturalmente pertinente. La narrativa incorpora elementos de la cosmovisión andina, prácticas ceremoniales y expresiones artísticas tradicionales que iluminan la relevancia contempor\u00e1nea de ${tema_clase}.`,
    characters: [
      {
        name: 'T\u00eda Mam\u00e1 Elena',
        role: 'Narradora ancestral / sabia de la comunidad',
        description: 'Persona mayor de la comunidad aymara que transmite conocimientos a trav\u00e9s de la oralidad. Representa la memoria colectiva y la sabidur\u00eda ancestral.',
        key_quote: 'Todo lo que sabemos viene de la pachamama y a ella debemos volver.'
      },
      {
        name: 'Marcelo',
        role: 'Estudiante好奇 de secundaria',
        description: 'Joven estudiante que representa la curiosidad juvenil y el dilema de conectar el aprendizaje escolar con su identidad cultural.',
        key_quote: '\u00bfPero se\u00f1orita, eso de los rituales andinos tiene que ver con lo que estudiamos?'
      },
      {
        name: 'Don Hilaria',
        role: 'Agricultor y danzante del Tinku',
        description: 'Agricultor de la comunidad que participa en las danzas tradicionales durante las festividades patronales. Transmite el significado de los rituales a trav\u00e9s de su pr\u00e1ctica.',
        key_quote: 'El Tinku no es solo baile, es el encuentro de los suyos con la tierra.'
      }
    ],
    sequence: [
      { order: 1, event: 'Inicio: La pregunta de Marcelo en el aula', significance: 'Establece el conflicto cognitivo inicial y conecta el tema acad\u00e9mico con la vida cotidiana del estudiante.' },
      { order: 2, event: 'La narraci\u00f3n de T\u00eda Mam\u00e1 Elena sobre el Guede y la Anata', significance: 'Introduce la cosmovisi\u00f3n andina y establece el marco cultural desde el cual se puede comprender el tema.' },
      { order: 3, event: 'Don Hilaria explica el Phujllay y su relaci\u00f3n con los ciclos agr\u00edcolas', significance: 'Conecta los conceptos acad\u00e9micos con las pr\u00e1cticas agr\u00edcolas reales y los ritmos de la naturaleza.' },
      { order: 4, event: 'Reflexi\u00f3n colectiva sobre el Tinku y la comunidad', significance: 'Desarrolla la dimensi\u00f3n social y comunitaria del conocimiento, mostrando c\u00f3mo los rituales unen a las personas.' },
      { order: 5, event: 'Cierre: Marcelo relaciona el tema con su experiencia familiar', significance: 'Demuestra la transferencia del aprendizaje y la validez de los saberes culturales dentro del curr\u00edculo.'
      }
    ],
    examples: [
      {
        type: 'cultural',
        content: 'El Guede es una festividad ancestral de la cultura aymara que honra a los difuntos y celebra la continuidad de la vida. Se realiza entre noviembre y diciembre y combina elementos cat\u00f3licos con tradiciones andinas precolombinas.',
        source_quote: 'Costumbres de Bolivia, Ministerio de Culturas, 2024'
      },
      {
        type: 'historical',
        content: 'El Tinku es una danza ceremonial originaria de los Andes bolivianos que se practica principalmente en la область de los ayllus. Esta danza representa el encuentro ritual entre comunidades y la renovaci\u00f3n de los v\u00ednculos sociales.',
        source_quote: 'Rituales Andinos de Bolivia, UNESCO Intangible Heritage, 2014'
      },
      {
        type: 'mythological',
        content: 'Seg\u00fan la tradici\u00f3n oral aymara, el Phujllay fue ense\u00f1ado a los humanos por los Achachilas (monta\u00f1as sagradas) como forma de agradecer a la tierra por los frutos obtenidos en la cosecha.',
        source_quote: 'Tradici\u00f3n oral, comunidad de Curva, Oruro'
      },
      {
        type: 'anecdotal',
        content: 'En la comunidad de Poop\u00f3, Oruro, los estudiantes de secundario participararon en un proyecto escolar donde documentaron las danzas locales y las relacionaron con sus contenidos de Historia y Ciencias Sociales.',
        source_quote: 'Experiencia educativa, U.E. Poop\u00f3, 2023'
      },
      {
        type: 'scientific',
        content: 'Los ciclos agr\u00edcolas andinos, basados en el calendario lunar y las estaciones, demuestran un conocimiento sofisticado de agronom\u00eda que ha sido validado por la ciencia moderna sobre sostenible y respetuoso con el medio ambiente.',
        source_quote: 'Estudios agron\u00f3micos, Universidad Mayor de San Andr\u00e9s, 2022'
      }
    ],
    cultural_anchors: [
      { term: 'Pachamama', definition: 'Madre Tierra en la cosmovisi\u00f3n andina. Represents the earth as a living, sacred entity that provides sustenance and receives offerings.', context: 'Used in agricultural rituals and daily expressions of gratitude in Andean cultures.' },
      { term: 'Tinku', definition: 'Danza ceremonial andina de encuentro entre comunidades, practicada principalmente en Oruro y Potos\u00ed. Combina elementos simb\u00f3licos de conflicto y reconciliaci\u00f3n.', context: 'Se realiza en festividades patronales y representa la renovaci\u00f3n de los lazos comunitarios.' },
      { term: 'Phujllay', definition: 'Danza tradicional de la region andina de Bolivia, asociada con la cosecha y la celebraci\u00f3n agr\u00edcola. Los danzantes visten disfraces coloridos con m\u00e1scaras y feathers.', context: 'Originaria de la zona de los valles interandinos, se baila durante las festividades de mayo a agosto.' },
      { term: 'Achachila', definition: 'Monta\u00f1as sagradas protectoras en la cosmovisi\u00f3n aymara. Cada comunidad tiene sus propios Achachilas que la protegen y definen su identidad territorial.', context: 'Son objeto de veneraci\u00f3n y ofrendas, especialmente en rituales de paso y festividades.' },
      { term: 'Anata', definition: 'Carnaval andino que combina tradiciones precolombinas con celebraciones cat\u00f3licas. Es una fiesta de revelac\u00f3n,renewal and community gathering.', context: 'Se celebra en febrero o marzo dependiendo de la regi\u00f3n, con danzas, m\u00fasica y rituales de limpieza espiritual.' },
      { term: 'Guede', definition: 'Festividad que honra a los difuntos y celebra la vida. Tiene ra\u00edces tanto andinas como cat\u00f3licas, mezclando rituales de muerte y renewa.', context: 'Se celebra en noviembre con visitas a cementerios, ofrendas de comida y m\u00fasica tradicional.' }
    ],
    vivid_details: [
      'El sonido de las quenas y charangos se mezcla con el murmullo de los participantes mientras la comunidad se prepara para el Phujllay al amanecer.',
      'Las mujeres de la comunidad visten polleras multicolores y portan llikllas bordados con motivos geom\u00e9tricos que cuentan historias ancestrales.',
      'El aroma del mistela (chicha de ma\u00edz) y el humo del copal llenan el aire durante los rituales en la plaza principal.',
      'Los danzantes del Tinku usan m\u00e1scaras de madera tallada con expresiones severas, representando los esp\u00edritus de la monta\u00f1a.',
      'En la comunidad aymara, la tierra se trabaja en comunidad bajo el sistema de ayni, donde todos se ayudan mutuamente en las labores agr\u00edcolas.',
      'Los ni\u00f1os aprenden las danzas tradicionales desde muy peque\u00f1os, observando a sus mayores y practicando en las noches de luna llena.',
      'El mercado dominical de Challapata es un punto de encuentro donde se mezclan los productos de la zona alta y los valles, igual que las tradiciones.',
      'Las caravanas de llamas cruzan los senderos ancestrales que conectan las comunidades de la cordillera, igual que hace siglos.'
    ]
  };
}

// ────────────────────────────────────────────────────────────
// Dispatcher
// ────────────────────────────────────────────────────────────

/**
 * Generate mock output for any motor type.
 * Returns a Record<string, unknown> (or array for slides) matching the Zod schema.
 */
export function generateMockOutput(
  motorType: MotorType,
  params: Record<string, unknown>,
): unknown {
  switch (motorType) {
    case 'alpha2': return mockAlpha2Output(params);
    case 'synthesis': return mockSynthesisOutput(params);
    case 'abp': return mockABPOutput(params);
    case 'assessment': return mockAssessmentOutput(params);
    case 'plan': return mockPlanOutput(params);
    case 'slides': return mockSlidesOutput(params);
    case 'ficha': return mockFichaOutput(params);
    case 'quiz': return mockQuizOutput(params);
    case 'tutor': return mockTutorOutput(params);
    case 'pdc': return mockPDCOutput(params);
    case 'recalibrate': return mockRecalibrateOutput(params);
    case 'micro': return mockMicroOutput(params);
    case 'source_narrator': return mockSourceNarratorOutput(params);
    default: return {};
  }
}
