/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SemanalGeneratorPanel, { type SemanalMotorGenerator } from './SemanalGeneratorPanel';

// Mock CSS module
vi.mock('../../styles/SemanalCommon.module.css', () => ({
  __esModule: true,
  default: {
    genPanel: 'genPanel',
    genPanelHeader: 'genPanelHeader',
    genPanelMeta: 'genPanelMeta',
    genPanelTitle: 'genPanelTitle',
    cancelBtn: 'cancelBtn',
    phaseMetaInfo: 'phaseMetaInfo',
    phaseTitle: 'phaseTitle',
    phaseDesc: 'phaseDesc',
    fieldList: 'fieldList',
    fieldItem: 'fieldItem',
    fieldMarginTop: 'fieldMarginTop',
    genSubmitBtn: 'genSubmitBtn',
    phaseResult: 'phaseResult',
    phaseResultTitle: 'phaseResultTitle',
    filterLabel: 'filterLabel',
    filterInput: 'filterInput',
    filterSelect: 'filterSelect',
    textareaInput: 'textareaInput',
    checkboxField: 'checkboxField',
    checkboxInput: 'checkboxInput',
    checkboxLabel: 'checkboxLabel',
  },
}));

// Mock sub-components
vi.mock('../Motores/PhaseFieldRenderer', () => ({
  default: () => <div data-testid="phase-field-renderer">PhaseFieldRenderer</div>,
}));

vi.mock('../SlideEditor/ResultPreview', () => ({
  default: () => <div data-testid="result-preview">ResultPreview</div>,
}));

function createMockGenerator(overrides: Partial<SemanalMotorGenerator> = {}): SemanalMotorGenerator {
  return {
    result: null,
    loading: false,
    error: null,
    simulated: false,
    ...overrides,
  };
}

describe('SemanalGeneratorPanel', () => {
  const defaultProps = {
    activeMotorType: 'plan' as const,
    activeDay: 'LUNES',
    activeLabel: 'Plan de Clase',
    params: {} as Record<string, unknown>,
    motorGenerator: createMockGenerator(),
    onReset: vi.fn(),
    onGenerate: vi.fn(),
    onRegenerate: vi.fn(),
    onParamsChange: vi.fn(),
  };

  test('renders panel header with direct generation label', () => {
    renderPanel();
    expect(screen.getByText('Plan de Clase · generación directa')).toBeTruthy();
    expect(screen.getByText(/Generación activa ·/)).toBeTruthy();
  });

  test('renders cancel button', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /Cancelar/ })).toBeTruthy();
  });

  test('cancel button calls onReset', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    renderPanel({ onReset });

    await user.click(screen.getByRole('button', { name: /Cancelar/ }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  test('renders the motor phase fields as configuration fields', () => {
    renderPanel();
    expect(screen.getAllByTestId('phase-field-renderer').length).toBeGreaterThan(0);
  });

  test('renders generate button when not loading', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /Generar Plan de Clase/ })).toBeTruthy();
  });

  test('generate button is disabled when loading', () => {
    renderPanel({ motorGenerator: createMockGenerator({ loading: true }) });
    const button = screen.getByRole('button', { name: /Generando/ });
    expect(button).toBeDisabled();
  });

  test('shows result and regenerate action after generation', () => {
    renderPanel({ motorGenerator: createMockGenerator({ result: { generated: true } }) });
    expect(screen.getByTestId('result-preview')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Regenerar/ })).toBeTruthy();
  });

  test('shows the generator error', () => {
    renderPanel({ motorGenerator: createMockGenerator({ error: 'Something went wrong' }) });
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  test('onGenerate is called when generate button is clicked', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    renderPanel({ onGenerate });

    await user.click(screen.getByRole('button', { name: /Generar Plan de Clase/ }));
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  test('onRegenerate is called from result view', async () => {
    const user = userEvent.setup();
    const onRegenerate = vi.fn();
    renderPanel({
      onRegenerate,
      motorGenerator: createMockGenerator({ result: { generated: true } }),
    });

    await user.click(screen.getByRole('button', { name: /Regenerar/ }));
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  function renderPanel(overrides: Partial<typeof defaultProps> = {}) {
    return render(<SemanalGeneratorPanel {...defaultProps} {...overrides} />);
  }
});
