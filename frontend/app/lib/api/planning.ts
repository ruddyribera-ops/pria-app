/**
 * Planning Module API Client
 * Handles all HTTP calls for weekly planning functionality
 */

import apiClient from './client';
import {
  Week,
  CalendarEvent,
  Momento,
  StartGenerationRequest,
  UpdateWeekRequest,
  CreateMomentoRequest,
  UpdateMomentoRequest,
  GenerationJob,
  ApiResponse,
} from '@/app/lib/types/planning';

/**
 * GET /api/planning/calendar
 * Fetch the school calendar with vacation/holiday marks and week associations
 */
export async function getCalendar(): Promise<CalendarEvent[]> {
  try {
    const response = await apiClient.get<ApiResponse<CalendarEvent[]>>(
      '/api/planning/calendar'
    );
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch calendar:', error);
    throw error;
  }
}

/**
 * GET /api/planning/pdc/{pdc_id}/weeks
 * Get all weekly plans for a PDC
 */
export async function getWeeklyPlans(pdc_id: string): Promise<Week[]> {
  try {
    const response = await apiClient.get<ApiResponse<Week[]>>(
      `/api/planning/pdc/${pdc_id}/weeks`
    );
    return response.data.data;
  } catch (error) {
    console.error(`Failed to fetch weekly plans for PDC ${pdc_id}:`, error);
    throw error;
  }
}

/**
 * POST /api/planning/pdc/{pdc_id}/auto-generate
 * Start async generation of weekly plans from PDC
 * Returns job_id for polling
 */
export async function generateWeeklyPlans(
  pdc_id: string,
  request?: StartGenerationRequest
): Promise<GenerationJob> {
  try {
    const response = await apiClient.post<ApiResponse<GenerationJob>>(
      `/api/planning/pdc/${pdc_id}/auto-generate`,
      request || { pdc_id }
    );
    return response.data.data;
  } catch (error) {
    console.error(`Failed to start generation for PDC ${pdc_id}:`, error);
    throw error;
  }
}

/**
 * GET /api/planning/pdc/{pdc_id}/auto-generate/{job_id}
 * Poll job status during async generation
 */
export async function getGenerationJobStatus(
  pdc_id: string,
  job_id: string
): Promise<GenerationJob> {
  try {
    const response = await apiClient.get<ApiResponse<GenerationJob>>(
      `/api/planning/pdc/${pdc_id}/auto-generate/${job_id}`
    );
    return response.data.data;
  } catch (error) {
    console.error(
      `Failed to fetch job status for ${job_id}:`,
      error
    );
    throw error;
  }
}

/**
 * GET /api/planning/week/{week_id}
 * Fetch a single week with all momentos and objectives
 */
export async function getWeek(week_id: string): Promise<Week> {
  try {
    const response = await apiClient.get<ApiResponse<Week>>(
      `/api/planning/week/${week_id}`
    );
    return response.data.data;
  } catch (error) {
    console.error(`Failed to fetch week ${week_id}:`, error);
    throw error;
  }
}

/**
 * PUT /api/planning/week/{week_id}
 * Update week metadata (subject, grade_level, status)
 */
export async function updateWeek(
  week_id: string,
  data: UpdateWeekRequest
): Promise<Week> {
  try {
    const response = await apiClient.put<ApiResponse<Week>>(
      `/api/planning/week/${week_id}`,
      data
    );
    return response.data.data;
  } catch (error) {
    console.error(`Failed to update week ${week_id}:`, error);
    throw error;
  }
}

/**
 * POST /api/planning/week/{week_id}/momentos
 * Add a new momento to a week
 */
export async function addMomento(
  week_id: string,
  data: CreateMomentoRequest
): Promise<Momento> {
  try {
    const response = await apiClient.post<ApiResponse<Momento>>(
      `/api/planning/week/${week_id}/momentos`,
      data
    );
    return response.data.data;
  } catch (error) {
    console.error(`Failed to add momento to week ${week_id}:`, error);
    throw error;
  }
}

/**
 * PUT /api/planning/week/{week_id}/momentos/{momento_id}
 * Update a specific momento
 */
export async function updateMomento(
  week_id: string,
  momento_id: string,
  data: UpdateMomentoRequest
): Promise<Momento> {
  try {
    const response = await apiClient.put<ApiResponse<Momento>>(
      `/api/planning/week/${week_id}/momentos/${momento_id}`,
      data
    );
    return response.data.data;
  } catch (error) {
    console.error(
      `Failed to update momento ${momento_id} in week ${week_id}:`,
      error
    );
    throw error;
  }
}

/**
 * DELETE /api/planning/week/{week_id}/momentos/{momento_id}
 * Soft delete a momento
 */
export async function deleteMomento(
  week_id: string,
  momento_id: string
): Promise<void> {
  try {
    await apiClient.delete(
      `/api/planning/week/${week_id}/momentos/${momento_id}`
    );
  } catch (error) {
    console.error(
      `Failed to delete momento ${momento_id} from week ${week_id}:`,
      error
    );
    throw error;
  }
}

/**
 * POST /api/planning/week/{source_week_id}/copy-to/{target_week_id}
 * Copy one week's content to another week
 */
export async function copyWeek(
  source_week_id: string,
  target_week_id: string
): Promise<Week> {
  try {
    const response = await apiClient.post<ApiResponse<Week>>(
      `/api/planning/week/${source_week_id}/copy-to/${target_week_id}`
    );
    return response.data.data;
  } catch (error) {
    console.error(
      `Failed to copy week ${source_week_id} to ${target_week_id}:`,
      error
    );
    throw error;
  }
}
