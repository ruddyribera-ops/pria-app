'use client';

import React, { useMemo } from 'react';
import { useExportStore } from '@/app/store/exportStore';
import styles from './ExportQueue.module.css';

const formatIcons: Record<string, string> = {
  docx: '📄',
  xlsx: '📊',
  pdf: '🔴',
  zip: '📦',
};

interface ExportQueueProps {
  maxItems?: number;
  showCompleted?: boolean;
}

export default function ExportQueue({
  maxItems = 10,
  showCompleted = true,
}: ExportQueueProps) {
  const { exportJobs, cancelExport } = useExportStore();

  // Filter and sort jobs
  const displayJobs = useMemo(() => {
    let jobs = exportJobs;

    if (!showCompleted) {
      jobs = jobs.filter((j) => j.status !== 'complete');
    }

    return jobs.slice(0, maxItems);
  }, [exportJobs, maxItems, showCompleted]);

  const handleDelete = async (jobId: string) => {
    try {
      await cancelExport(jobId);
    } catch (error) {
      console.error('Failed to delete export:', error);
    }
  };

  const getStatusBadge = (status: string, errorMessage?: string) => {
    switch (status) {
      case 'queued':
        return <span className={`${styles.badge} ${styles.queued}`}>⏳ Queued</span>;
      case 'processing':
        return (
          <span className={`${styles.badge} ${styles.processing}`}>
            ⚙️ Processing
            <span className={styles.spinner}></span>
          </span>
        );
      case 'complete':
        return <span className={`${styles.badge} ${styles.complete}`}>✅ Complete</span>;
      case 'failed':
        return (
          <span
            className={`${styles.badge} ${styles.failed}`}
            title={errorMessage}
          >
            ❌ Failed
          </span>
        );
      default:
        return <span className={styles.badge}>{status}</span>;
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (displayJobs.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyIcon}>📭</p>
        <p className={styles.emptyText}>No exports yet</p>
        <p className={styles.emptySubtext}>Start exporting PDCs to see them here</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Export Queue</h3>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th className={styles.thPdcName}>PDC Name</th>
              <th className={styles.thFormat}>Format</th>
              <th className={styles.thStatus}>Status</th>
              <th className={styles.thProgress}>Progress</th>
              <th className={styles.thSize}>Size</th>
              <th className={styles.thActions}>Actions</th>
            </tr>
          </thead>
          <tbody className={styles.tbody}>
            {displayJobs.map((job) => (
              <tr key={job.id} className={styles.row}>
                {/* PDC Name */}
                <td className={styles.tdPdcName}>
                  <span className={styles.pdcName}>{job.pdc_id}</span>
                </td>

                {/* Format */}
                <td className={styles.tdFormat}>
                  <span className={styles.format}>
                    {formatIcons[job.format] || '📄'} {job.format.toUpperCase()}
                  </span>
                </td>

                {/* Status */}
                <td className={styles.tdStatus}>
                  {getStatusBadge(job.status, job.error_message)}
                </td>

                {/* Progress */}
                <td className={styles.tdProgress}>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                  <span className={styles.progressText}>{job.progress}%</span>
                </td>

                {/* File Size */}
                <td className={styles.tdSize}>
                  <span className={styles.fileSize}>
                    {formatFileSize(job.file_size_bytes)}
                  </span>
                </td>

                {/* Actions */}
                <td className={styles.tdActions}>
                  {job.status === 'complete' && job.file_url && (
                    <a
                      href={job.file_url}
                      download
                      className={styles.downloadLink}
                      title="Download file"
                    >
                      ⬇️
                    </a>
                  )}
                  {job.status !== 'complete' && job.status !== 'failed' && (
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(job.id)}
                      title="Cancel export"
                    >
                      ✕
                    </button>
                  )}
                  {(job.status === 'complete' || job.status === 'failed') && (
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(job.id)}
                      title="Remove from queue"
                    >
                      🗑️
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {exportJobs.length > maxItems && (
        <p className={styles.moreText}>
          Showing {displayJobs.length} of {exportJobs.length} exports
        </p>
      )}
    </div>
  );
}
