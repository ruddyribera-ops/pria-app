'use client';

import React from 'react';
import { useExportStore } from '@/app/store/exportStore';
import styles from './ExportPreview.module.css';

interface ExportPreviewProps {
  pdc_name: string;
  format?: 'docx' | 'xlsx' | 'pdf' | 'zip';
  includeAdaptations?: boolean;
  includeMicroObjetivos?: boolean;
  lastExportDate?: string;
  estimatedFileSize?: string;
}

const formatIcons: Record<string, string> = {
  docx: '📄',
  xlsx: '📊',
  pdf: '🔴',
  zip: '📦',
};

export default function ExportPreview({
  pdc_name,
  format = 'docx',
  includeAdaptations = true,
  includeMicroObjetivos = true,
  lastExportDate,
  estimatedFileSize = '~2.3 MB',
}: ExportPreviewProps) {
  const { branding } = useExportStore();

  return (
    <div className={styles.preview}>
      <div className={styles.header}>
        <h3 className={styles.title}>Export Preview</h3>
      </div>

      <div className={styles.content}>
        {/* What is being exported */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Document</h4>
          <div className={styles.documentInfo}>
            <span className={styles.icon}>{formatIcons[format]}</span>
            <div className={styles.docDetails}>
              <p className={styles.docName}>{pdc_name}</p>
              <p className={styles.docFormat}>{format.toUpperCase()} Format</p>
            </div>
          </div>
        </div>

        {/* Included content */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Included Content</h4>
          <ul className={styles.contentList}>
            <li className={styles.contentItem}>
              {includeAdaptations ? '✓' : '✗'} Neuroinclusive Adaptations
              {includeAdaptations && (
                <span className={styles.badge}>Dislexia, ADHD, TEA, Dyscalculia</span>
              )}
            </li>
            <li className={styles.contentItem}>
              {includeMicroObjetivos ? '✓' : '✗'} Micro-objectives
            </li>
          </ul>
        </div>

        {/* Branding preview */}
        {branding && (
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>School Branding</h4>
            <div className={styles.brandingPreview}>
              {branding.logo_url && (
                <div className={styles.logoContainer}>
                  <img
                    src={branding.logo_url}
                    alt={`${branding.school_name} logo`}
                    className={styles.logo}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect fill="%23ccc" width="40" height="40"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3ENo Logo%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
              )}
              <div className={styles.brandingInfo}>
                <p className={styles.schoolName}>{branding.school_name}</p>
                <div className={styles.colorPreview}>
                  <div className={styles.colorItem}>
                    <div
                      className={styles.colorBox}
                      style={{ backgroundColor: branding.header_color }}
                      title={branding.header_color}
                    />
                    <span>Header</span>
                  </div>
                  <div className={styles.colorItem}>
                    <div
                      className={styles.colorBox}
                      style={{ backgroundColor: branding.footer_color }}
                      title={branding.footer_color}
                    />
                    <span>Footer</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* File info */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>File Information</h4>
          <div className={styles.fileInfo}>
            <div className={styles.infoRow}>
              <span className={styles.label}>Estimated Size:</span>
              <span className={styles.value}>{estimatedFileSize}</span>
            </div>
            {lastExportDate && (
              <div className={styles.infoRow}>
                <span className={styles.label}>Last Exported:</span>
                <span className={styles.value}>{lastExportDate}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
