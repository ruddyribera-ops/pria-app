import { describe, test, expect } from 'vitest';
import { validateSynthesis } from '../synthesis.schema';
import { validateABP } from '../abp.schema';
import { validateAssessment } from '../assessment.schema';
import { validatePlan } from '../plan.schema';
import { validateFicha } from '../ficha.schema';
import { validateQuiz } from '../quiz.schema';
import { validateTutor } from '../tutor.schema';
import { validatePDC } from '../pdc.schema';
import { validateRecalibrate } from '../recalibrate.schema';
import { validateMicro } from '../micro.schema';
import { validateAlpha2 } from '../alpha2.schema';

// ---------------------------------------------------------------------------
// SynthesisSchema
// ---------------------------------------------------------------------------
describe('SynthesisSchema', () => {
  const validData = {
    unidad_sintetizada: {
      titulo: 'Los primeros habitantes',
      enfoque_didactico: 'Enfoque basado en proyectos',
      temas_desarrollados: [
        {
          nombre: 'Tema 1',
          conceptos_clave: ['concepto1', 'concepto2'],
          inteligencias_sugeridas: ['lingüística', 'lógico-matemática'],
          actividades: [
            { tipo: 'lectura', inteligencia: 'lingüística' },
            { tipo: 'ejercicio', inteligencia: 'lógico-matemática' },
          ],
        },
      ],
      notas_docente: 'Nota opcional',
    },
  };

  test('valid synthesis output passes', () => {
    expect(() => validateSynthesis(validData)).not.toThrow();
  });

  test('invalid synthesis output throws', () => {
    expect(() => validateSynthesis({ incomplete: true })).toThrow();
  });

  test('titulo shorter than 3 chars throws', () => {
    const bad = {
      unidad_sintetizada: {
        titulo: 'ab',
        enfoque_didactico: 'test',
        temas_desarrollados: [{
          nombre: 'T1',
          conceptos_clave: ['c1', 'c2'],
          inteligencias_sugeridas: ['i1'],
          actividades: [
            { tipo: 't', inteligencia: 'i' },
            { tipo: 't2', inteligencia: 'i2' },
          ],
        }],
      },
    };
    expect(() => validateSynthesis(bad)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// ABPProjectSchema
// ---------------------------------------------------------------------------
describe('ABPProjectSchema', () => {
  const validData = {
    proyecto: {
      titulo: 'Proyecto de ciencias',
      pregunta_generadora: '¿Cómo afecta la contaminación?',
      fases: [
        {
          nombre: 'Investigación',
          duracion: '2 semanas',
          actividades: ['Investigar fuentes', 'Entrevistar expertos'],
        },
        {
          nombre: 'Experimentación',
          duracion: '3 semanas',
          actividades: ['Diseñar experimento', 'Recolectar datos'],
        },
        {
          nombre: 'Presentación',
          duracion: '1 semana',
          actividades: ['Preparar informe', 'Exponer resultados'],
        },
      ],
      productos: ['Informe escrito', 'Presentación oral'],
      evaluacion: {
        criterios: ['Claridad', 'Profundidad'],
        instrumentos: ['Rúbrica', 'Lista de cotejo'],
      },
    },
  };

  test('valid ABP output passes', () => {
    expect(() => validateABP(validData)).not.toThrow();
  });

  test('invalid ABP output throws', () => {
    expect(() => validateABP({ proyecto: { titulo: 'incomplete' } })).toThrow();
  });

  test('fewer than 3 fases throws', () => {
    const bad = {
      proyecto: {
        titulo: 'Test',
        pregunta_generadora: '¿?',
        fases: [
          {
            nombre: 'Fase 1',
            duracion: '1s',
            actividades: ['a1', 'a2'],
          },
          {
            nombre: 'Fase 2',
            duracion: '1s',
            actividades: ['a1', 'a2'],
          },
        ],
        productos: ['p1'],
        evaluacion: { criterios: ['c'], instrumentos: ['i'] },
      },
    };
    expect(() => validateABP(bad)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// AssessmentSchema
// ---------------------------------------------------------------------------
describe('AssessmentSchema', () => {
  const validData = {
    evaluacion: {
      proyecto: 'Proyecto ciencias',
      rubrica: {
        criterios: [
          {
            nombre: 'Contenido',
            peso: '30%',
            niveles: {
              excelente: 'Completo y detallado',
              suficiente: 'Adecuado',
              en_desarrollo: 'Parcial',
              inicial: 'Incompleto',
            },
          },
          {
            nombre: 'Presentación',
            peso: '25%',
            niveles: {
              excelente: 'Excelente formato',
              suficiente: 'Buen formato',
              en_desarrollo: 'Formato regular',
              inicial: 'Mal formato',
            },
          },
          {
            nombre: 'Trabajo en equipo',
            peso: '25%',
            niveles: {
              excelente: 'Colaboración total',
              suficiente: 'Colaboración buena',
              en_desarrollo: 'Colaboración parcial',
              inicial: 'Sin colaboración',
            },
          },
          {
            nombre: 'Innovación',
            peso: '20%',
            niveles: {
              excelente: 'Muy innovador',
              suficiente: 'Innovador',
              en_desarrollo: 'Poco innovador',
              inicial: 'Nada innovador',
            },
          },
        ],
      },
      autoevaluacion: {
        preguntas: [{ pregunta: '¿Cómo trabajé?', tipo: 'reflexiva' }],
        reflexion: ['Mejorar comunicación'],
      },
      coevaluacion: {
        preguntas: [{ pregunta: '¿Cómo trabajó el equipo?', tipo: 'reflexiva' }],
      },
    },
  };

  test('valid assessment output passes', () => {
    expect(() => validateAssessment(validData)).not.toThrow();
  });

  test('invalid assessment output throws', () => {
    expect(() => validateAssessment({ evaluacion: { proyecto: 'x' } })).toThrow();
  });

  test('fewer than 4 criterios throws', () => {
    const bad = {
      evaluacion: {
        proyecto: 'Test',
        rubrica: {
          criterios: [
            {
              nombre: 'C1', peso: '25%',
              niveles: { excelente: 'E', suficiente: 'S', en_desarrollo: 'D', inicial: 'I' },
            },
            {
              nombre: 'C2', peso: '25%',
              niveles: { excelente: 'E', suficiente: 'S', en_desarrollo: 'D', inicial: 'I' },
            },
            {
              nombre: 'C3', peso: '50%',
              niveles: { excelente: 'E', suficiente: 'S', en_desarrollo: 'D', inicial: 'I' },
            },
          ],
        },
        autoevaluacion: { preguntas: [], reflexion: [] },
        coevaluacion: { preguntas: [] },
      },
    };
    expect(() => validateAssessment(bad)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// PlanSchema
// ---------------------------------------------------------------------------
describe('PlanSchema', () => {
  const validData = {
    mapa_cognitivo: {
      verbos_bloom: ['Recordar', 'Comprender'],
      nivel_taxonomia: 'Medio',
      enfoque_sensorial: 'Visual',
    },
    inteligencias_multiples: [
      { inteligencia: 'lingüística', actividad: 'Lectura grupal' },
      { inteligencia: 'lógico-matemática', actividad: 'Resolver problemas' },
      { inteligencia: 'visual-espacial', actividad: 'Mapa conceptual' },
    ],
    secuencia_didactica: {
      bloques: [
        { nombre: 'Inicio', duracion: 15, objetivo: 'Activar', actividad: 'Preguntas' },
        { nombre: 'Desarrollo', duracion: 30, objetivo: 'Construir', actividad: 'Análisis' },
      ],
    },
  };

  test('valid plan output passes', () => {
    expect(() => validatePlan(validData)).not.toThrow();
  });

  test('invalid plan output throws', () => {
    expect(() => validatePlan({})).toThrow();
  });

  test('fewer than 3 inteligencias_multiples throws', () => {
    const bad = {
      mapa_cognitivo: { verbos_bloom: ['R'], nivel_taxonomia: 'N', enfoque_sensorial: 'V' },
      inteligencias_multiples: [
        { inteligencia: 'lingüística', actividad: 'Lectura' },
        { inteligencia: 'lógico-matemática', actividad: 'Ejercicios' },
      ],
      secuencia_didactica: { bloques: [] },
    };
    expect(() => validatePlan(bad)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// FichaSchema
// ---------------------------------------------------------------------------
describe('FichaSchema', () => {
  const validData = {
    ficha_trabajo: {
      titulo_gancho: 'La aventura del saber',
      historia_gancho: 'Había una vez un grupo de exploradores...',
      misiones: {
        oraculo: [
          {
            pregunta: '¿Cuál es la capital?',
            opciones: ['Lima', 'Bogotá', 'Quito', 'Santiago'],
            respuesta_correcta: 'Lima',
          },
        ],
        sopa: ['sol', 'luna', 'estrella'],
      },
    },
  };

  test('valid ficha output passes', () => {
    expect(() => validateFicha(validData)).not.toThrow();
  });

  test('invalid ficha output throws', () => {
    expect(() => validateFicha({})).toThrow();
  });

  test('misiones with optional fields omitted passes', () => {
    const minimal = {
      ficha_trabajo: {
        titulo_gancho: 'Título',
        historia_gancho: 'Historia',
        misiones: {},
      },
    };
    expect(() => validateFicha(minimal)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// QuizSchema
// ---------------------------------------------------------------------------
describe('QuizSchema', () => {
  const validData = {
    quiz: {
      titulo: 'Quiz de matemáticas',
      instrucciones: 'Responde correctamente',
      preguntas: [
        {
          numero: 1,
          tipo: 'escrita',
          pregunta: '¿Cuánto es 2+2?',
          opciones: ['3', '4', '5', '6'],
          respuesta: '4',
        },
        {
          numero: 2,
          tipo: 'visual',
          pregunta: 'Identifica la figura',
          respuesta: 'Cuadrado',
        },
      ],
    },
  };

  test('valid quiz output passes', () => {
    expect(() => validateQuiz(validData)).not.toThrow();
  });

  test('invalid quiz output throws', () => {
    expect(() => validateQuiz({ quiz: { titulo: 'x' } })).toThrow();
  });

  test('invalid tipo enum throws', () => {
    const bad = {
      quiz: {
        titulo: 'Test',
        instrucciones: 'Test',
        preguntas: [
          { numero: 1, tipo: 'inexistente', pregunta: '¿?' },
        ],
      },
    };
    expect(() => validateQuiz(bad)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// TutorSchema
// ---------------------------------------------------------------------------
describe('TutorSchema', () => {
  const validData = {
    panel_tutor: {
      resumen_clase: 'Clase participativa sobre fracciones',
      puntos_clave: ['Comprender numerador', 'Denominador', 'Simplificación'],
      momentos_criticos: [
        { momento: 'Explicación inicial', accion: 'Verificar atención', senial: 'Brazos cruzados' },
      ],
      checklist_pre_clase: ['Material listo', 'Presentación cargada'],
    },
  };

  test('valid tutor output passes', () => {
    expect(() => validateTutor(validData)).not.toThrow();
  });

  test('invalid tutor output throws', () => {
    expect(() => validateTutor({ panel_tutor: { resumen_clase: 'x' } })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// PDCSchema
// ---------------------------------------------------------------------------
describe('PDCSchema', () => {
  const validData = {
    pdc: {
      encabezado: {
        nivel: 'Primaria',
        grado: '3ro',
        materia: 'Matemáticas',
        trimestre: 1,
        ano_escolar: 2026,
      },
      unidades: [
        {
          numero: 1,
          titulo: 'Números naturales',
          semanas: '4 semanas',
          horas: 12,
          objetivo_holistico: 'Desarrollar pensamiento numérico',
          contenidos: {
            saber: ['Concepto de número'],
            hacer: ['Sumar y restar'],
          },
        },
      ],
    },
  };

  test('valid PDC output passes', () => {
    expect(() => validatePDC(validData)).not.toThrow();
  });

  test('invalid PDC output throws', () => {
    expect(() => validatePDC({ pdc: { encabezado: { nivel: 'x' } } })).toThrow();
  });

  test('trimestre out of range throws', () => {
    const bad = {
      pdc: {
        encabezado: { nivel: 'P', grado: '3', materia: 'M', trimestre: 5, ano_escolar: 2026 },
        unidades: [],
      },
    };
    expect(() => validatePDC(bad)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// RecalibrateSchema
// ---------------------------------------------------------------------------
describe('RecalibrateSchema', () => {
  const validData = {
    recalibracion: {
      diagnostico_general: 'Los estudiantes avanzaron en razonamiento lógico',
      fortalezas: ['Comprensión lectora', 'Trabajo en equipo'],
      areas_mejora: ['Cálculo mental', 'Expresión escrita'],
      ajustes_sugeridos: [
        { area: 'Cálculo', accion: 'Ejercicios diarios', impacto_esperado: 'Mejorar agilidad' },
      ],
    },
  };

  test('valid recalibrate output passes', () => {
    expect(() => validateRecalibrate(validData)).not.toThrow();
  });

  test('invalid recalibrate output throws', () => {
    expect(() => validateRecalibrate({})).toThrow();
  });
});

// ---------------------------------------------------------------------------
// MicroSchema
// ---------------------------------------------------------------------------
describe('MicroSchema', () => {
  const validData = {
    micro_objetivos: {
      unidad: 'Geometría básica',
      semanas: [
        {
          semana: 1,
          tema: 'Figuras planas',
          objetivos_diarios: [
            { dia: 1, objetivo: 'Identificar figuras', criterio_logro: 'Nombra 3 figuras', actividad_clave: 'Clasificar figuras' },
            { dia: 2, objetivo: 'Diferenciar figuras', criterio_logro: 'Compara 2 figuras', actividad_clave: 'Dibujar figuras' },
          ],
        },
      ],
    },
  };

  test('valid micro output passes', () => {
    expect(() => validateMicro(validData)).not.toThrow();
  });

  test('invalid micro output throws', () => {
    expect(() => validateMicro({ micro_objetivos: {} })).toThrow();
  });

  test('dia out of valid range throws', () => {
    const bad = {
      micro_objetivos: {
        unidad: 'U',
        semanas: [
          {
            semana: 1,
            tema: 'T',
            objetivos_diarios: [
              { dia: 0, objetivo: 'O', criterio_logro: 'C', actividad_clave: 'A' },
            ],
          },
        ],
      },
    };
    expect(() => validateMicro(bad)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Alpha2Schema
// ---------------------------------------------------------------------------
describe('Alpha2Schema', () => {
  const validData = {
    unidad_real: 'Unidad 1',
    temas: ['Tema A', 'Tema B'],
    contenido_temas: {
      'Tema A': 'Contenido extenso del tema A con al menos 10 caracteres...',
    },
    paginas_temas: {
      'Tema A': '10-15',
    },
  };

  test('valid alpha2 output passes', () => {
    expect(() => validateAlpha2(validData)).not.toThrow();
  });

  test('invalid alpha2 output throws', () => {
    expect(() => validateAlpha2({ temas: [] })).toThrow();
  });

  test('empty unidad_real throws', () => {
    const bad = {
      unidad_real: '',
      temas: ['Tema'],
      contenido_temas: { 'Tema': 'Contenido suficientemente largo' },
      paginas_temas: { 'Tema': '5' },
    };
    expect(() => validateAlpha2(bad)).toThrow();
  });
});
