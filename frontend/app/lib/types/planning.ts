/**
 * Planning Module TypeScript Types
 * Defines all interfaces for weekly planning and moment-based instruction
 */

// Momento - Instructional phase (Inicio, Desarrollo, Cierre)
export interface Momento {
  id: string;
  week_id: string;
  order: 1 | 2 | 3; // Position in sequence
  nombre: 'Inicio' | 'Desarrollo' | 'Cierre'; // Phase name
  duration_minutes: number; // Instructional time
  content_text: string; // Main content (accepts markdown/rich text)
  recursos: string[]; // List of required resources/materials
  evaluacion: string; // Assessment/evaluation strategy
  created_at?: string;
  updated_at?: string;
}

// Micro-objetivo - Learning objective that can be verified
export interface MicroObjetivo {
  id: string;
  week_id: string;
  texto: string; // Objective description
  verificable: string; // How to verify achievement
  completado: boolean; // Completion status
  prioridad: 'baja' | 'normal' | 'alta'; // Priority level
  depende_de: string[]; // IDs of objectives this depends on
  created_at?: string;
  updated_at?: string;
}

// Week - Weekly planning unit
export interface Week {
  id: string;
  pdc_id: string;
  number: number; // Week 15-30 (or custom range)
  subject: string; // Subject name
  grade_level: string; // Grade/level
  status: 'draft' | 'published' | 'completed'; // Publication state
  momentos: Momento[]; // Array of 3 momentos (Inicio, Desarrollo, Cierre)
  micro_objetivos?: MicroObjetivo[]; // Associated learning objectives
  created_at: string;
  updated_at: string;
}

// Calendar event - School calendar item
export interface CalendarEvent {
  date: string; // ISO 8601 date
  week_number: number; // Associated week (nullable for holidays)
  event_name: string; // Event title
  event_type: 'vacation' | 'holiday' | 'event'; // Event classification
}

// Request to generate weekly plans
export interface GenerateWeekRequest {
  pdc_id: string;
  week_number: number;
  profile_overrides?: {
    grade_level?: string;
    // Other profile customizations
  };
}

// Job status tracking for async generation
export interface GenerationJob {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  current_week?: number; // Currently processing week
  total_weeks: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

// Request to start batch generation
export interface StartGenerationRequest {
  pdc_id: string;
  profile_overrides?: {
    grade_level?: string;
  };
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

// Update Week request
export interface UpdateWeekRequest {
  subject?: string;
  grade_level?: string;
  status?: 'draft' | 'published' | 'completed';
}

// Create/Update Momento request
export interface CreateMomentoRequest {
  nombre: 'Inicio' | 'Desarrollo' | 'Cierre';
  duration_minutes: number;
  content_text: string;
  recursos: string[];
  evaluacion: string;
}

export interface UpdateMomentoRequest extends Partial<CreateMomentoRequest> {}

// Copy week request
export interface CopyWeekRequest {
  source_week_id: string;
  target_week_id: string;
}
