// Custom React hook for PDC operations
'use client';

import { useCallback } from 'react';
import { usePDCStore } from '@/app/store/pdcStore';

export const usePDC = () => {
  const {
    pdcs,
    currentPDC,
    selectedProfiles,
    loading,
    adaptationsLoading,
    error,
    fetchPDCs,
    fetchPDC,
    createPDC,
    updatePDC,
    deletePDC,
    requestAdaptations,
    approveAdaptation,
    rejectAdaptation,
    setSelectedProfiles,
    clearCurrentPDC,
    clearError,
  } = usePDCStore();

  // Memoized callbacks for cleaner component usage
  const handleFetchPDCs = useCallback(
    (filters?: any) => fetchPDCs(filters),
    [fetchPDCs]
  );

  const handleFetchPDC = useCallback(
    (id: number) => fetchPDC(id),
    [fetchPDC]
  );

  const handleCreatePDC = useCallback(
    (data: any) => createPDC(data),
    [createPDC]
  );

  const handleUpdatePDC = useCallback(
    (id: number, data: any) => updatePDC(id, data),
    [updatePDC]
  );

  const handleDeletePDC = useCallback(
    (id: number) => deletePDC(id),
    [deletePDC]
  );

  const handleRequestAdaptations = useCallback(
    (pdc_id: number, request: any) => requestAdaptations(pdc_id, request),
    [requestAdaptations]
  );

  const handleApproveAdaptation = useCallback(
    (pdc_id: number, adaptation_id: number, feedback?: string) =>
      approveAdaptation(pdc_id, adaptation_id, feedback),
    [approveAdaptation]
  );

  const handleRejectAdaptation = useCallback(
    (pdc_id: number, adaptation_id: number, reason?: string, feedback?: string) =>
      rejectAdaptation(pdc_id, adaptation_id, reason, feedback),
    [rejectAdaptation]
  );

  return {
    // State
    pdcs,
    currentPDC,
    selectedProfiles,
    loading,
    adaptationsLoading,
    error,

    // Actions
    fetchPDCs: handleFetchPDCs,
    fetchPDC: handleFetchPDC,
    createPDC: handleCreatePDC,
    updatePDC: handleUpdatePDC,
    deletePDC: handleDeletePDC,
    requestAdaptations: handleRequestAdaptations,
    approveAdaptation: handleApproveAdaptation,
    rejectAdaptation: handleRejectAdaptation,
    setSelectedProfiles,
    clearCurrentPDC,
    clearError,
  };
};
