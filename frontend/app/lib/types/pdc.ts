/**
 * PDC Module TypeScript Types
 * Defines all interfaces for the curriculum planning system
 */

// MESCP Row - Core curriculum unit
export interface MESCPRow {
  id: string;
  pdc_id: string;
  objetivo: string; // Learning objective
  contenidos: string; // Content topics
  momentos: string; // Instructional phases (Inicio/Desarrollo/Cierre)
  recursos: string; // Resources needed
  periodos: number; // Duration in weeks
  criterios: string; // Assessment criteria
  created_at?: string;
  updated_at?: string;
}

// Main PDC document
export interface PDC {
  id: string;
  name: string;
  subject: string;
  grade_level: string;
  trimester?: string;
  mescp_rows: MESCPRow[];
  adaptaciones: Adaptation[];
  inteligencias: MultipleIntelligence[];
  productos: Product[];
  version: number;
  created_at: string;
  updated_at: string;
}

// Neuroinclusive adaptations for 4 profiles
export interface Adaptation {
  id: string;
  pdc_id: string;
  profile: 'dislexia' | 'adhd' | 'tea' | 'dyscalculia';
  content: string; // Adapted content text
  approved: boolean;
  created_at: string;
  updated_at?: string;
  ai_confidence_score?: number;
}

// Multiple intelligences framework
export interface MultipleIntelligence {
  type: string; // e.g., "Lingüística", "Lógico-matemática", etc.
  description?: string;
  selected?: boolean;
}

// Student learning products/outputs
export interface Product {
  type: string; // e.g., "Ensayo", "Proyecto", "Presentación"
  description?: string;
}

// MESCP Row mutation request
export interface CreateMESCPRowRequest {
  objetivo: string;
  contenidos: string;
  momentos: string;
  recursos: string;
  periodos: number;
  criterios: string;
}

// Update MESCP Row request
export interface UpdateMESCPRowRequest extends Partial<CreateMESCPRowRequest> {}

// Request adaptations for a profile
export interface RequestAdaptationsRequest {
  profile: 'dislexia' | 'adhd' | 'tea' | 'dyscalculia';
}

// API Response wrapper
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

// List response with items
export interface ListResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}
