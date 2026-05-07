// Zustand store for PDC state management
import { create } from 'zustand';
import { MESCPRow, Adaptation } from '@/app/lib/types/pdc';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// TypeScript interfaces
interface PDCLesson {
  id?: string;
  title: string;
  duration_minutes: number;
  learning_objectives: string[];
  assessment_strategy?: string;
  materials: string[];
}

interface PDCUnit {
  id?: string;
  title: string;
  duration_days: number;
  lessons: PDCLesson[];
  learning_objectives: string[];
  assessment_strategy?: string;
}

interface PDCContent {
  units: PDCUnit[];
  general_objectives: string[];
  assessment_methods: string[];
  resources: Record<string, unknown>;
}

interface PDC {
  id: number;
  title: string;
  subject: string;
  grade_level: string;
  content: PDCContent;
  trimester?: string;
  version: number;
  created_at: string;
  updated_at: string;
}

interface PDCAdaptation {
  id: number;
  profile: string;
  content_section: string;
  original_content: Record<string, unknown>;
  adapted_content: Record<string, unknown>;
  ai_confidence_score: number;
  teacher_approved: boolean;
  created_at: string;
  rejection_reason?: string;
  teacher_feedback?: string;
}

interface PDCStore {
  // State
  pdcs: PDC[];
  currentPDC: PDC | null;
  selectedPDCId: string | null;
  selected_pdc_id: string | null; // For planning module
  selectedProfiles: string[];
  mescp_rows: MESCPRow[];
  adaptations: Adaptation[];
  loading: boolean;
  adaptationsLoading: boolean;
  error: string | null;

  // Actions - CRUD
  fetchPDCs: (filters?: {
    subject?: string;
    grade_level?: string;
    trimester?: string;
  }) => Promise<void>;
  fetchPDC: (id: number) => Promise<void>;
  createPDC: (data: Omit<PDC, 'id' | 'version' | 'created_at' | 'updated_at'>) => Promise<PDC>;
  updatePDC: (id: number, data: Partial<PDC>) => Promise<void>;
  deletePDC: (id: number) => Promise<void>;

  // MESCP Rows
  loadMESCPRows: (pdc_id: string | number) => Promise<void>;
  addMESCPRow: (pdc_id: string | number, data: Record<string, unknown>) => Promise<void>;
  updateMESCPRow: (pdc_id: string | number, row_id: string, data: Record<string, unknown>) => Promise<void>;
  deleteMESCPRow: (pdc_id: string | number, row_id: string) => Promise<void>;

  // Adaptations
  loadAdaptations: (pdc_id: string | number) => Promise<void>;
  requestAdaptations: (pdc_id: number, request: {
    profiles: string[];
    content_type: string;
    content_sections: Record<string, string>;
    context?: Record<string, unknown>;
  }) => Promise<void>;
  approveAdaptation: (pdc_id: number, adaptation_id: number, feedback?: string) => Promise<void>;
  rejectAdaptation: (pdc_id: number, adaptation_id: number, reason?: string, feedback?: string) => Promise<void>;

  // UI State
  setSelectedPDCId: (id: string | null) => void;
  setSelectedPlanningPDCId: (id: string | null) => void; // For planning module
  setSelectedProfiles: (profiles: string[]) => void;
  clearCurrentPDC: () => void;
  clearError: () => void;
}

// Helper to get token safely
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
};

// Helper to check if client-side
const isClient = (): boolean => typeof window !== 'undefined';

