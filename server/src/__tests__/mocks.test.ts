/**
 * @vitest-environment node
 */
// Unit tests for all 12 server-side mock generators.
// Validates that each mock produces output that passes its Zod schema.
import { describe, test, expect } from 'vitest';
import {
  mockAlpha2Output,
  mockSynthesisOutput,
  mockABPOutput,
  mockAssessmentOutput,
  mockPlanOutput,
  mockSlidesOutput,
  mockFichaOutput,
  mockQuizOutput,
  mockTutorOutput,
  mockPDCOutput,
  mockRecalibrateOutput,
  mockMicroOutput,
} from '../motores/mocks.js';
import { validateAlpha2 } from '../schemas/alpha2.schema.js';
import { validateSynthesis } from '../schemas/synthesis.schema.js';
import { validateABP } from '../schemas/abp.schema.js';
import { validateAssessment } from '../schemas/assessment.schema.js';
import { validatePlan } from '../schemas/plan.schema.js';
import { validateSlides } from '../schemas/slides.schema.js';
import { validateFicha } from '../schemas/ficha.schema.js';
import { validateQuiz } from '../schemas/quiz.schema.js';
import { validateTutor } from '../schemas/tutor.schema.js';
import { validatePDC } from '../schemas/pdc.schema.js';
import { validateRecalibrate } from '../schemas/recalibrate.schema.js';
import { validateMicro } from '../schemas/micro.schema.js';

function assertValidSchema(validateFn: (x: unknown) => void, output: unknown, label: string) {
  expect(() => validateFn(output)).not.toThrow(`${label}: output should pass Zod validation`);
}

// ---------------------------------------------------------------------------
// alpha2
// ---------------------------------------------------------------------------
describe('mockAlpha2Output', () => {
  test('empty params produces valid output', () => {
    const out = mockAlpha2Output({});
    assertValidSchema(validateAlpha2, out, 'alpha2 empty');
    expect(out.unidad_real).toBeTruthy();
    expect(Array.isArray(out.temas)).toBe(true);
    expect(out.temas.length).toBeGreaterThan(0);
  });

  test('with params produces valid output', () => {
    const out = mockAlpha2Output({ unidad: 'Historia 1', temas: ['Origen', 'Poblamiento'] });
    assertValidSchema(validateAlpha2, out, 'alpha2 with params');
    expect(out.unidad_real).toBe('Historia 1');
    expect((out.temas as string[]).join(',')).toContain('Origen');
  });
});

// ---------------------------------------------------------------------------
// synthesis
// ---------------------------------------------------------------------------
describe('mockSynthesisOutput', () => {
  test('empty params produces valid output', () => {
    const out = mockSynthesisOutput({});
    assertValidSchema(validateSynthesis, out, 'synthesis empty');
    expect(out.unidad_sintetizada).toBeTruthy();
  });

  test('with params produces valid output', () => {
    const out = mockSynthesisOutput({
      unidad: 'Ciencias Naturales',
      temas: ['Ecosistemas', 'Energía'],
      diagnosticos: 'TDAH',
    });
    assertValidSchema(validateSynthesis, out, 'synthesis with params');
    expect(out.unidad_sintetizada.titulo).toBe('Ciencias Naturales');
    expect(out.unidad_sintetizada.notas_docente).toContain('TDAH');
  });
});

// ---------------------------------------------------------------------------
// abp
// ---------------------------------------------------------------------------
describe('mockABPOutput', () => {
  test('empty params produces valid output', () => {
    const out = mockABPOutput({});
    assertValidSchema(validateABP, out, 'abp empty');
    expect(out.proyecto).toBeTruthy();
    expect(out.proyecto.fases.length).toBeGreaterThanOrEqual(3);
  });

  test('with params produces valid output', () => {
    const out = mockABPOutput({ unidad: 'Geografía' });
    assertValidSchema(validateABP, out, 'abp with params');
    expect(out.proyecto.titulo).toContain('Geografía');
  });
});

// ---------------------------------------------------------------------------
// assessment
// ---------------------------------------------------------------------------
describe('mockAssessmentOutput', () => {
  test('empty params produces valid output', () => {
    const out = mockAssessmentOutput({});
    assertValidSchema(validateAssessment, out, 'assessment empty');
    expect(out.evaluacion).toBeTruthy();
    expect(out.evaluacion.rubrica.criterios.length).toBeGreaterThanOrEqual(4);
  });

  test('with params produces valid output', () => {
    const out = mockAssessmentOutput({ proyecto_pbl: 'Mi proyecto' });
    assertValidSchema(validateAssessment, out, 'assessment with params');
    expect(out.evaluacion.proyecto).toBe('Mi proyecto');
  });
});

// ---------------------------------------------------------------------------
// plan
// ---------------------------------------------------------------------------
describe('mockPlanOutput', () => {
  test('empty params produces valid output', () => {
    const out = mockPlanOutput({});
    assertValidSchema(validatePlan, out, 'plan empty');
    expect(out.inteligencias_multiples).toBeTruthy();
    expect(out.inteligencias_multiples.length).toBeGreaterThanOrEqual(3);
  });

  test('with params produces valid output', () => {
    const out = mockPlanOutput({ tema_clase: 'Fracciones', diagnosticos: 'TEA' });
    assertValidSchema(validatePlan, out, 'plan with params');
    expect(out.tabla_adaptaciones_clase).toContainEqual(expect.objectContaining({ diagnostico: 'TEA' }));
  });
});

