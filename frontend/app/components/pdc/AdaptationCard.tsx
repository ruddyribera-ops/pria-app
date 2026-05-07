'use client';

import { useState } from 'react';
import { usePDCStore } from '@/app/store/pdcStore';

interface Adaptation {
  id: number;
  profile: string;
  content_section: string;
  original_content: Record<string, any>;
  adapted_content: Record<string, any>;
  ai_confidence_score: number;
  teacher_approved: boolean;
  created_at: string;
  rejection_reason?: string;
  teacher_feedback?: string;
}

interface AdaptationCardProps {
  adaptation: Adaptation;
  pdc_id: number;
}

const PROFILE_COLORS: Record<string, { bg: string; badge: string; text: string }> = {
  dyslexia: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    badge: 'bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-100',
    text: 'text-purple-700 dark:text-purple-300',
  },
  adhd: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    badge: 'bg-orange-200 dark:bg-orange-700 text-orange-800 dark:text-orange-100',
    text: 'text-orange-700 dark:text-orange-300',
  },
  autism: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    badge: 'bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-100',
    text: 'text-blue-700 dark:text-blue-300',
  },
  dyscalculia: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    badge: 'bg-green-200 dark:bg-green-700 text-green-800 dark:text-green-100',
    text: 'text-green-700 dark:text-green-300',
  },
};

export default function AdaptationCard({ adaptation, pdc_id }: AdaptationCardProps) {
  const { approveAdaptation, rejectAdaptation, loading } = usePDCStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [feedback, setFeedback] = useState('');

  const colors = PROFILE_COLORS[adaptation.profile] || PROFILE_COLORS.dyslexia;

  // Determine confidence color
  const getConfidenceColor = () => {
    if (adaptation.ai_confidence_score > 0.8) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    if (adaptation.ai_confidence_score > 0.6) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
  };

  const handleApprove = async () => {
    await approveAdaptation(pdc_id, adaptation.id, feedback || undefined);
    setFeedback('');
  };

  const handleReject = async () => {
    if (!feedback) {
      alert('Please provide feedback for rejection');
      return;
    }
    await rejectAdaptation(pdc_id, adaptation.id, 'Teacher feedback', feedback);
    setFeedback('');
  };

  return (
    <div className={`rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden ${colors.bg}`}>
      {/* Header */}
      <div className="p-4 bg-white dark:bg-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors.badge}`}>
                {adaptation.profile.charAt(0).toUpperCase() + adaptation.profile.slice(1)}
              </span>
              {adaptation.teacher_approved && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-200 dark:bg-green-700 text-green-800 dark:text-green-100">
                  [OK] Approved
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {adaptation.content_section}
            </p>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            aria-label="Toggle expansion"
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>

        {/* Confidence Score */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-slate-600 dark:text-slate-400">AI Confidence:</span>
          <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 max-w-xs">
            <div
              className={`h-2 rounded-full ${
                adaptation.ai_confidence_score > 0.8
                  ? 'bg-green-500'
                  : adaptation.ai_confidence_score > 0.6
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${adaptation.ai_confidence_score * 100}%` }}
            />
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded ${getConfidenceColor()}`}>
            {(adaptation.ai_confidence_score * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-700">
          {/* Comparison Toggle */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/30 border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showComparison ? 'Hide comparison' : 'Show original vs adapted'}
            </button>
          </div>

          {/* Adaptation Content */}
          <div className="p-4 space-y-4">
            {showComparison ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white mb-2 text-xs uppercase">
                    Original
                  </h4>
                  <div className="bg-white dark:bg-slate-700 p-3 rounded border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-xs max-h-40 overflow-y-auto">
                    {typeof adaptation.original_content === 'object'
                      ? JSON.stringify(adaptation.original_content, null, 2)
                      : adaptation.original_content}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white mb-2 text-xs uppercase">
                    Adapted
                  </h4>
                  <div className="bg-white dark:bg-slate-700 p-3 rounded border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-xs max-h-40 overflow-y-auto">
                    {typeof adaptation.adapted_content === 'object'
                      ? JSON.stringify(adaptation.adapted_content, null, 2)
                      : adaptation.adapted_content}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-700 p-3 rounded border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm max-h-40 overflow-y-auto">
                <h4 className="font-medium mb-2 text-xs uppercase text-slate-900 dark:text-white">
                  Adapted Content
                </h4>
                <div className="whitespace-pre-wrap">
                  {typeof adaptation.adapted_content === 'object'
                    ? JSON.stringify(adaptation.adapted_content, null, 2)
                    : adaptation.adapted_content}
                </div>
              </div>
            )}

            {/* Feedback Area */}
            {!adaptation.teacher_approved && (
              <div>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Add feedback or suggestions (required for rejection)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  rows={3}
                />
              </div>
            )}

            {/* Action Buttons */}
            {!adaptation.teacher_approved ? (
              <div className="flex gap-2">
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex-1 py-2 px-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors font-medium text-sm"
                  aria-label="Approve adaptation"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading || !feedback}
                  className="flex-1 py-2 px-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors font-medium text-sm"
                  aria-label="Reject adaptation"
                >
                  ✕ Reject
                </button>
              </div>
            ) : (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-700 text-sm text-green-700 dark:text-green-300">
                [OK] Approved by teacher
                {adaptation.teacher_feedback && (
                  <p className="mt-2 text-xs">{adaptation.teacher_feedback}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