export const usePDCStore = create<PDCStore>((set, get) => ({
  // Initial state
  pdcs: [],
  currentPDC: null,
  selectedPDCId: null,
  selected_pdc_id: null,
  selectedProfiles: [],
  mescp_rows: [],
  adaptations: [],
  loading: false,
  adaptationsLoading: false,
  error: null,

  // Fetch all PDCs
  fetchPDCs: async (filters) => {
    if (!isClient()) return;
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters?.subject) params.append('subject', filters.subject);
      if (filters?.grade_level) params.append('grade_level', filters.grade_level);
      if (filters?.trimester) params.append('trimester', filters.trimester);

      const token = getToken();
      const response = await fetch(
        `${API_URL}/api/pdc/?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token || ''}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('access_token');
          window.location.href = '/login';
        }
        throw new Error('Failed to fetch PDCs');
      }

      const data = await response.json();
      set({ pdcs: data.items || data, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch PDCs';
      set({ error: message, loading: false });
    }
  },

  // Fetch single PDC with adaptations
  fetchPDC: async (id) => {
    if (!isClient()) return;
    set({ loading: true, error: null });
    try {
      const token = getToken();
      const response = await fetch(
        `${API_URL}/api/pdc/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${token || ''}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('access_token');
          window.location.href = '/login';
        }
        throw new Error('Failed to fetch PDC');
      }

      const data = await response.json();
      set({ currentPDC: data, loading: false, selectedPDCId: data.id?.toString() });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch PDC';
      set({ error: message, loading: false, currentPDC: null });
    }
  },

  // Create new PDC
  createPDC: async (data) => {
    if (!isClient()) throw new Error('Must be called client-side');
    set({ loading: true, error: null });
    try {
      const token = getToken();
      const response = await fetch(
        `${API_URL}/api/pdc/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('access_token');
          window.location.href = '/login';
        }
        throw new Error('Failed to create PDC');
      }

      const newPDC = await response.json();
      set((state) => ({
        pdcs: [...state.pdcs, newPDC],
        currentPDC: newPDC,
        loading: false,
        selectedPDCId: newPDC.id?.toString(),
      }));

      return newPDC;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create PDC';
      set({ error: message, loading: false });
      throw error;
    }
  },

  // Update PDC
  updatePDC: async (id, data) => {
    if (!isClient()) return;
    set({ loading: true, error: null });
    try {
      const token = getToken();
      const response = await fetch(
        `${API_URL}/api/pdc/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('access_token');
          window.location.href = '/login';
        }
        throw new Error('Failed to update PDC');
      }

      const updated = await response.json();
      set((state) => ({
        pdcs: state.pdcs.map((p) => (p.id === id ? updated : p)),
        currentPDC: state.currentPDC?.id === id ? updated : state.currentPDC,
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update PDC';
      set({ error: message, loading: false });
    }
  },

  // Delete PDC
  deletePDC: async (id) => {
    if (!isClient()) return;
    set({ loading: true, error: null });
    try {
      const token = getToken();
      const response = await fetch(
        `${API_URL}/api/pdc/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token || ''}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('access_token');
          window.location.href = '/login';
        }
        throw new Error('Failed to delete PDC');
      }

      set((state) => ({
        pdcs: state.pdcs.filter((p) => p.id !== id),
        currentPDC: state.currentPDC?.id === id ? null : state.currentPDC,
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete PDC';
      set({ error: message, loading: false });
    }
  },

  // Load MESCP rows
  loadMESCPRows: async (pdc_id: string | number) => {
    if (!isClient()) return;
    set({ loading: true, error: null });
    try {
      const token = getToken();
      const response = await fetch(
        `${API_URL}/api/pdc/${pdc_id}/mescp/rows`,
        {
          headers: {
            'Authorization': `Bearer ${token || ''}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to load MESCP rows');
      const data = await response.json();
      set({ mescp_rows: data.items || data, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load MESCP rows';
      set({ error: message, loading: false });
    }
  },

  // Add MESCP row
  addMESCPRow: async (pdc_id: string | number, data: Record<string, unknown>) => {
    if (!isClient()) return;
    set({ loading: true, error: null });
    try {
      const token = getToken();
      const response = await fetch(
        `${API_URL}/api/pdc/${pdc_id}/mescp/rows`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) throw new Error('Failed to add MESCP row');
      const newRow = await response.json();
      set((state) => ({
        mescp_rows: [...state.mescp_rows, newRow],
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add MESCP row';
      set({ error: message, loading: false });
    }
  },

  // Update MESCP row
  updateMESCPRow: async (pdc_id: string | number, row_id: string, data: Record<string, unknown>) => {
    if (!isClient()) return;
    set({ loading: true, error: null });
    try {
      const token = getToken();
      const response = await fetch(
        `${API_URL}/api/pdc/${pdc_id}/mescp/rows/${row_id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) throw new Error('Failed to update MESCP row');
      const updated = await response.json();
      set((state) => ({
        mescp_rows: state.mescp_rows.map((r) => (r.id === row_id ? updated : r)),
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update MESCP row';
      set({ error: message, loading: false });
    }
  },

  // Delete MESCP row
  deleteMESCPRow: async (pdc_id: string | number, row_id: string) => {
    if (!isClient()) return;
    set({ loading: true, error: null });
    try {
      const token = getToken();
      const response = await fetch(
        `${API_URL}/api/pdc/${pdc_id}/mescp/rows/${row_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token || ''}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to delete MESCP row');
      set((state) => ({
        mescp_rows: state.mescp_rows.filter((r) => r.id !== row_id),
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete MESCP row';
      set({ error: message, loading: false });
    }
  },

  // Load adaptations
  loadAdaptations: async (pdc_id: string | number) => {
    if (!isClient()) return;
    set({ adaptationsLoading: true, error: null });
    try {
      const token = getToken();
      const response = await fetch(
        `${API_URL}/api/pdc/${pdc_id}/adaptations`,
        {
          headers: {
            'Authorization': `Bearer ${token || ''}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to load adaptations');
      const data = await response.json();
      set({ adaptations: data.items || data, adaptationsLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load adaptations';
      set({ error: message, adaptationsLoading: false });
    }
  },

  // Request AI adaptations
  requestAdaptations: async (pdc_id, request) => {
    if (!isClient()) return;
    set({ adaptationsLoading: true, error: null });
    try {
      const token = getToken();
      const response = await fetch(
        `${API_URL}/api/pdc/${pdc_id}/adapt`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`,
          },
          body: JSON.stringify(request),
        }
      );

      if (!response.ok) throw new Error('Failed to request adaptations');
      set({ adaptationsLoading: false });
      setTimeout(() => {
        const state = get();
        if (state.currentPDC?.id === pdc_id) {
          state.loadAdaptations(pdc_id);
        }
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to request adaptations';
      set({ error: message, adaptationsLoading: false });
    }
  },

  // Approve adaptation
  approveAdaptation: async (pdc_id, adaptation_id, feedback) => {
    if (!isClient()) return;
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (feedback) params.append('feedback', feedback);
      const token = getToken();
      const response = await fetch(
        `${API_URL}/api/pdc/${pdc_id}/adaptations/${adaptation_id}/approve?${params.toString()}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token || ''}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to approve adaptation');
      set({ loading: false });
      const state = get();
      if (state.currentPDC?.id === pdc_id) {
        await state.loadAdaptations(pdc_id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve adaptation';
      set({ error: message, loading: false });
    }
  },

  // Reject adaptation
  rejectAdaptation: async (pdc_id, adaptation_id, reason, feedback) => {
    if (!isClient()) return;
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (reason) params.append('reason', reason);
      if (feedback) params.append('feedback', feedback);
      const token = getToken();
      const response = await fetch(
        `${API_URL}/api/pdc/${pdc_id}/adaptations/${adaptation_id}/reject?${params.toString()}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token || ''}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to reject adaptation');
      set({ loading: false });
      const state = get();
      if (state.currentPDC?.id === pdc_id) {
        await state.loadAdaptations(pdc_id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reject adaptation';
      set({ error: message, loading: false });
    }
  },

  // UI actions
  setSelectedPDCId: (id: string | null) => {
    set({ selectedPDCId: id });
  },

  setSelectedPlanningPDCId: (id: string | null) => {
    set({ selected_pdc_id: id });
  },

  setSelectedProfiles: (profiles: string[]) => {
    set({ selectedProfiles: profiles });
  },

  clearCurrentPDC: () => {
    set({ currentPDC: null, selectedPDCId: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));
