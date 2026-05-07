'use client';

import { useState } from 'react';

interface Lesson {
  id?: string;
  title: string;
  duration_minutes: number;
  learning_objectives: string[];
  assessment_strategy?: string;
  materials: string[];
}

interface Unit {
  id?: string;
  title: string;
  duration_days: number;
  lessons: Lesson[];
  learning_objectives: string[];
  assessment_strategy?: string;
}

interface UnitsPanelProps {
  units: Unit[];
  selectedUnitId: string | null;
  onSelectUnit: (unitId: string) => void;
}

export default function UnitsPanel({
  units,
  selectedUnitId,
  onSelectUnit,
}: UnitsPanelProps) {
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

  const toggleUnit = (unitId: string) => {
    const newExpanded = new Set(expandedUnits);
    if (newExpanded.has(unitId)) {
      newExpanded.delete(unitId);
    } else {
      newExpanded.add(unitId);
    }
    setExpandedUnits(newExpanded);
  };

  if (!units || units.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500 dark:text-slate-400">
        <p>No units added yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-700">
      {units.map((unit, index) => {
        const unitId = unit.id || `unit_${index}`;
        const isExpanded = expandedUnits.has(unitId);
        const isSelected = selectedUnitId === unitId;

        return (
          <div key={unitId}>
            {/* Unit Header */}
            <button
              onClick={() => {
                onSelectUnit(unitId);
                if (!isExpanded) {
                  toggleUnit(unitId);
                }
              }}
              className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                isSelected
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                  : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleUnit(unitId);
                  }}
                  className="mt-0.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  {isExpanded ? '▼' : '▶'}
                </button>

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-900 dark:text-white truncate">
                    {unit.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {unit.duration_days} días • {unit.lessons?.length || 0} lecciones
                  </p>
                </div>
              </div>
            </button>

            {/* Lessons List */}
            {isExpanded && unit.lessons && unit.lessons.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-700/30 divide-y divide-slate-200 dark:divide-slate-700">
                {unit.lessons.map((lesson, lessonIndex) => {
                  const lessonId = lesson.id || `lesson_${lessonIndex}`;
                  return (
                    <button
                      key={lessonId}
                      onClick={() => {
                        // In a full implementation, you'd navigate to edit this specific lesson
                        onSelectUnit(unitId);
                      }}
                      className="w-full text-left px-4 py-2 pl-12 hover:bg-slate-100 dark:hover:bg-slate-600/50 transition-colors text-sm"
                    >
                      <p className="font-medium text-slate-900 dark:text-white truncate">
                        {lesson.title}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {lesson.duration_minutes} min
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {isExpanded && (!unit.lessons || unit.lessons.length === 0) && (
              <div className="bg-slate-50 dark:bg-slate-700/30 px-4 py-2 pl-12 text-xs text-slate-500 dark:text-slate-400">
                No lessons in this unit
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
