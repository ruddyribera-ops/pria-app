'use client';

import React, { useState, useCallback } from 'react';
import { useExportStore } from '@/app/store/exportStore';
import styles from './ExportModal.module.css';

interface ExportModalProps {
  pdc_id: string;
  pdc_name: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportModal({
  pdc_id,
  pdc_name,
  isOpen,
  onClose,
}: ExportModalProps) {
  const { startExport, currentJobId, exportJobs, error, setError } = useExportStore();

  const [format, setFormat] = useState<'docx' | 'xlsx' | 'pdf' | 'zip'>('docx');
  const [includeAdaptations, setIncludeAdaptations] = useState(true);
  const [includeMicroObjetivos, setIncludeMicroObjetivos] = useState(true);
  const [branding_id, setBrandingId] = useState<string | undefined>();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Get current export job details
  const currentJob = currentJobId ? exportJobs.find((j) => j.id === currentJobId) : null;

  const handleExportClick = useCallback(async () => {
    setIsExporting(true);
    setError(null);
    try {
      await startExport(pdc_id, format, branding_id);
      // Job polling will happen automatically via the store
    } catch (err) {
      console.error('Export failed:', err);
      setIsExporting(false);
    }
  }, [pdc_id, format, branding_id, startExport, setError]);

  const handleCancel = useCallback(() => {
    if (currentJobId) {
      useExportStore.getState().cancelExport(currentJobId);
    }
    setIsExporting(false);
    setExportProgress(0);
  }, [currentJobId]);

  const handleClose = useCallback(() => {
    if (!isExporting) {
      onClose();
    }
  }, [isExporting, onClose]);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && !isExporting) {
        handleClose();
      }
    },
    [isExporting, handleClose]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Modal overlay */}
      <div className={styles.overlay} onClick={handleClose} />

      {/* Modal dialog */}
      <div className={styles.modal} onKeyDown={handleKeyDown} role="dialog" aria-modal="true">
        <div className={styles.modalContent}>
          {/* Header */}
          <div className={styles.header}>
            <h2>Export PDC</h2>
            <button
              className={styles.closeButton}
              onClick={handleClose}
              aria-label="Close modal"
              disabled={isExporting}
            >
              ✕
            </button>
          </div>

          {/* Progress state */}
          {isExporting && currentJob ? (
            <div className={styles.progressSection}>
              <h3>Exporting {pdc_name}...</h3>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${currentJob.progress}%` }}
                />
              </div>
              <p className={styles.progressText}>
                {currentJob.progress}% - {currentJob.status}
              </p>

              {currentJob.status === 'complete' && (
                <div className={styles.successMessage}>
                  <p>✅ Export ready for download!</p>
                  <a
                    href={currentJob.file_url}
                    download
                    className={styles.downloadButton}
                  >
                    Download File
                  </a>
                </div>
              )}

              {currentJob.status === 'failed' && (
                <div className={styles.errorMessage}>
                  <p>❌ Export failed</p>
                  {currentJob.error_message && (
                    <p className={styles.errorDetail}>{currentJob.error_message}</p>
                  )}
                  <button onClick={() => setIsExporting(false)} className={styles.retryButton}>
                    Retry
                  </button>
                </div>
              )}

              {currentJob.status !== 'complete' && currentJob.status !== 'failed' && (
                <button onClick={handleCancel} className={styles.cancelButton}>
                  Cancel Export
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Export options */}
              <div className={styles.formSection}>
                {/* Error message */}
                {error && <div className={styles.errorBanner}>{error}</div>}

                {/* Format selection */}
                <fieldset className={styles.fieldset}>
                  <legend className={styles.legend}>Export Format</legend>
                  <div className={styles.radioGroup}>
                    {['docx', 'xlsx', 'pdf', 'zip'].map((fmt) => (
                      <label key={fmt} className={styles.radioLabel}>
                        <input
                          type="radio"
                          name="format"
                          value={fmt}
                          checked={format === fmt}
                          onChange={(e) => setFormat(e.target.value as any)}
                        />
                        <span className={styles.radioText}>
                          {fmt.toUpperCase()}
                          {fmt === 'docx' && ' 📄'}
                          {fmt === 'xlsx' && ' 📊'}
                          {fmt === 'pdf' && ' 🔴'}
                          {fmt === 'zip' && ' 📦'}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {/* Checkboxes */}
                <fieldset className={styles.fieldset}>
                  <legend className={styles.legend}>Include in Export</legend>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={includeAdaptations}
                      onChange={(e) => setIncludeAdaptations(e.target.checked)}
                    />
                    <span>Include Adaptations (Dislexia, ADHD, TEA, Dyscalculia)</span>
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={includeMicroObjetivos}
                      onChange={(e) => setIncludeMicroObjetivos(e.target.checked)}
                    />
                    <span>Include Micro-objectives</span>
                  </label>
                </fieldset>

                {/* Branding selector */}
                <fieldset className={styles.fieldset}>
                  <legend className={styles.legend}>School Branding</legend>
                  <select
                    className={styles.select}
                    value={branding_id || ''}
                    onChange={(e) => setBrandingId(e.target.value || undefined)}
                  >
                    <option value="">Default (Las Palmas)</option>
                    {/* Additional branding options can be populated from API */}
                  </select>
                </fieldset>
              </div>

              {/* Buttons */}
              <div className={styles.footer}>
                <button className={styles.cancelBtn} onClick={handleClose}>
                  Cancel
                </button>
                <button
                  className={styles.exportBtn}
                  onClick={handleExportClick}
                  disabled={isExporting}
                >
                  Export PDC
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
