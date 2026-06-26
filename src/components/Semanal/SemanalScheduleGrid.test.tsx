/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SemanalScheduleGrid from './SemanalScheduleGrid';
import type { ScheduleEntry } from '../../types';

// Mock CSS module
vi.mock('../../styles/SemanalCommon.module.css', () => ({
  __esModule: true,
  default: {
    filterBar: 'filterBar',
    filterGroup: 'filterGroup',
    filterLabel: 'filterLabel',
    filterSelect: 'filterSelect',
    filterInput: 'filterInput',
    weekGrid: 'weekGrid',
    dayCard: 'dayCard',
    dayTitle: 'dayTitle',
    dayEntry: 'dayEntry',
    entryMateria: 'entryMateria',
    entryHora: 'entryHora',
    dayEmpty: 'dayEmpty',
    dayActions: 'dayActions',
    dayActionBtn: 'dayActionBtn',
  },
}));

describe('SemanalScheduleGrid', () => {
  const defaultProps = {
    nivel: 'Secundaria',
    grado: '3er año',
    materia: 'Todas las materias',
    paginas: '',
    teacherCode: 'T001',
    teachers: [] as { code: string; name: string }[],
    teachersLoading: false,
    weekData: {} as Record<string, ScheduleEntry[]>,
    scheduleLoading: false,
    isGenerating: false,
    user: null as { teacher_code?: string; nombre?: string } | null,
    onNivelChange: vi.fn(),
    onGradoChange: vi.fn(),
    onMateriaChange: vi.fn(),
    onTeacherCodeChange: vi.fn(),
    onPaginasChange: vi.fn(),
    onDayAction: vi.fn(),
  };

  test('renders empty grid with all days', () => {
    render(<SemanalScheduleGrid {...defaultProps} />);
    
    expect(screen.getByText('LUNES')).toBeTruthy();
    expect(screen.getByText('MARTES')).toBeTruthy();
    expect(screen.getByText('MIÉRCOLES')).toBeTruthy();
    expect(screen.getByText('JUEVES')).toBeTruthy();
    expect(screen.getByText('VIERNES')).toBeTruthy();
  });

  test('renders empty state for day with no classes', () => {
    render(<SemanalScheduleGrid {...defaultProps} />);
    // Should show "Sin clases" message for empty days
    const sinClasesElements = screen.getAllByText('Sin clases');
    expect(sinClasesElements.length).toBe(5); // One for each day
  });

  test('renders blocks in correct day columns', () => {
    const weekData: Record<string, ScheduleEntry[]> = {
      LUNES: [
        { hora: '08:00', materia: 'Matemáticas', grado: '3er año', nivel: 'Secundaria', docente: 'Prof. García', tipo: 'normal' },
      ],
      MARTES: [],
      MIÉRCOLES: [],
      JUEVES: [],
      VIERNES: [],
    };
    
    render(<SemanalScheduleGrid {...defaultProps} weekData={weekData} />);
    
    expect(screen.getByText('Matemáticas')).toBeTruthy();
    expect(screen.getByText('08:00')).toBeTruthy();
  });

  test('renders blocks in correct time slots', () => {
    const weekData: Record<string, ScheduleEntry[]> = {
      LUNES: [
        { hora: '08:00', materia: 'Matemáticas', grado: '3er año', nivel: 'Secundaria', docente: 'Prof. García', tipo: 'normal' },
        { hora: '10:00', materia: 'Lenguaje', grado: '3er año', nivel: 'Secundaria', docente: 'Prof. García', tipo: 'normal' },
      ],
      MARTES: [],
      MIÉRCOLES: [],
      JUEVES: [],
      VIERNES: [],
    };
    
    render(<SemanalScheduleGrid {...defaultProps} weekData={weekData} />);
    
    expect(screen.getByText('Matemáticas')).toBeTruthy();
    expect(screen.getByText('Lenguaje')).toBeTruthy();
    expect(screen.getByText('08:00')).toBeTruthy();
    expect(screen.getByText('10:00')).toBeTruthy();
  });

  test('click on action button calls onDayAction', async () => {
    const user = userEvent.setup();
    const onDayAction = vi.fn();
    
    render(<SemanalScheduleGrid {...defaultProps} onDayAction={onDayAction} />);
    
    // Find the first "Plan" button for LUNES
    const planButtons = screen.getAllByText('📄 Plan');
    await user.click(planButtons[0]);
    
    expect(onDayAction).toHaveBeenCalledWith('LUNES', '📄 Plan');
  });

  test('renders filter bar with correct values', () => {
    render(<SemanalScheduleGrid {...defaultProps} />);
    
    expect(screen.getByLabelText('Nivel')).toBeTruthy();
    expect(screen.getByLabelText('Grado')).toBeTruthy();
    expect(screen.getByLabelText('Materia')).toBeTruthy();
    expect(screen.getByLabelText('Docente')).toBeTruthy();
    expect(screen.getByLabelText('Paginas del Libro')).toBeTruthy();
  });

  test('filter change handlers are called', async () => {
    const user = userEvent.setup();
    const onNivelChange = vi.fn();
    const onGradoChange = vi.fn();
    const onMateriaChange = vi.fn();
    
    render(
      <SemanalScheduleGrid
        {...defaultProps}
        onNivelChange={onNivelChange}
        onGradoChange={onGradoChange}
        onMateriaChange={onMateriaChange}
      />
    );
    
    const nivelSelect = screen.getByLabelText('Nivel') as HTMLSelectElement;
    await user.selectOptions(nivelSelect, 'Primaria');
    expect(onNivelChange).toHaveBeenCalledWith('Primaria');
  });

  test('disables filters when isGenerating is true', () => {
    render(<SemanalScheduleGrid {...defaultProps} isGenerating={true} />);
    
    const nivelSelect = screen.getByLabelText('Nivel') as HTMLSelectElement;
    expect(nivelSelect.disabled).toBe(true);
  });

  test('renders loading state for scheduleLoading', () => {
    render(<SemanalScheduleGrid {...defaultProps} scheduleLoading={true} />);
    expect(screen.getByText('Cargando horarios...')).toBeTruthy();
  });

  test('shows teachers in dropdown when available', () => {
    const teachers = [
      { code: 'T001', name: 'Prof. García' },
      { code: 'T002', name: 'Prof. López' },
    ];
    
    render(<SemanalScheduleGrid {...defaultProps} teachers={teachers} />);
    
    expect(screen.getByText('Prof. García (T001)')).toBeTruthy();
    expect(screen.getByText('Prof. López (T002)')).toBeTruthy();
  });
});
