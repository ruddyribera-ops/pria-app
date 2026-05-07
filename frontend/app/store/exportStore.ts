/**
 * Export Store (Zustand)
 * Manages export job state, polling, and branding configuration
 */

import { create } from 'zustand';
import { ExportJob, BrandingConfig, ExportStatus } from '@/app/lib/types/export';
import {
  getExportJob,
  getExportJobs,
  getBranding,
  startExport,
  cancelExport as cancelExportAPI,
} from '@/app/lib/api/export';

// Polling interval in milliseconds
const POLL_INTERVAL = 2000; // 2 seconds

// Time to keep completed jobs visible in UI (milliseconds)
const AUTO_REMOVE_DELAY = 5 * 60 * 1000; // 5 minutes

interface ExportStore {
  // State
  exportJobs: ExportJob[];
  currentJobId: string | null;
  branding: BrandingConfig | null;
  loading: boolean;
  error: string | null;

  // Actions
  setCurrentJobId: (jobId: string | null) => void;
  setBranding: (config: BrandingConfig) => void;
  addExportJob: (job: ExportJob) => void;
  updateExportJob: (job: ExportJob) => void;
  removeExportJob: (jobId: string) => void;
  setError: (error: string | null) => void;

  // Async actions
  loadExportJobs: (userId?: string) => Promise<void>;
  loadBranding: () => Promise<void>;
  startExport: (pdc_id: string, format: 'docx' | 'xlsx' | 'pdf' | 'zip', branding_id?: string) => Promise<string>;
  pollJobStatus: (jobId: string) => void;
  stopPolling: (jobId: string) => void;
  cancelExport: (jobId: string) => Promise<void>;

  // Internal polling state
  _pollingIntervals: Map<string, NodeJS.Timeout>;
}

export const useExportStore = create<ExportStore>((set, get) => ({
  // Initial state
  exportJobs: [],
  currentJobId: null,
  branding: null,
  loading: false,
  error: null,
  _pollingIntervals: new Map(),

  // State setters
  setCurrentJobId: (jobId) => set({ currentJobId: jobId }),

  setBranding: (config) => set({ branding: config }),

  addExportJob: (job) =>
    set((state) => {
      const exists = state.exportJobs.some((j) => j.id === job.id);
      return {
        exportJobs: exists ? state.exportJobs : [job, ...state.exportJobs],
      };
    }),

  updateExportJob: (job) =>
    set((state) => ({
      exportJobs: state.exportJobs.map((j) => (j.id === job.id ? job : j)),
    })),

  removeExportJob: (jobId) =>
    set((state) => ({
      exportJobs: state.exportJobs.filter((j) => j.id !== jobId),
    })),

  setError: (error) => set({ error }),

  // Async: Load all export jobs for user
  loadExportJobs: async (userId?: string) => {
    set({ loading: true, error: null });
    try {
      const jobs = await getExportJobs();
      set({ exportJobs: jobs, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load export jobs';
      set({ error: message, loading: false });
    }
  },

  // Async: Load branding configuration
  loadBranding: async () => {
    try {
      const config = await getBranding();
      set({ branding: config });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load branding';
      set({ error: message });
    }
  },

  // Async: Start a new export
  startExport: async (pdc_id, format, branding_id?) => {
    set({ error: null });
    try {
      const { job_id } = await startExport(pdc_id, format, branding_id);

      // Create initial job object
      const initialJob: ExportJob = {
        id: job_id,
        pdc_id,
        format,
        status: 'queued',
        progress: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      get().addExportJob(initialJob);
      get().setCurrentJobId(job_id);

      // Start polling job status
      get().pollJobStatus(job_id);

      return job_id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start export';
      set({ error: message });
      throw error;
    }
  },

  // Polling: Fetch job status periodically
  pollJobStatus: (jobId) => {
    const state = get();

    // Clear any existing interval for this job
    if (state._pollingIntervals.has(jobId)) {
      clearInterval(state._pollingIntervals.get(jobId)!);
    }

    // Initial fetch
    const fetchStatus = async () => {
      try {
        const job = await getExportJob(jobId);
        get().updateExportJob(job);

        // Show toast on completion
        if (job.status === 'complete') {
          // Stop polling
          get().stopPolling(jobId);

          // Show toast (can integrate with toast library)
          console.log('Export ready for download:', job.file_url);

          // Auto-remove after 5 minutes
          setTimeout(() => {
            get().removeExportJob(jobId);
          }, AUTO_REMOVE_DELAY);
        } else if (job.status === 'failed') {
          // Stop polling on failure
          get().stopPolling(jobId);
        }
      } catch (error) {
        console.error('Error polling export job:', error);
        // Continue polling even on error
      }
    };

    // Fetch immediately
    fetchStatus();

    // Set up recurring poll
    const interval = setInterval(fetchStatus, POLL_INTERVAL);
    set((state) => ({
      _pollingIntervals: new Map(state._pollingIntervals).set(jobId, interval),
    }));
  },

  // Stop polling for a job
  stopPolling: (jobId) => {
    const state = get();
    const interval = state._pollingIntervals.get(jobId);
    if (interval) {
      clearInterval(interval);
      const newIntervals = new Map(state._pollingIntervals);
      newIntervals.delete(jobId);
      set({ _pollingIntervals: newIntervals });
    }
  },

  // Async: Cancel an export job
  cancelExport: async (jobId) => {
    try {
      get().stopPolling(jobId);
      await cancelExportAPI(jobId);
      get().removeExportJob(jobId);
      if (get().currentJobId === jobId) {
        get().setCurrentJobId(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel export';
      set({ error: message });
      throw error;
    }
  },
}));
