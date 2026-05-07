"""
Unit tests for PDCEditor component
Tests: rendering, data loading, saving, MESCP table, modals, error handling
"""
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PDCEditor from '@/components/pdc/PDCEditor'
import axios from 'axios'

// Mock axios
vi.mock('axios')

describe('PDCEditor Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<PDCEditor />)
    expect(container).toBeTruthy()
  })

  it('loads PDC on mount', async () => {
    const mockPDC = {
      id: 1,
      title: 'Test PDC',
      subject: 'Matemáticas',
      grade_level: '6',
      content: { mescp_rows: [] }
    }

    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockPDC })

    render(<PDCEditor pdcId={1} />)

    await waitFor(() => {
      expect(screen.getByText('Test PDC')).toBeInTheDocument()
    })
  })

  it('displays error on API failure', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('API Error'))

    render(<PDCEditor pdcId={1} />)

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })

  it('saves PDC on button click', async () => {
    const mockPDC = {
      id: 1,
      title: 'Test PDC',
      subject: 'Matemáticas',
      grade_level: '6',
      content: { mescp_rows: [] }
    }

    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockPDC })
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { success: true } })

    render(<PDCEditor pdcId={1} />)

    const saveButton = await screen.findByText(/save/i)
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled()
    })
  })

  it('displays MESCP table', async () => {
    const mockPDC = {
      id: 1,
      title: 'Test PDC',
      subject: 'Math',
      grade_level: '6',
      content: {
        mescp_rows: [
          {
            objetivo: 'Test Objective',
            contenidos: 'Test Content',
            estrategias: 'Test Strategy',
            criterios: 'Test Criteria',
            productos: 'Test Products',
            evidencias: 'Test Evidence'
          }
        ]
      }
    }

    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockPDC })

    render(<PDCEditor pdcId={1} />)

    await waitFor(() => {
      expect(screen.getByText('Test Objective')).toBeInTheDocument()
    })
  })

  it('opens edit modal on row click', async () => {
    const mockPDC = {
      id: 1,
      title: 'Test PDC',
      subject: 'Math',
      grade_level: '6',
      content: {
        mescp_rows: [
          {
            objetivo: 'Edit Me',
            contenidos: 'Content',
            estrategias: 'Strategy',
            criterios: 'Criteria',
            productos: 'Products',
            evidencias: 'Evidence'
          }
        ]
      }
    }

    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockPDC })

    render(<PDCEditor pdcId={1} />)

    const editButton = await screen.findByText(/edit/i)
    fireEvent.click(editButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('deletes MESCP row with confirmation', async () => {
    const mockPDC = {
      id: 1,
      title: 'Test PDC',
      subject: 'Math',
      grade_level: '6',
      content: {
        mescp_rows: [
          {
            objetivo: 'Delete Me',
            contenidos: 'Content',
            estrategias: 'Strategy',
            criterios: 'Criteria',
            productos: 'Products',
            evidencias: 'Evidence'
          }
        ]
      }
    }

    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockPDC })
    vi.mocked(axios.delete).mockResolvedValueOnce({ data: { success: true } })

    render(<PDCEditor pdcId={1} />)

    const deleteButton = await screen.findByText(/delete/i)

    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)

    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalled()
    })
  })

  it('responsive layout stacks on mobile', () => {
    const { container } = render(<PDCEditor />)

    // Check for responsive classes
    const editor = container.querySelector('[class*="md:"]')
    expect(editor).toBeTruthy()
  })
})
