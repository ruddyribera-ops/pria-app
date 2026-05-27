import { describe, it, expect } from 'vitest';
import {
  generateMockOutput,
  substituteVariables,
  formatContextoAnterior,
  type PromptContext,
} from './promptRunner';

describe('substituteVariables', () => {
  it('substitutes simple string variable', () => {
    const template = 'Hello {name}!';
    const result = substituteVariables(template, { name: 'World' });
    expect(result).toBe('Hello World!');
  });

  it('leaves unmatched variables as-is when key not in variables', () => {
    const template = 'Hello {name}!';
    const result = substituteVariables(template, { other: 'val' });
    expect(result).toBe('Hello {name}!');
  });

  it('formats arrays as bullet lists', () => {
    const template = 'Items:\n{items}';
    const result = substituteVariables(template, { items: ['apple', 'banana'] });
    expect(result).toContain('- apple');
    expect(result).toContain('- banana');
  });

  it('JSON-stringifies objects', () => {
    const template = 'Data: {data}';
    const result = substituteVariables(template, { data: { key: 'value' } });
    expect(result).toContain('"key": "value"');
  });

  it('converts booleans to Sí/No', () => {
    const template = 'Active: {active}';
    expect(substituteVariables(template, { active: true })).toContain('Sí');
    expect(substituteVariables(template, { active: false })).toContain('No');
  });
});

describe('formatContextoAnterior', () => {
  it('returns default message when empty', () => {
    expect(formatContextoAnterior({}, 'synthesis')).toBe('Sin contexto previo.');
  });

  it('formats accumulated results as context lines', () => {
    const accumulated = {
      synthesis: { unidad_sintetizada: { titulo: 'Test Unit' } },
    };
    const result = formatContextoAnterior(accumulated, 'synthesis');
    expect(result).toContain('synthesis');
    expect(result).toContain('Test Unit');
  });
});

describe('generateMockOutput', () => {
  it('generates output for tutor motor', () => {
    const context: PromptContext = {
      motorType: 'tutor',
      phaseId: 'tutor',
      params: { tema_clase: 'Photosynthesis', diagnosticos: '' },
      accumulated: {},
    };
    const result = generateMockOutput(context) as Record<string, unknown>;
    expect(result).toHaveProperty('panel_tutor');
  });

  it('generates output for pdc motor', () => {
    const context: PromptContext = {
      motorType: 'pdc',
      phaseId: 'pdc',
      params: { materia: 'Mathematics', nivel: 'Secundaria', grado: '3er año' },
      accumulated: {},
    };
    const result = generateMockOutput(context) as Record<string, unknown>;
    expect(result).toHaveProperty('pdc');
  });

  it('generates output for recalibrate motor', () => {
    const context: PromptContext = {
      motorType: 'recalibrate',
      phaseId: 'recalibrate',
      params: {},
      accumulated: {},
    };
    const result = generateMockOutput(context) as Record<string, unknown>;
    expect(result).toHaveProperty('recalibracion');
  });

  it('generates output for micro motor', () => {
    const context: PromptContext = {
      motorType: 'micro',
      phaseId: 'micro',
      params: { unidad_real: 'Unit 1' },
      accumulated: {},
    };
    const result = generateMockOutput(context) as Record<string, unknown>;
    expect(result).toHaveProperty('micro_objetivos');
  });

  it('generates output for alpha2 motor', () => {
    const context: PromptContext = {
      motorType: 'alpha2',
      phaseId: 'alpha2',
      params: { grado_nivel: '5to Primaria', unidad: 'Unit 1' },
      accumulated: {},
    };
    const result = generateMockOutput(context) as Record<string, unknown>;
    expect(result).toHaveProperty('temas');
  });

  it('generates output for synthesis motor', () => {
    const context: PromptContext = {
      motorType: 'synthesis',
      phaseId: 'synthesis',
      params: { grado_nivel: '5to Primaria', unidad: 'Test Unit', temas: ['Topic A'] },
      accumulated: {},
    };
    const result = generateMockOutput(context) as Record<string, unknown>;
    expect(result).toHaveProperty('unidad_sintetizada');
  });
});