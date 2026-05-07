"""
Unit tests for usePDC hook
Tests: data loading, state management, error handling, refetch
"""
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePDC } from '@/lib/hooks/usePDC'
import axios from 'axios'

vi.mock('axios')

describe('usePDC Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads PDC on mount', async () => {
    const mockPDC = {
      id: 1,
      title: 'Test PDC',
      subject: 'Math',
      grade_level: '6',
      content: {}
    }

    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockPDC })

    const { result } = renderHook(() => usePDC(1))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.pdc).toEqual(mockPDC)
  })

  it('updates state on successful load', async () => {
    const mockPDC = {
      id: 1,
      title: 'Test PDC',
      subject: 'Matemáticas',
      grade_level: '6',
      content: { mescp_rows: [] }
    }

    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockPDC })

    const { result } = renderHook(() => usePDC(1))

    await waitFor(() => {
      expect(result.current.pdc).toBeTruthy()
    })

    expect(result.current.pdc?.title).toBe('Test PDC')
    expect(result.current.pdc?.subject).toBe('Matemáticas')
  })

  it('sets error on API failure', async () => {
    const errorMessage = 'API Error'
    vi.mocked(axios.get).mockRejectedValueOnce(new Error(errorMessage))

    const { result } = renderHook(() => usePDC(1))

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })

    expect(result.current.error).toContain(errorMessage)
  })

  it('returns loading state while fetching', async () => {
    const mockPDC = { id: 1, title: 'Test' }

    vi.mocked(axios.get).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({ data: mockPDC }), 100))
    )

    const { result } = renderHook(() => usePDC(1))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('refetch function calls API again', async () => {
    const mockPDC = {
      id: 1,
      title: 'Test PDC',
      subject: 'Math',
      grade_level: '6'
    }

    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockPDC })

    const { result } = renderHook(() => usePDC(1))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const callCount = vi.mocked(axios.get).mock.calls.length

    // Call refetch
    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockPDC })
    await result.current.refetch()

    expect(vi.mocked(axios.get).mock.calls.length).toBeGreaterThan(callCount)
  })

  it('handles loading state correctly', async () => {
    const mockPDC = { id: 1, title: 'Test' }

    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockPDC })

    const { result } = renderHook(() => usePDC(1))

    // Initially loading
    expect(result.current.loading).toBe(true)
    expect(result.current.pdc).toBeUndefined()

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // After load
    expect(result.current.pdc).toBeTruthy()
    expect(result.current.error).toBeNull()
  })
})
