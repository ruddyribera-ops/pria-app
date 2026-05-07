/**
 * useExportPolling Hook
 * Custom hook for polling export job status
 */

import { useEffect, useState, useCallback } from 'react';
import { ExportJob } from '@/app/lib/types/export';
import { getExportJob } from '@/app/lib/api/export';

interface UseExportPollingOptions {
  /**
   * Polling interval in milliseconds (default: 2000)
   */
  interval?: number;

  /**
   * Auto-refetch on window focus (default: true)
   */
  refetchOnFocus?: boolean;

  /**
   * Callback when job completes
   */
  onComplete?: (job: ExportJob) => void;

  /**
   * Callback when job fails
   */
  onError?: (error: Error) => void;
}

interface UseExportPollingResult {
  job: ExportJob | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useExportPolling(
  jobId: string | null,
  options: UseExportPollingOptions = {}
): UseExportPollingResult {
  const {
    interval = 2000,
    refetchOnFocus = true,
    onComplete,
    onError,
  } = options;

  const [job, setJob] = useState<ExportJob | null>(null);
  const [loading, setLoading] = useState(!!jobId);
  const [error, setError] = useState<Error | null>(null);
  const [isPolling, setIsPolling] = useState(!!jobId);

  // Fetch job status
  const fetchJobStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      const data = await getExportJob(jobId);
      setJob(data);
      setError(null);

      // Stop polling if job is complete or failed
      if (data.status === 'complete' || data.status === 'failed') {
        setIsPolling(false);

        if (data.status === 'complete') {
          onComplete?.(data);
        } else if (data.status === 'failed') {
          const err = new Error(data.error_message || 'Export job failed');
          setError(err);
          onError?.(err);
        }
      }

      setLoading(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch job status');
      setError(error);
      onError?.(error);
      setLoading(false);
    }
  }, [jobId, onComplete, onError]);

  // Set up polling interval
  useEffect(() => {
    if (!jobId || !isPolling) return;

    // Fetch immediately
    fetchJobStatus();

    // Set up interval
    const intervalId = setInterval(fetchJobStatus, interval);

    return () => clearInterval(intervalId);
  }, [jobId, isPolling, interval, fetchJobStatus]);

  // Listen for window focus and refetch
  useEffect(() => {
    if (!refetchOnFocus || !isPolling) return;

    const handleFocus = () => {
      fetchJobStatus();
    };

    window.addEventListener('focus', handleFocus);

    return () => window.removeEventListener('focus', handleFocus);
  }, [isPolling, refetchOnFocus, fetchJobStatus]);

  return {
    job,
    loading,
    error,
    refetch: fetchJobStatus,
  };
}

export default useExportPolling;
