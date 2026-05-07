/**
 * Export & Branding TypeScript Types
 * Defines interfaces for export functionality and school branding
 */

// Supported export formats
export type ExportFormat = 'docx' | 'xlsx' | 'pdf' | 'zip';

// Status of an export job
export type ExportStatus = 'queued' | 'processing' | 'complete' | 'failed';

// Export job representation
export interface ExportJob {
  id: string;
  pdc_id: string;
  format: ExportFormat;
  status: ExportStatus;
  progress: number; // 0-100
  file_url?: string; // Available when status=complete
  error_message?: string; // Present when status=failed
  created_at: string;
  updated_at: string;
  completed_at?: string;
  file_size_bytes?: number; // File size in bytes when complete
}

// School branding configuration
export interface BrandingConfig {
  id?: string;
  school_name: string;
  logo_url: string;
  header_color: string; // Hex color: #RRGGBB
  footer_color: string; // Hex color: #RRGGBB
  primary_font: string; // Font family name
  footer_text: string; // Footer text/copyright
}

// Export request payload
export interface ExportRequest {
  pdc_id: string;
  format: ExportFormat;
  include_adaptations: boolean;
  include_micro_objetivos: boolean;
  branding_id?: string; // Optional branding config ID
}

// Export API response for job creation
export interface ExportJobResponse {
  job_id: string;
  status: ExportStatus;
  eta?: number; // Estimated time in seconds
}

// Batch export request
export interface BatchExportRequest {
  pdc_ids: string[];
  format: ExportFormat;
}

// File download response (metadata)
export interface FileDownloadMetadata {
  filename: string;
  file_size_bytes: number;
  mime_type: string;
  created_at: string;
}
