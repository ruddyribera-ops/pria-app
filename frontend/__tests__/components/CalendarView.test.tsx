"""
Unit tests for CalendarView component
Tests: 16-week grid, vacation weeks, status badges, week selection, generation
"""
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CalendarView from '@/components/planning/CalendarView'
import axios from 'axios'

vi.mock('axios')

describe('CalendarView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders 16-week grid', () => {
    render(<CalendarView pdcId={1} />)

    // Should have 16 week cells (weeks 15-30)
    const weekCells = screen.getAllByTestId('week-cell')
    expect(weekCells).toHaveLength(16)
  })

  it('marks vacation weeks 23-24', () => {
    render(<CalendarView pdcId={1} />)

    const vacationWeek23 = screen.getByTestId('week-23')
    const vacationWeek24 = screen.getByTestId('week-24')

    expect(vacationWeek23).toHaveClass('vacation')
    expect(vacationWeek24).toHaveClass('vacation')
  })

  it('displays vacation label', () => {
    render(<CalendarView pdcId={1} />)

    const vacationLabels = screen.getAllByText(/vacaciones/i)
    expect(vacationLabels.length).toBeGreaterThan(0)
  })

  it('applies correct status badge colors', () => {
    const weekData = [
      { week: 15, status: 'draft' },
      { week: 16, status: 'published' },
      { week: 17, status: 'completed' }
    ]

    render(<CalendarView pdcId={1} weeks={weekData} />)

    const draftBadge = screen.getByTestId('badge-draft')
    const publishedBadge = screen.getByTestId('badge-published')
    const completedBadge = screen.getByTestId('badge-completed')

    expect(draftBadge).toHaveClass('bg-blue-500')
    expect(publishedBadge).toHaveClass('bg-green-500')
    expect(completedBadge).toHaveClass('bg-gray-800')
  })

  it('selects week on click', () => {
    const onWeekSelect = vi.fn()
    render(<CalendarView pdcId={1} onWeekSelect={onWeekSelect} />)

    const weekCell = screen.getByTestId('week-15')
    fireEvent.click(weekCell)

    expect(onWeekSelect).toHaveBeenCalledWith(15)
    expect(weekCell).toHaveClass('selected')
  })

  it('starts generate all task', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { task_id: '123' } })

    render(<CalendarView pdcId={1} />)

    const generateButton = screen.getByText(/generate all/i)
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/planning'),
        expect.any(Object)
      )
    })
  })

  it('displays progress bar during generation', async () => {
    render(<CalendarView pdcId={1} isGenerating={true} progress={50} />)

    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '50')
  })

  it('responsive: 4 columns desktop', () => {
    const { container } = render(<CalendarView pdcId={1} />)

    const grid = container.querySelector('[class*="grid"]')
    expect(grid).toHaveClass('grid-cols-4')
  })

  it('responsive: 2 columns tablet', () => {
    // Mock window.innerWidth for tablet
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    })

    const { container } = render(<CalendarView pdcId={1} />)

    const grid = container.querySelector('[class*="md:"]')
    expect(grid).toHaveClass('md:grid-cols-2')
  })

  it('responsive: 1 column mobile', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })

    const { container } = render(<CalendarView pdcId={1} />)

    const grid = container.querySelector('[class*="grid"]')
    expect(grid).toHaveClass('grid-cols-1')
  })
})