// ---------------------------------------------------------------------------
// slides
// ---------------------------------------------------------------------------
describe('mockSlidesOutput', () => {
  test('empty params produces valid output', () => {
    const out = mockSlidesOutput({});
    assertValidSchema(validateSlides, out, 'slides empty');
    expect(Array.isArray(out)).toBe(true);
    expect(out.length).toBeGreaterThan(0);
  });

  test('with params produces valid output', () => {
    const out = mockSlidesOutput({ palabras_clave: 'Fotosíntesis,Clorofila' });
    assertValidSchema(validateSlides, out, 'slides with params');
    expect(out[0].titulo).toBe('Fotosíntesis');
  });
});

// ---------------------------------------------------------------------------
// ficha
// ---------------------------------------------------------------------------
describe('mockFichaOutput', () => {
  test('empty params produces valid output', () => {
    const out = mockFichaOutput({});
    assertValidSchema(validateFicha, out, 'ficha empty');
    expect(out.ficha_trabajo).toBeTruthy();
    expect(out.ficha_trabajo.titulo_gancho).toBeTruthy();
  });

  test('with params produces valid output', () => {
    const out = mockFichaOutput({ tema: 'Matemáticas', diagnosticos: 'TDAH' });
    assertValidSchema(validateFicha, out, 'ficha with params');
    expect(out.ficha_trabajo.titulo_gancho).toContain('Matemáticas');
  });
});

// ---------------------------------------------------------------------------
// quiz
// ---------------------------------------------------------------------------
describe('mockQuizOutput', () => {
  test('empty params produces valid output', () => {
    const out = mockQuizOutput({});
    assertValidSchema(validateQuiz, out, 'quiz empty');
    expect(out.quiz).toBeTruthy();
    expect(out.quiz.titulo).toBeTruthy();
  });

  test('with params produces valid output', () => {
    const out = mockQuizOutput({ palabras_clave: 'Geometría' });
    assertValidSchema(validateQuiz, out, 'quiz with params');
    expect(out.quiz.titulo).toContain('Geometría');
  });
});

// ---------------------------------------------------------------------------
// tutor
// ---------------------------------------------------------------------------
describe('mockTutorOutput', () => {
  test('empty params produces valid output', () => {
    const out = mockTutorOutput({});
    assertValidSchema(validateTutor, out, 'tutor empty');
    expect(out.panel_tutor).toBeTruthy();
    expect(out.panel_tutor.resumen_clase).toBeTruthy();
  });

  test('with params produces valid output', () => {
    const out = mockTutorOutput({ tema_clase: 'Historia' });
    assertValidSchema(validateTutor, out, 'tutor with params');
    expect(out.panel_tutor.resumen_clase).toContain('Historia');
  });
});

// ---------------------------------------------------------------------------
// pdc
// ---------------------------------------------------------------------------
describe('mockPDCOutput', () => {
  test('empty params produces valid output', () => {
    const out = mockPDCOutput({});
    assertValidSchema(validatePDC, out, 'pdc empty');
    expect(out.pdc).toBeTruthy();
    expect(out.pdc.encabezado).toBeTruthy();
  });

  test('with params produces valid output', () => {
    const out = mockPDCOutput({ materia: 'Ciencias', nivel: 'Secundaria', grado: '2do' });
    assertValidSchema(validatePDC, out, 'pdc with params');
    expect(out.pdc.encabezado.materia).toBe('Ciencias');
    expect(out.pdc.encabezado.nivel).toBe('Secundaria');
  });
});

// ---------------------------------------------------------------------------
// recalibrate
// ---------------------------------------------------------------------------
describe('mockRecalibrateOutput', () => {
  test('empty params produces valid output', () => {
    const out = mockRecalibrateOutput({});
    assertValidSchema(validateRecalibrate, out, 'recalibrate empty');
    expect(out.recalibracion).toBeTruthy();
    expect(out.recalibracion.diagnostico_general).toBeTruthy();
  });

  test('with params produces valid output', () => {
    const out = mockRecalibrateOutput({ nivel: 'Secundaria' });
    assertValidSchema(validateRecalibrate, out, 'recalibrate with params');
    expect(Array.isArray(out.recalibracion.ajustes_sugeridos)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// micro
// ---------------------------------------------------------------------------
describe('mockMicroOutput', () => {
  test('empty params produces valid output', () => {
    const out = mockMicroOutput({});
    assertValidSchema(validateMicro, out, 'micro empty');
    expect(out.micro_objetivos).toBeTruthy();
    expect(out.micro_objetivos.unidad).toBeTruthy();
  });

  test('with params produces valid output', () => {
    const out = mockMicroOutput({ unidad_real: 'Matemáticas' });
    assertValidSchema(validateMicro, out, 'micro with params');
    expect(out.micro_objetivos.unidad).toBe('Matemáticas');
  });
});