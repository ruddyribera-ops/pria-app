/**
 * Planning Store - Zustand state management
 * Manages weekly plans, calendar, generation jobs, and UI state
 */

import { create } from 'zustand';
import {
  Week,
  CalendarEvent,
  GenerationJob,
  StartGenerationRequest,
} from '@/app/lib/types/planning';
import * as planningApi from '@/app/lib/api/planning';

interface PlanningStore {
  // State
  calendar: CalendarEvent[];
  weeks: Week[];
  selectedWeekId: string | null;
  generationJob: GenerationJob | null;
  loading: boolean;
  error: string | null;
  jobPollingInterval: NodeJS.Timeout | null;

  // Actions - Calendar
  loadCalendar: () => Promise<void>;

  // Actions - Weeks
  loadWeeks: (pdc_id: string) => Promise<void>;
  setSelectedWeekId: (week_id: string | null) => void;
  getWeekById: (week_id: string) => Week | undefined;

  // Actions - Generation Job
  startGeneration: (
    pdc_id: string,
    overrides?: StartGenerationRequest['profile_overrides']
  ) => Promise<void>;
  pollGenerationJob: () => Promise<void>;
  stopPolling: () => void;
  clearGenerationJob: () => void;

  // Utils
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const usePlanningStore = create<PlanningStore>((set, get) => ({
  // Initial state
  calendar: [],
  weeks: [],
  selectedWeekId: null,
  generationJob: null,
  loading: false,
  error: null,
  jobPollingInterval: null,

  // Load calendar (runs once on app start)
  loadCalendar: async () => {
    set({ loading: true, error: null });
    try {
      const calendar = await planningApi.getCalendar();
      set({ calendar, loading: false });
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to load calendar';
      set({ error: errorMsg, loading: false });
    }
  },

  // Load all weeks for a PDC
  loadWeeks: async (pdc_id: string) => {
    set({ loading: true, error: null });
    try {
      const weeks = await planningApi.getWeeklyPlans(pdc_id);
      set({ weeks, loading: false });
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to load weekly plans';
      set({ error: errorMsg, loading: false });
    }
  },

  // Set selected week for detail view
  setSelectedWeekId: (week_id: string | null) => {
    set({ selectedWeekId: week_id });
  },

  // Utility to get week by ID
  getWeekById: (week_id: string) => {
    const state = get();
    return state.weeks.find((w) => w.id === week_id);
  },

  // Start async generation of all weeks
  startGeneration: async (
    pdc_id: string,
    overrides?: StartGenerationRequest['profile_overrides']
  ) => {
    set({ loading: true, error: null });
    try {
      const job = await planningApi.generateWeeklyPlans(pdc_id, {
        pdc_id,
        profile_overrides: overrides,
      });
      set({ generationJob: job, loading: false });

      // Start polling immediately
      // We'll manually call pollGenerationJob on interval (see useWeeklyPlan hook)
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to start generation';
      set({ error: errorMsg, loading: false });
    }
  },

  // Poll job status (called every 2s from useWeeklyPlan hook)
  pollGenerationJob: async () => {
    const state = get();
    if (!state.generationJob) return;

    try {
      // Extract pdc_id from weeks or from context
      // For now, we'll need to pass it from the component
      // This is handled better in the hook
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to poll job status';
      set({ error: errorMsg });
    }
  },

  // Stop polling
  stopPolling: () => {
    const state = get();
    if (state.jobPollingInterval) {
      clearInterval(state.jobPollingInterval);
      set({ jobPollingInterval: null });
    }
  },

  // Clear generation job
  clearGenerationJob: () => {
    set({ generationJob: null });
    get().stopPolling();
  },

  // Utility setters
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
  clearError: () => set({ error: null }),
}));
