/**
 * Planning Calendar Page
 * Main route for weekly planning module
 * URL: /planning/calendar?pdc_id=X&week=Y (supports deep-linking)
 */

'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarView } from '@/app/components/planning/CalendarView';
import { WeeklyPlanEditor } from '@/app/components/planning/WeeklyPlanEditor';
import { GeneratePlanModal } from '@/app/components/planning/GeneratePlanModal';
import { useWeeklyPlan } from '@/app/lib/hooks/useWeeklyPlan';
import { usePlanningStore } from '@/app/store/planningStore';
import { usePDCStore } from '@/app/store/pdcStore';
import './page.css';

// Disable static prerender — this page depends on URL search params and client-only stores
export const dynamic = 'force-dynamic';

function PlanningCalendarPageInner() {
  const searchParams = useSearchParams();
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Get PDC ID from URL or store
  const pdcIdParam = searchParams.get('pdc_id');
  const weekParam = searchParams.get('week');

  // Get stores
  const {
    weeks,
    calendar,
    loading,
    error,
    generationJob,
    setError: setStoreError,
  } = usePlanningStore();

  const { pdcs, fetchPDCs } = usePDCStore();

  // Use the hook for planning
  const {
    weeks: hookWeeks,
    calendar: hookCalendar,
    loading: hookLoading,
    updateWeek,
    updateMomento,
  } = useWeeklyPlan({
    pdc_id: pdcIdParam || undefined,
    auto_load_calendar: true,
  });

  // Set selected week from URL param
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);

  useEffect(() => {
    if (weekParam && hookWeeks.length > 0) {
      const week = hookWeeks.find((w) => w.number === parseInt(weekParam));
      if (week) {
        setSelectedWeekId(week.id);
      }
    }
  }, [weekParam, hookWeeks]);

  // Load PDCs on mount for modal
  useEffect(() => {
    if (pdcs.length === 0) {
      fetchPDCs().catch((err) => {
        console.error('Failed to load PDCs:', err);
      });
    }
  }, [pdcs.length, fetchPDCs]);

  const selectedWeek =
    selectedWeekId && hookWeeks.length > 0
      ? hookWeeks.find((w) => w.id === selectedWeekId)
      : null;

  // Handle generation
  const handleGenerateAll = () => {
    setShowGenerateModal(true);
  };

  const handleGenerate = async (pdc_id: string, overrides?: any) => {
    try {
      // This would be called from the modal and handled by the store
      // For now, this is a placeholder for the actual generation logic
      console.log('Generating plans for', pdc_id, overrides);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error during generation';
      setStoreError(msg);
    }
  };

  return (
    <div className="planning-page">
      {/* Header */}
      <div className="planning-header">
        <h1>📅 Planificación Semanal</h1>
        <p className="page-subtitle">
          Crea y gestiona planes de enseñanza semana a semana
        </p>
      </div>

      {/* Main layout: Calendar (left) + Editor (right) */}
      <div className="planning-container">
        {/* Calendar side */}
        <div className="calendar-panel">
          <CalendarView
            weeks={hookWeeks}
            calendar={hookCalendar}
            loading={hookLoading}
            selectedWeekId={selectedWeekId}
            onWeekSelect={setSelectedWeekId}
            onGenerateAll={handleGenerateAll}
            generationInProgress={generationJob?.status === 'processing'}
          />

          {/* Generation progress overlay */}
          {generationJob && generationJob.status === 'processing' && (
            <div className="generation-overlay">
              <div className="generation-status">
                <h4>⟳ Generando Plan</h4>
                <p>
                  Procesando Semana {generationJob.current_week || '?'}/
                  {generationJob.total_weeks}
                </p>
                <div className="progress-bar-small">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(generationJob.progress / 100) * 100}%`,
                    }}
                  />
                </div>
                <p className="progress-text">
                  {generationJob.progress}%
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Editor side */}
        <div className="editor-panel">
          <WeeklyPlanEditor
            week={selectedWeek || null}
            loading={hookLoading}
            onSave={updateWeek}
            onMomentoUpdate={updateMomento}
          />
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="error-notification">
          <p>✗ {error}</p>
          <button onClick={() => setStoreError(null)}>Cerrar</button>
        </div>
      )}

      {/* Generate modal */}
      <GeneratePlanModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerate}
        pdcs={pdcs.map((p: any) => ({
          id: p.id?.toString() || '',
          name: p.name || p.title || 'Sin nombre',
        }))}
      />
    </div>
  );
}

export default function PlanningCalendarPage() {
  return (
    <Suspense fallback={<div className="planning-page"><p>Cargando…</p></div>}>
      <PlanningCalendarPageInner />
    </Suspense>
  );
}
