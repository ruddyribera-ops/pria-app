/**
 * Export API Client
 * Handles all export and branding API calls
 */

import apiClient from './client';
import {
  ExportJob,
  ExportRequest,
  ExportJobResponse,
  BatchExportRequest,
  BrandingConfig,
  FileDownloadMetadata,
} from '@/app/lib/types/export';

const EXPORT_API = '/api/export';
const BRANDING_API = '/api/branding';

/**
 * Export a single PDC to the specified format
 */
export async function exportPDC(
  pdc_id: string,
  format: 'docx' | 'xlsx' | 'pdf' | 'zip',
  branding_id?: string
): Promise<ExportJobResponse> {
  try {
    const payload: ExportRequest = {
      pdc_id,
      format,
      include_adaptations: true,
      include_micro_objetivos: true,
      branding_id,
    };

    const response = await apiClient.post(`${EXPORT_API}/pdc`, payload);
    return response.data.data;
  } catch (error) {
    console.error('Error exporting PDC:', error);
    throw error;
  }
}

/**
 * Export multiple PDCs as a batch
 */
export async function exportBatch(
  pdc_ids: string[],
  format: 'docx' | 'xlsx' | 'pdf' | 'zip'
): Promise<ExportJobResponse> {
  try {
    const payload: BatchExportRequest = {
      pdc_ids,
      format,
    };

    const response = await apiClient.post(`${EXPORT_API}/batch`, payload);
    return response.data.data;
  } catch (error) {
    console.error('Error exporting batch:', error);
    throw error;
  }
}

/**
 * Get the status and details of an export job
 */
export async function getExportJob(job_id: string): Promise<ExportJob> {
  try {
    const response = await apiClient.get(`${EXPORT_API}/${job_id}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching export job:', error);
    throw error;
  }
}

/**
 * Download an exported file (triggers browser download)
 */
export async function downloadExport(job_id: string): Promise<void> {
  try {
    const response = await apiClient.get(`${EXPORT_API}/${job_id}/download`, {
      responseType: 'blob',
    });

    // Get filename from Content-Disposition header if available
    const contentDisposition = response.headers['content-disposition'];
    let filename = `export_${job_id}`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    // Create blob URL and trigger download
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading export:', error);
    throw error;
  }
}

/**
 * Cancel an in-progress export job
 */
export async function cancelExport(job_id: string): Promise<void> {
  try {
    await apiClient.delete(`${EXPORT_API}/${job_id}`);
  } catch (error) {
    console.error('Error cancelling export:', error);
    throw error;
  }
}

/**
 * Get current school branding configuration
 */
export async function getBranding(): Promise<BrandingConfig> {
  try {
    const response = await apiClient.get(`${BRANDING_API}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching branding:', error);
    throw error;
  }
}

/**
 * Update school branding configuration (admin only)
 */
export async function updateBranding(config: BrandingConfig): Promise<BrandingConfig> {
  try {
    const response = await apiClient.put(`${BRANDING_API}`, config);
    return response.data.data;
  } catch (error) {
    console.error('Error updating branding:', error);
    throw error;
  }
}

/**
 * Get list of available export jobs for current user
 */
export async function getExportJobs(): Promise<ExportJob[]> {
  try {
    const response = await apiClient.get(`${EXPORT_API}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching export jobs:', error);
    throw error;
  }
}

/**
 * Start a new export job (alias for exportPDC for consistency with store)
 */
export async function startExport(
  pdc_id: string,
  format: 'docx' | 'xlsx' | 'pdf' | 'zip',
  branding_id?: string
): Promise<ExportJobResponse> {
  return exportPDC(pdc_id, format, branding_id);
}
