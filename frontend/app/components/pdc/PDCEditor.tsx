'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { usePDCStore } from '@/app/store/pdcStore';
import { useUIStore } from '@/app/store/uiStore';
import MESCPTable from './MESCPTable';
import AdaptationPanel from './AdaptationPanel';
import ProfileSelector from './ProfileSelector';
import AdaptacionesPanel from './AdaptacionesPanel';
import InteligenciasMultiples from './InteligenciasMultiples';
import ProductosEditor from './ProductosEditor';

export default function PDCEditor() {
  const params = useParams();
  const pdc_id = parseInt(params.pdc_id as string);

  const {
    currentPDC,
    loading,
    error,
    mescp_rows,
    loadMESCPRows,
    addMESCPRow,
    updateMESCPRow,
    deleteMESCPRow,
    fetchPDC,
    updatePDC,
  } = usePDCStore();

  const { showAdaptationPanel } = useUIStore();
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [savingPDC, setSavingPDC] = useState(false);
  const [activeTab, setActiveTab] = useState<'mescp' | 'adaptaciones' | 'inteligencias' | 'productos'>('mescp');

  // Fetch PDC and MESCP rows on mount
  useEffect(() => {
    if (pdc_id) {
      fetchPDC(pdc_id);
      loadMESCPRows(pdc_id);
    }
  }, [pdc_id, fetchPDC, loadMESCPRows]);

  const handleSavePDC = async () => {
    if (!currentPDC) return;
    setSavingPDC(true);
    try {
      await updatePDC(pdc_id, currentPDC);
    } catch (err) {
      console.error('Failed to save PDC:', err);
    } finally {
      setSavingPDC(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading PDC...</p>
        </div>
      </div>
    );
  }

  if (error || !currentPDC) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">
            {error || 'PDC not found'}
          </p>
          <a
            href="/dashboard"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {currentPDC.title}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {currentPDC.subject} • {currentPDC.grade_level}
                {currentPDC.trimester && ` • Trimestre ${currentPDC.trimester}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSavePDC}
                disabled={savingPDC}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white rounded-md font-medium transition-colors"
                aria-label="Save PDC"
              >
                {savingPDC ? 'Saving...' : 'Save PDC'}
              </button>
              <a
                href="/dashboard"
                className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
              >
                Back
              </a>
            </div>
          </div>

          {/* Profile Selector Toolbar */}
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Profiles:
            </span>
            <ProfileSelector />
          </div>
        </div>
      </div>

      {/* Main Content - 3 Column Layout */}
      <div className="max-w-full mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - PDC List (Eventually) */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  PDC Details
                </h2>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Subject:</span>
                  <p className="text-slate-600 dark:text-slate-400">{currentPDC.subject}</p>
                </div>
                <div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Grade:</span>
                  <p className="text-slate-600 dark:text-slate-400">{currentPDC.grade_level}</p>
                </div>
                <div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">MESCP Rows:</span>
                  <p className="text-slate-600 dark:text-slate-400">{mescp_rows.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Center Column - MESCP Table + Tabs */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Tabs */}
              <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <div className="flex">
                  {['mescp', 'adaptaciones', 'inteligencias', 'productos'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as typeof activeTab)}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === tab
                          ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
                      }`}
                      aria-label={`Open ${tab} tab`}
                    >
                      {tab === 'mescp' && 'MESCP'}
                      {tab === 'adaptaciones' && 'Adaptaciones'}
                      {tab === 'inteligencias' && 'Inteligencias'}
                      {tab === 'productos' && 'Productos'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="overflow-y-auto max-h-[calc(100vh-250px)]">
                {activeTab === 'mescp' && (
                  <MESCPTable
                    rows={mescp_rows}
                    pdc_id={pdc_id}
                    onAddRow={async (data) => {
                      await addMESCPRow(pdc_id, data);
                    }}
                    onUpdateRow={async (row_id, data) => {
                      await updateMESCPRow(pdc_id, row_id, data);
                    }}
                    onDeleteRow={async (row_id) => {
                      await deleteMESCPRow(pdc_id, row_id);
                    }}
                  />
                )}

                {activeTab === 'adaptaciones' && (
                  <AdaptacionesPanel
                    pdc_id={pdc_id}
                    onSave={async (content) => {
                      // Update PDC with adaptations content
                      // This would be a custom field in the PDC model
                    }}
                  />
                )}

                {activeTab === 'inteligencias' && (
                  <InteligenciasMultiples
                    pdc_id={pdc_id}
                    onSave={async (selected) => {
                      // Save selected intelligences
                    }}
                  />
                )}

                {activeTab === 'productos' && (
                  <ProductosEditor
                    pdc_id={pdc_id}
                    onSave={async (products) => {
                      // Save products
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Adaptations */}
          {showAdaptationPanel && (
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[calc(100vh-150px)]">
                <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="font-semibold text-slate-900 dark:text-white">
                    AI Adaptations
                  </h2>
                </div>
                <div className="overflow-y-auto max-h-[calc(100vh-250px)]">
                  <AdaptationPanel pdc={currentPDC} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
