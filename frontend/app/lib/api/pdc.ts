// PDC API functions
import apiClient from './client';

export interface PDCLesson {
  id?: string;
  title: string;
  duration_minutes: number;
  learning_objectives: string[];
  assessment_strategy?: string;
  materials: string[];
}

export interface PDCUnit {
  id?: string;
  title: string;
  duration_days: number;
  lessons: PDCLesson[];
  learning_objectives: string[];
  assessment_strategy?: string;
}

export interface PDCContent {
  units: PDCUnit[];
  general_objectives: string[];
  assessment_methods: string[];
  resources: Record<string, any>;
}

export interface PDC {
  id: number;
  title: string;
  subject: string;
  grade_level: string;
  content: PDCContent;
  trimester?: string;
  version: number;
  created_at: string;
  updated_at: string;
  adaptations?: PDCAdaptation[];
}

export interface PDCAdaptation {
  id: number;
  profile: string;
  content_section: string;
  original_content: Record<string, any>;
  adapted_content: Record<string, any>;
  ai_confidence_score: number;
  teacher_approved: boolean;
  created_at: string;
  rejection_reason?: string;
  teacher_feedback?: string;
}

export interface AdaptationRequest {
  profiles: string[];
  content_type: string;
  content_sections: Record<string, string>;
  context?: Record<string, any>;
}

// List PDCs with optional filtering
export const listPDCs = async (filters?: {
  subject?: string;
  grade_level?: string;
  trimester?: string;
  skip?: number;
  limit?: number;
}) => {
  const params = new URLSearchParams();
  if (filters?.subject) params.append('subject', filters.subject);
  if (filters?.grade_level) params.append('grade_level', filters.grade_level);
  if (filters?.trimester) params.append('trimester', filters.trimester);
  if (filters?.skip) params.append('skip', filters.skip.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const response = await apiClient.get(`/api/pdc/?${params.toString()}`);
  return response.data;
};

// Create new PDC
export const createPDC = async (data: Omit<PDC, 'id' | 'version' | 'created_at' | 'updated_at'>) => {
  const response = await apiClient.post('/api/pdc/', data);
  return response.data;
};

// Get PDC by ID with adaptations
export const getPDC = async (id: number) => {
  const response = await apiClient.get(`/api/pdc/${id}`);
  return response.data;
};

// Update PDC
export const updatePDC = async (id: number, data: Partial<PDC>) => {
  const response = await apiClient.put(`/api/pdc/${id}`, data);
  return response.data;
};

// Delete PDC
export const deletePDC = async (id: number) => {
  const response = await apiClient.delete(`/api/pdc/${id}`);
  return response.data;
};

// Request AI adaptations for PDC content
export const requestAdaptations = async (pdc_id: number, request: AdaptationRequest) => {
  const response = await apiClient.post(`/api/pdc/${pdc_id}/adapt`, request);
  return response.data;
};

// Get adaptations for PDC with optional filtering
export const getAdaptations = async (pdc_id: number, filters?: {
  profile?: string;
  section?: string;
  approved_only?: boolean;
}) => {
  const params = new URLSearchParams();
  if (filters?.profile) params.append('profile', filters.profile);
  if (filters?.section) params.append('section', filters.section);
  if (filters?.approved_only) params.append('approved_only', 'true');

  const response = await apiClient.get(`/api/pdc/${pdc_id}/adaptations?${params.toString()}`);
  return response.data;
};

// Approve an adaptation
export const approveAdaptation = async (
  pdc_id: number,
  adaptation_id: number,
  feedback?: string
) => {
  const params = new URLSearchParams();
  if (feedback) params.append('feedback', feedback);

  const response = await apiClient.put(
    `/api/pdc/${pdc_id}/adaptations/${adaptation_id}/approve?${params.toString()}`,
    {}
  );
  return response.data;
};

// Reject an adaptation
export const rejectAdaptation = async (
  pdc_id: number,
  adaptation_id: number,
  reason?: string,
  feedback?: string
) => {
  const params = new URLSearchParams();
  if (reason) params.append('reason', reason);
  if (feedback) params.append('feedback', feedback);

  const response = await apiClient.put(
    `/api/pdc/${pdc_id}/adaptations/${adaptation_id}/reject?${params.toString()}`,
    {}
  );
  return response.data;
};

// ========== MESCP Rows ==========

export interface MESCPRow {
  id: string;
  pdc_id: string;
  objetivo: string;
  contenidos: string;
  momentos: string;
  recursos: string;
  periodos: number;
  criterios: string;
  created_at?: string;
  updated_at?: string;
}

// Get MESCP rows for a PDC
export const getMESCPRows = async (pdc_id: string | number) => {
  const response = await apiClient.get(`/api/pdc/${pdc_id}/mescp/rows`);
  return response.data;
};

// Add new MESCP row
export const addMESCPRow = async (
  pdc_id: string | number,
  data: {
    objetivo: string;
    contenidos: string;
    momentos: string;
    recursos: string;
    periodos: number;
    criterios: string;
  }
) => {
  const response = await apiClient.post(`/api/pdc/${pdc_id}/mescp/rows`, data);
  return response.data;
};

// Update MESCP row
export const updateMESCPRow = async (
  pdc_id: string | number,
  row_id: string,
  data: Partial<MESCPRow>
) => {
  const response = await apiClient.put(
    `/api/pdc/${pdc_id}/mescp/rows/${row_id}`,
    data
  );
  return response.data;
};

// Delete MESCP row
export const deleteMESCPRow = async (pdc_id: string | number, row_id: string) => {
  const response = await apiClient.delete(`/api/pdc/${pdc_id}/mescp/rows/${row_id}`);
  return response.data;
};

// ========== Adaptations (Extended) ==========

export interface Adaptation {
  id: string;
  pdc_id: string;
  profile: 'dislexia' | 'adhd' | 'tea' | 'dyscalculia';
  content: string;
  approved: boolean;
  created_at: string;
  ai_confidence_score?: number;
}

// Request adaptations for a specific profile
export const requestAdaptationsForProfile = async (
  pdc_id: string | number,
  profile: 'dislexia' | 'adhd' | 'tea' | 'dyscalculia'
) => {
  const response = await apiClient.post(
    `/api/pdc/${pdc_id}/adaptations/request`,
    { profile }
  );
  return response.data;
};

// Get all adaptations for a PDC
export const getAllAdaptations = async (
  pdc_id: string | number,
  filters?: {
    profile?: 'dislexia' | 'adhd' | 'tea' | 'dyscalculia';
    approved_only?: boolean;
  }
) => {
  const params = new URLSearchParams();
  if (filters?.profile) params.append('profile', filters.profile);
  if (filters?.approved_only) params.append('approved_only', 'true');

  const response = await apiClient.get(
    `/api/pdc/${pdc_id}/adaptations?${params.toString()}`
  );
  return response.data;
};

// Approve an adaptation
export const approveAdaptationByProfile = async (
  pdc_id: string | number,
  adaptation_id: string
) => {
  const response = await apiClient.put(
    `/api/pdc/${pdc_id}/adaptations/${adaptation_id}/approve`,
    {}
  );
  return response.data;
};

// Reject an adaptation
export const rejectAdaptationByProfile = async (
  pdc_id: string | number,
  adaptation_id: string
) => {
  const response = await apiClient.put(
    `/api/pdc/${pdc_id}/adaptations/${adaptation_id}/reject`,
    {}
  );
  return response.data;
};
