'use client';

import { useState } from 'react';
import { usePDCStore } from '@/app/store/pdcStore';
import AdaptationCard from './AdaptationCard';

interface PDC {
  id: number;
  title: string;
  subject: string;
  grade_level: string;
  content: any;
  adaptations?: any[];
}

interface AdaptationPanelProps {
  pdc: PDC;
}

const PROFILES = [
  { id: 'dyslexia', name: 'Dislexia', color: 'purple' },
  { id: 'adhd', name: 'TDAH', color: 'orange' },
  { id: 'autism', name: 'Autismo', color: 'blue' },
  { id: 'dyscalculia', name: 'Discalculia', color: 'green' },
];

export default function AdaptationPanel({ pdc }: AdaptationPanelProps) {
  const { selectedProfiles, adaptationsLoading, requestAdaptations } = usePDCStore();
  const [filterProfile, setFilterProfile] = useState<string | null>(null);
  const [showApprovedOnly, setShowApprovedOnly] = useState(false);

  const adaptations = pdc.adaptations || [];

  // Filter adaptations
  const filteredAdaptations = adaptations.filter((adaptation) => {
    if (filterProfile && adaptation.profile !== filterProfile) {
      return false;
    }
    if (showApprovedOnly && !adaptation.teacher_approved) {
      return false;
    }
    return true;
  });

  const handleGenerateAdaptations = async () => {
    if (selectedProfiles.length === 0) {
      alert('Please select at least one neurodiversity profile');
      return;
    }

    // Get first unit and lesson for demo
    const firstUnit = pdc.content?.units?.[0];
    if (!firstUnit) {
      alert('No units to adapt');
      return;
    }

    const contentSections: Record<string, string> = {};
    contentSections['learning_objectives'] = firstUnit.learning_objectives?.join(', ') || 'No objectives';
    contentSections['assessment'] = firstUnit.assessment_strategy || 'No assessment';

    await requestAdaptations(pdc.id, {
      profiles: selectedProfiles,
      content_type: 'content',
      content_sections: contentSections,
      context: {
        unit: firstUnit.title,
        subject: pdc.subject,
        grade_level: pdc.grade_level,
      },
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Generate Button */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={handleGenerateAdaptations}
          disabled={adaptationsLoading || selectedProfiles.length === 0}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {adaptationsLoading ? 'Generating...' : 'Generate Adaptations'}
        </button>

        {selectedProfiles.length === 0 && (
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
            Select profiles above to generate adaptations
          </p>
        )}
      </div>

      {/* Filters */}
      {adaptations.length > 0 && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-2">
              Filter by profile:
            </label>
            <select
              value={filterProfile || ''}
              onChange={(e) => setFilterProfile(e.target.value || null)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            >
              <option value="">All profiles</option>
              {PROFILES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showApprovedOnly}
              onChange={(e) => setShowApprovedOnly(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-slate-700 dark:text-slate-300">Show approved only</span>
          </label>
        </div>
      )}

      {/* Adaptations List */}
      <div className="flex-1 overflow-y-auto p-4">
        {adaptationsLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Generating adaptations...</p>
          </div>
        )}

        {!adaptationsLoading && filteredAdaptations.length === 0 && adaptations.length === 0 && (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <p className="text-sm">No adaptations yet</p>
            <p className="text-xs mt-2">Generate adaptations using the button above</p>
          </div>
        )}

        {!adaptationsLoading && filteredAdaptations.length === 0 && adaptations.length > 0 && (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <p className="text-sm">No adaptations match filters</p>
          </div>
        )}

        {filteredAdaptations.length > 0 && (
          <div className="space-y-4">
            {filteredAdaptations.map((adaptation) => (
              <AdaptationCard
                key={adaptation.id}
                adaptation={adaptation}
                pdc_id={pdc.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
