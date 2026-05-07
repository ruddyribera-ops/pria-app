'use client';

import React, { useState, useEffect } from 'react';
import { useExportStore } from '@/app/store/exportStore';
import ExportModal from '@/app/components/export/ExportModal';
import ExportPreview from '@/app/components/export/ExportPreview';
import ExportQueue from '@/app/components/export/ExportQueue';
import styles from './page.module.css';

export default function ExportPage() {
  const { loadExportJobs, loadBranding, branding, exportJobs } = useExportStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPdcId, setSelectedPdcId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load jobs and branding on mount
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError(null);
        await Promise.all([
          loadExportJobs(),
          loadBranding(),
        ]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load data';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [loadExportJobs, loadBranding]);

  const handleOpenModal = (pdcId: string = '') => {
    setSelectedPdcId(pdcId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPdcId('');
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Export & Branding</h1>
        <p className={styles.subtitle}>
          Export your PDCs in multiple formats and customize school branding
        </p>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <p>{error}</p>
          <button
            onClick={() => setError(null)}
            className={styles.dismissBtn}
          >
            ✕
          </button>
        </div>
      )}

      <div className={styles.content}>
        {/* Left panel: Preview */}
        <div className={styles.leftPanel}>
          <ExportPreview
            pdc_name={selectedPdcId || 'Select a PDC to export'}
            format="docx"
            includeAdaptations={true}
            includeMicroObjetivos={true}
          />
        </div>

        {/* Center panel: Action button */}
        <div className={styles.centerPanel}>
          <div className={styles.actionCard}>
            <div className={styles.actionIcon}>📤</div>
            <h2 className={styles.actionTitle}>Ready to Export?</h2>
            <p className={styles.actionDescription}>
              Click the button below to configure your export settings and generate
              professional documents with school branding.
            </p>
            <button
              className={styles.exportBtn}
              onClick={() => handleOpenModal(selectedPdcId)}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Start Export'}
            </button>
            <p className={styles.helpText}>
              Supported formats: DOCX, XLSX, PDF, ZIP
            </p>
          </div>

          {/* Quick stats */}
          <div className={styles.statsCard}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{exportJobs.length}</span>
              <span className={styles.statLabel}>Total Exports</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {exportJobs.filter((j) => j.status === 'complete').length}
              </span>
              <span className={styles.statLabel}>Complete</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {exportJobs.filter((j) => j.status === 'processing' || j.status === 'queued').length}
              </span>
              <span className={styles.statLabel}>In Progress</span>
            </div>
          </div>
        </div>

        {/* Right panel: Export queue */}
        <div className={styles.rightPanel}>
          <ExportQueue maxItems={10} showCompleted={true} />
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal
        pdc_id={selectedPdcId}
        pdc_name={selectedPdcId || 'PDC'}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
