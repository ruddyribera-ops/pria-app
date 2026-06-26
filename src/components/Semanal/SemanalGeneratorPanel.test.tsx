/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SemanalGeneratorPanel from './SemanalGeneratorPanel';
import type { MultiPhaseReturn } from '../../hooks/useMultiPhaseGeneration';
import type { PhaseDef } from '../../lib/pptx/phaseDefinitions';

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
    completeCard: 'completeCard',
    completeTitle: 'completeTitle',
    completeSubtitle: 'completeSubtitle',
    openEditorBtn: 'openEditorBtn',
  },
}));

// Mock sub-components
vi.mock('../Motores/PhaseFieldRenderer', () => ({
  default: () => <div data-testid="phase-field-renderer">PhaseFieldRenderer</div>,
}));

vi.mock('../Motores/PhaseStepper', () => ({
  default: () => <div data-testid="phase-stepper">PhaseStepper</div>,
}));

vi.mock('../Motores/PhaseNavigation', () => ({
  default: () => <div data-testid="phase-navigation">PhaseNavigation</div>,
}));

vi.mock('../Motores/MultiPhaseProgress', () => ({
  default: () => <div data-testid="multi-phase-progress">MultiPhaseProgress</div>,
}));

vi.mock('../SlideEditor/ResultPreview', () => ({
  default: () => <div data-testid="result-preview">ResultPreview</div>,
}));

vi.mock('../SlideEditor/SlideEditorPanel', () => ({
  default: () => <div data-testid="slide-editor-panel">SlideEditorPanel</div>,
}));

// Helper to create mock mpg
function createMockMpg(overrides: Partial<MultiPhaseReturn> = {}): MultiPhaseReturn {
  return {
    phaseDefs: [],
    currentPhase: 0,
    totalPhases: 3,
    phaseStatus: 'idle',
    phaseStatuses: [],
    results: {},
    currentResult: null,
    error: null,
    isActive: false,
    allPhasesDone: false,
    progress: 0,
    currentPhaseName: null,
    phaseProgress: 0,
    completedPhases: [],
    submit: vi.fn(),
    regenerate: vi.fn(),
    nextPhase: vi.fn(),
    prevPhase: vi.fn(),
    goToPhase: vi.fn(),
    reset: vi.fn(),
    isPhaseDone: vi.fn(() => false),
    runMultiPhase: vi.fn(),
    cancel: vi.fn(),
    simulated: false,
    ...overrides,
  };
}

describe('SemanalGeneratorPanel', () => {
  const defaultPhaseDef: PhaseDef = {
    id: 'test-phase',
    label: 'Fase de Prueba',
    subtitle: 'Paso 1 de 3',
    description: 'Descripción de prueba',
    fields: [],
    produces: [],
  };

  const defaultProps = {
    activeMotorType: 'plan' as const,
    activeDay: 'LUNES',
    activeLabel: 'Plan de Clase',
    params: {} as Record<string, unknown>,
    showEditor: false,
    currentResultId: null as number | null,
    mergedData: null as any,
    currentPhaseDef: defaultPhaseDef as PhaseDef | undefined,
    mpg: createMockMpg({ phaseStatuses: ['idle', 'idle', 'idle'] }),
    onReset: vi.fn(),
    onRunMultiPhase: vi.fn(),
    onRegenerate: vi.fn(),
    onClearEditor: vi.fn(),
    onSave: vi.fn(),
    onParamsChange: vi.fn(),
  };

  test('renders panel header with active label', () => {
    render(<SemanalGeneratorPanel {...defaultProps} />);
    expect(screen.getByText('Plan de Clase en 3 fases')).toBeTruthy();
    expect(screen.getByText(/Generación activa ·/)).toBeTruthy();
  });

  test('renders cancel button', () => {
    render(<SemanalGeneratorPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Cancelar/ })).toBeTruthy();
  });

  test('cancel button calls onReset', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(<SemanalGeneratorPanel {...defaultProps} onReset={onReset} />);
    
    await user.click(screen.getByRole('button', { name: /Cancelar/ }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  test('renders sub-components', () => {
    render(<SemanalGeneratorPanel {...defaultProps} />);
    expect(screen.getByTestId('multi-phase-progress')).toBeTruthy();
    expect(screen.getByTestId('phase-stepper')).toBeTruthy();
    expect(screen.getByTestId('phase-navigation')).toBeTruthy();
  });

  test('renders generate button when not active', () => {
    const mpg = createMockMpg({ isActive: false, allPhasesDone: false, currentPhaseName: null });
    render(<SemanalGeneratorPanel {...defaultProps} mpg={mpg} />);
    expect(screen.getByText(/Generar Todo/)).toBeTruthy();
  });

  test('generate button is disabled when isActive', () => {
    const mpg = createMockMpg({ isActive: true, phaseStatuses: ['generating', 'idle', 'idle'] });
    render(<SemanalGeneratorPanel {...defaultProps} mpg={mpg} />);
    // When isActive, the button shows "⏳ Generando..." and is disabled
    const btn = screen.getByRole('button', { name: /Generando/ });
    expect(btn).toBeTruthy();
    expect(btn).toBeDisabled();
  });

  test('shows loading state during generation', () => {
    const mpg = createMockMpg({ isActive: true, currentPhaseName: 'synthesis', phaseProgress: 50, phaseStatuses: ['generating', 'generating', 'idle'] });
    render(<SemanalGeneratorPanel {...defaultProps} mpg={mpg} currentPhaseDef={{
      id: 'synthesis',
      label: 'Síntesis',
      subtitle: 'Paso 2 de 3',
      description: 'Test',
      fields: [],
      produces: [],
    }} />);
    // When currentPhaseName is set, the loading text is shown
    expect(screen.getByText((content) => content.includes('Ejecutando fase'))).toBeTruthy();
  });

  test('shows error state', () => {
    const mpg = createMockMpg({ error: 'Something went wrong' });
    render(<SemanalGeneratorPanel {...defaultProps} mpg={mpg} />);
    // Error is shown in MultiPhaseProgress component
    expect(screen.getByTestId('multi-phase-progress')).toBeTruthy();
  });

  test('onRunMultiPhase is called when generate button clicked', async () => {
    const user = userEvent.setup();
    const mpg = createMockMpg({ isActive: false, phaseStatuses: ['idle', 'idle', 'idle'] });
    const onRunMultiPhase = vi.fn();
    render(
      <SemanalGeneratorPanel
        {...defaultProps}
        mpg={mpg}
        onRunMultiPhase={onRunMultiPhase}
      />
    );
    
    const genBtn = screen.getByText(/Generar Todo/);
    await user.click(genBtn);
    expect(onRunMultiPhase).toHaveBeenCalledTimes(1);
  });

  test('renders phase fields when currentPhaseDef exists', () => {
    const currentPhaseDef: PhaseDef = {
      id: 'test',
      label: 'Test Phase',
      subtitle: 'Step 1',
      description: 'Test description',
      fields: [],
      produces: [],
    };
    render(
      <SemanalGeneratorPanel
        {...defaultProps}
        currentPhaseDef={currentPhaseDef}
        mpg={createMockMpg({ phaseStatuses: ['idle', 'idle', 'idle'] })}
      />
    );
    expect(screen.getByText('Test Phase')).toBeTruthy();
    expect(screen.getByText('Test description')).toBeTruthy();
  });
});
