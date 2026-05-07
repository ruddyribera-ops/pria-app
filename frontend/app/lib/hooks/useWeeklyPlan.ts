/**
 * useWeeklyPlan - Custom hook for managing weekly plans
 * Handles data loading, polling, and error retry logic
 */

import { useEffect, useRef } from 'react';
import { usePlanningStore } from '@/app/store/planningStore';
import * as planningApi from '@/app/lib/api/planning';

interface UseWeeklyPlanOptions {
  pdc_id?: string;
  auto_load_calendar?: boolean;
}

export function useWeeklyPlan(options: UseWeeklyPlanOptions = {}) {
  const {
    pdc_id,
    auto_load_calendar = true,
  } = options;

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Get store state and actions
  const {
    weeks,
    calendar,
    loading,
    error,
    generationJob,
    loadCalendar,
    loadWeeks,
    setError,
    clearError,
    setLoading,
    stopPolling,
    clearGenerationJob,
  } = usePlanningStore();

  // Load calendar on mount
  useEffect(() => {
    if (auto_load_calendar && calendar.length === 0) {
      loadCalendar().catch((err) => {
        console.error('Failed to load calendar:', err);
      });
    }
  }, [auto_load_calendar, calendar.length, loadCalendar]);

  // Load weeks when pdc_id changes
  useEffect(() => {
    if (pdc_id) {
      loadWeeks(pdc_id).catch((err) => {
        console.error('Failed to load weeks:', err);
      });
    }
  }, [pdc_id, loadWeeks]);

  // Poll generation job status every 2 seconds
  useEffect(() => {
    if (!generationJob || !pdc_id) return;

    // Clear any existing interval
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    // Poll job status
    const pollJob = async () => {
      try {
        const updated = await planningApi.getGenerationJobStatus(
          pdc_id,
          generationJob.job_id
        );

        usePlanningStore.setState({ generationJob: updated });

        // If complete or failed, stop polling
        if (
          updated.status === 'completed' ||
          updated.status === 'failed'
        ) {
          if (updated.status === 'completed') {
            // Reload weeks to show generated content
            await loadWeeks(pdc_id);
            clearGenerationJob();
          } else {
            setError(updated.error_message || 'Generation failed');
          }
          stopPolling();
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Polling failed';
        setError(errorMsg);
      }
    };

    // Start polling immediately
    pollJob();

    // Then poll every 2 seconds
    pollingRef.current = setInterval(pollJob, 2000);

    // Cleanup on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [generationJob, pdc_id, loadWeeks, setError, clearGenerationJob, stopPolling]);

  // Update week helper
  const updateWeek = async (week_id: string, data: any) => {
    try {
      setLoading(true);
      clearError();
      const updated = await planningApi.updateWeek(week_id, data);

      // Update local state
      usePlanningStore.setState((state) => ({
        weeks: state.weeks.map((w) =>
          w.id === week_id ? updated : w
        ),
      }));

      return updated;
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to update week';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update momento helper
  const updateMomento = async (
    week_id: string,
    momento_id: string,
    data: any
  ) => {
    try {
      setLoading(true);
      clearError();
      const updated = await planningApi.updateMomento(
        week_id,
        momento_id,
        data
      );

      // Update local state
      usePlanningStore.setState((state) => ({
        weeks: state.weeks.map((w) =>
          w.id === week_id
            ? {
                ...w,
                momentos: w.momentos.map((m) =>
                  m.id === momento_id ? updated : m
                ),
              }
            : w
        ),
      }));

      return updated;
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to update momento';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  return {
    weeks,
    calendar,
    loading,
    error,
    generationJob,
    loadWeeks,
    updateWeek,
    updateMomento,
    clearError,
    setError,
  };
}
