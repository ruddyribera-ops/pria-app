/**
 * CalendarView Component
 * Displays weeks 15-30 in a responsive grid with vacation/holiday indicators
 */

'use client';

import React, { useMemo } from 'react';
import { Week, CalendarEvent } from '@/app/lib/types/planning';
import './CalendarView.css';

interface CalendarViewProps {
  weeks: Week[];
  calendar: CalendarEvent[];
  loading: boolean;
  selectedWeekId?: string | null;
  onWeekSelect: (week_id: string) => void;
  onGenerateAll: () => void;
  generationInProgress?: boolean;
}

export function CalendarView({
  weeks,
  calendar,
  loading,
  selectedWeekId,
  onWeekSelect,
  onGenerateAll,
  generationInProgress = false,
}: CalendarViewProps) {
  // Identify vacation weeks from calendar
  const vacationWeeks = useMemo(() => {
    return new Set(
      calendar
        .filter((e) => e.event_type === 'vacation')
        .map((e) => e.week_number)
    );
  }, [calendar]);

  // Get status badge styling
  const getStatusBadge = (week: Week) => {
    const statusConfig: Record<
      string,
      { label: string; className: string }
    > = {
      draft: { label: '✎ Borrador', className: 'status-draft' },
      published: { label: '✓ Publicado', className: 'status-published' },
      completed: { label: '✓✓ Completado', className: 'status-completed' },
    };

    const config = statusConfig[week.status] || statusConfig.draft;
    return (
      <span className={`status-badge ${config.className}`}>
        {config.label}
      </span>
    );
  };

  // Render loading skeleton
  if (loading && weeks.length === 0) {
    return (
      <div className="calendar-view calendar-loading">
        <div className="calendar-header">
          <h2>Calendario de Planificación</h2>
          <button disabled className="btn-generate-all">
            Cargando...
          </button>
        </div>
        <div className="calendar-grid skeleton-grid">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="week-card skeleton-card">
              <div className="skeleton-line" />
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-view">
      {/* Header with title and generate button */}
      <div className="calendar-header">
        <h2>Calendario de Planificación</h2>
        <button
          className="btn-generate-all"
          onClick={onGenerateAll}
          disabled={generationInProgress}
        >
          {generationInProgress
            ? '⟳ Generando...'
            : '⚡ Generar Todo'}
        </button>
      </div>

      {/* Responsive grid of weeks */}
      <div className="calendar-grid">
        {weeks.map((week) => {
          const isVacation = vacationWeeks.has(week.number);
          const isSelected = selectedWeekId === week.id;

          return (
            <div
              key={week.id}
              className={`week-card ${isSelected ? 'selected' : ''} ${
                isVacation ? 'vacation' : ''
              }`}
              onClick={() => onWeekSelect(week.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onWeekSelect(week.id);
                }
              }}
              aria-pressed={isSelected}
              aria-label={`Semana ${week.number}: ${week.subject}`}
            >
              {isVacation && (
                <div className="vacation-label">VACACIONES</div>
              )}

              <div className="week-header">
                <h3>Semana {week.number}</h3>
              </div>

              <div className="week-content">
                <div className="week-subject">{week.subject}</div>
                <div className="week-grade">{week.grade_level}</div>
                {getStatusBadge(week)}
              </div>

              {week.momentos && week.momentos.length > 0 && (
                <div className="week-momentos-count">
                  {week.momentos.length} momentos
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {weeks.length === 0 && !loading && (
        <div className="calendar-empty">
          <p>No hay semanas disponibles. Genera un nuevo plan para comenzar.</p>
        </div>
      )}
    </div>
  );
}
