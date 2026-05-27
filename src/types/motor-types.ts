// Auto-generated from server/src/schemas/ — matches Zod output shapes
// Generated: 2026-05-27

// ── Synthesis (synthesis.schema.ts) ─────────────────────────────────────────

export interface SynthesisOutput {
  unidad_sintetizada: {
    titulo: string;
    enfoque_didactico: string;
    temas_desarrollados: Array<{
      nombre: string;
      conceptos_clave: string[];
      inteligencias_sugeridas: string[];
      actividades: Array<{
        tipo: string;
        inteligencia: string;
      }>;
    }>;
    notas_docente?: string;
    proyecto_pbl?: string;
  };
}

// ── ABP (abp.schema.ts) ─────────────────────────────────────────────────────

export interface ABPOutput {
  proyecto: {
    titulo: string;
    pregunta_generadora: string;
    fases: Array<{
      nombre: string;
      duracion: string;
      actividades: string[];
      adaptaciones?: Array<{
        diagnostico: string;
        adaptacion: string;
      }>;
    }>;
    productos: string[];
    adaptaciones_inclusivas?: Array<{
      diagnostico: string;
      adaptacion: string;
    }>;
    evaluacion: {
      criterios: string[];
      instrumentos: string[];
    };
  };
}

// ── Assessment (assessment.schema.ts) ───────────────────────────────────────

export interface AssessmentOutput {
  evaluacion: {
    proyecto: string;
    rubrica: {
      criterios: Array<{
        nombre: string;
        peso: string;
        niveles: {
          excelente: string;
          suficiente: string;
          en_desarrollo: string;
          inicial: string;
        };
      }>;
    };
    autoevaluacion: {
      preguntas: Array<{
        pregunta: string;
        tipo: string;
      }>;
      reflexion: string[];
    };
    coevaluacion: {
      preguntas: Array<{
        pregunta: string;
        tipo: string;
      }>;
    };
    adaptaciones?: Array<{
      diagnostico: string;
      adaptacion: string;
    }>;
  };
}

// ── Plan (plan.schema.ts) ───────────────────────────────────────────────────

export interface PlanOutput {
  mapa_cognitivo: {
    verbos_bloom: string[];
    nivel_taxonomia: string;
    enfoque_sensorial: string;
  };
  inteligencias_multiples: Array<{
    inteligencia: string;
    actividad: string;
  }>;
  secuencia_didactica: {
    bloques: Array<{
      nombre: string;
      duracion: number;
      objetivo: string;
      actividad: string;
      nota?: string;
    }>;
  };
  dua_neuroinclusion?: string[];
  tabla_adaptaciones_clase?: Array<{
    diagnostico: string;
    adaptacion: string;
  }>;
  perfil_aula_resumido?: string;
  recursos_necesarios?: string[];
}

// ── Slides (slides.schema.ts) ───────────────────────────────────────────────

export interface SlideItem {
  numero: number;
  tipo: 'portada' | 'objetivos' | 'concepto' | 'pausa' | 'cierre';
  titulo: string;
  texto_pantalla: string;
  guion_docente: string;
  prompt_imagen?: string;
  callout?: string;
}

export type SlidesOutput = SlideItem[];

// ── Ficha (ficha.schema.ts) ─────────────────────────────────────────────────

export interface FichaOutput {
  ficha_trabajo: {
    titulo_gancho: string;
    historia_gancho: string;
    misiones: {
      oraculo?: Array<{
        pregunta: string;
        opciones: string[];
        respuesta_correcta: string;
      }>;
      puente?: Array<{
        palabra: string;
        significado: string;
      }>;
      sopa?: string[];
      pergamino?: {
        frase_con_espacios: string;
        palabras_secretas: string[];
      };
      lienzo?: string;
    };
    adaptaciones_por_mision?: Array<{
      mision: string;
      diagnostico: string;
      ajuste: string;
    }>;
  };
}

// ── Quiz (quiz.schema.ts) ───────────────────────────────────────────────────

export interface QuizOutput {
  quiz: {
    titulo: string;
    instrucciones: string;
    preguntas: Array<{
      numero: number;
      tipo: 'escrita' | 'oral' | 'visual' | 'desafio';
      pregunta: string;
      opciones?: string[];
      respuesta?: string;
    }>;
    clave_respuestas?: Array<{
      pregunta: number;
      respuesta: string;
      explicacion: string;
    }>;
    adaptaciones?: Array<{
      diagnostico: string;
      adaptacion: string;
    }>;
  };
}

// ── Tutor (tutor.schema.ts) ─────────────────────────────────────────────────

export interface TutorOutput {
  panel_tutor: {
    resumen_clase: string;
    puntos_clave: string[];
    momentos_criticos?: Array<{
      momento: string;
      accion: string;
      senial: string;
    }>;
    checklist_pre_clase?: string[];
    adaptaciones_rapidas?: Array<{
      diagnostico: string;
      senial: string;
      intervencion: string;
    }>;
    preguntas_frecuentes?: Array<{
      pregunta: string;
      respuesta_breve: string;
    }>;
  };
}

// ── PDC (pdc.schema.ts) ─────────────────────────────────────────────────────

export interface PDCOutput {
  pdc: {
    encabezado: {
      nivel: string;
      grado: string;
      materia: string;
      trimestre: number;
      ano_escolar: number;
    };
    unidades: Array<{
      numero: number;
      titulo: string;
      semanas: string;
      horas: number;
      objetivo_holistico: string;
      contenidos: {
        ser?: string[];
        saber?: string[];
        hacer?: string[];
        decidir?: string[];
      };
      metodologia_dua?: string[];
      evaluacion?: {
        formativa?: string;
        sumativa?: string;
      };
    }>;
    observaciones?: {
      adaptaciones?: string[];
      notas_docente?: string;
    };
  };
}

// ── Recalibrate (recalibrate.schema.ts) ─────────────────────────────────────

export interface RecalibrateOutput {
  recalibracion: {
    diagnostico_general: string;
    fortalezas: string[];
    areas_mejora: string[];
    ajustes_sugeridos?: Array<{
      area: string;
      accion: string;
      impacto_esperado: string;
    }>;
    recomendaciones_proximo_trimestre?: string[];
    adaptaciones_refinadas?: Array<{
      diagnostico: string;
      ajuste: string;
    }>;
  };
}

// ── Micro (micro.schema.ts) ─────────────────────────────────────────────────

export interface MicroOutput {
  micro_objetivos: {
    unidad: string;
    semanas: Array<{
      semana: number;
      tema: string;
      objetivos_diarios: Array<{
        dia: number;
        objetivo: string;
        criterio_logro: string;
        actividad_clave: string;
      }>;
    }>;
    evaluacion_semanal?: Array<{
      semana: number;
      indicadores: string[];
      instrumento: string;
    }>;
  };
}

// ── Union type for all motors ───────────────────────────────────────────────

export type AnyMotorOutput =
  | SynthesisOutput
  | ABPOutput
  | AssessmentOutput
  | PlanOutput
  | SlidesOutput
  | FichaOutput
  | QuizOutput
  | TutorOutput
  | PDCOutput
  | RecalibrateOutput
  | MicroOutput;
