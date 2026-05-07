'use client';

import { useState, useEffect } from 'react';
import { usePDCStore } from '@/app/store/pdcStore';
import { useUIStore } from '@/app/store/uiStore';

interface Unit {
  id?: string;
  title: string;
  duration_days: number;
  lessons: any[];
  learning_objectives: string[];
  assessment_strategy?: string;
}

interface PDC {
  id: number;
  title: string;
  subject: string;
  grade_level: string;
  content: {
    units: Unit[];
    general_objectives: string[];
    assessment_methods: string[];
    resources: Record<string, any>;
  };
}

interface ContentEditorProps {
  pdc: PDC;
  selectedUnitId: string;
}

export default function ContentEditor({ pdc, selectedUnitId }: ContentEditorProps) {
  const { updatePDC, loading } = usePDCStore();
  const { toggleAdaptationPanel } = useUIStore();
  const [editedUnit, setEditedUnit] = useState<Unit | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Find the selected unit
  useEffect(() => {
    const unit = pdc.content?.units?.find(
      (u) => (u.id || `unit_${pdc.content.units.indexOf(u)}`) === selectedUnitId
    );
    if (unit) {
      setEditedUnit({ ...unit });
    }
  }, [selectedUnitId, pdc]);

  if (!editedUnit) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        No unit selected
      </div>
    );
  }

  const handleSave = async () => {
    if (!editedUnit.title.trim()) {
      alert('Unit title is required');
      return;
    }

    setIsSaving(true);
    try {
      // Update the unit in the PDC content
      const updatedUnits = pdc.content.units.map((u) =>
        (u.id || `unit_${pdc.content.units.indexOf(u)}`) === selectedUnitId
          ? editedUnit
          : u
      );

      await updatePDC(pdc.id, {
        content: {
          ...pdc.content,
          units: updatedUnits,
        },
      });

      alert('Unit saved successfully!');
    } catch (error) {
      alert('Failed to save unit');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Unit Title */}
        <div>
          <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
            Unit Title
          </label>
          <input
            type="text"
            value={editedUnit.title}
            onChange={(e) => setEditedUnit({ ...editedUnit, title: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter unit title"
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
            Duration (days)
          </label>
          <input
            type="number"
            value={editedUnit.duration_days}
            onChange={(e) => setEditedUnit({ ...editedUnit, duration_days: parseInt(e.target.value) || 0 })}
            className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
            max="60"
          />
        </div>

        {/* Learning Objectives */}
        <div>
          <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
            Learning Objectives
          </label>
          <textarea
            value={editedUnit.learning_objectives?.join('\n') || ''}
            onChange={(e) => setEditedUnit({
              ...editedUnit,
              learning_objectives: e.target.value.split('\n').filter((o) => o.trim()),
            })}
            placeholder="Enter one objective per line"
            className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {editedUnit.learning_objectives?.length || 0} objective(s)
          </p>
        </div>

        {/* Assessment Strategy */}
        <div>
          <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
            Assessment Strategy
          </label>
          <textarea
            value={editedUnit.assessment_strategy || ''}
            onChange={(e) => setEditedUnit({ ...editedUnit, assessment_strategy: e.target.value })}
            placeholder="Describe how students will be assessed"
            className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
        </div>

        {/* Lessons Info */}
        {editedUnit.lessons && editedUnit.lessons.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-200 dark:border-blue-700">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              This unit has <strong>{editedUnit.lessons.length}</strong> lesson(s)
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
        <button
          onClick={handleSave}
          disabled={isSaving || loading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          aria-label="Save unit"
        >
          {isSaving ? 'Saving...' : '💾 Save Unit'}
        </button>

        <button
          onClick={() => toggleAdaptationPanel()}
          className="w-full py-2 px-4 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
        >
          Generate Adaptations
        </button>
      </div>
    </div>
  );
}
