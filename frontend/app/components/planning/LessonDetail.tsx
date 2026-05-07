/**
 * LessonDetail Component
 * Full-page view of a single lesson (Momento) with tabs and side panels
 */

'use client';

import React, { useState } from 'react';
import { Momento, Week } from '@/app/lib/types/planning';
import './LessonDetail.css';

interface LessonDetailProps {
  momento: Momento | null;
  week: Week | null;
  onClose: () => void;
}

type TabType = 'content' | 'resources' | 'assessment' | 'adaptations';

export function LessonDetail({
  momento,
  week,
  onClose,
}: LessonDetailProps) {
  const [activeTab, setActiveTab] = useState<TabType>('content');

  if (!momento || !week) {
    return null;
  }

  return (
    <div className="lesson-detail-overlay" onClick={onClose}>
      <div
        className="lesson-detail-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="lesson-header">
          <div className="lesson-title">
            <h2>
              {momento.nombre} — Semana {week.number}
            </h2>
            <p className="lesson-breadcrumb">
              {week.subject} • {week.grade_level}
            </p>
          </div>
          <button
            className="btn-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="lesson-tabs">
          <button
            className={`tab-button ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => setActiveTab('content')}
          >
            Contenido
          </button>
          <button
            className={`tab-button ${activeTab === 'resources' ? 'active' : ''}`}
            onClick={() => setActiveTab('resources')}
          >
            Recursos
          </button>
          <button
            className={`tab-button ${activeTab === 'assessment' ? 'active' : ''}`}
            onClick={() => setActiveTab('assessment')}
          >
            Evaluación
          </button>
          <button
            className={`tab-button ${activeTab === 'adaptations' ? 'active' : ''}`}
            onClick={() => setActiveTab('adaptations')}
          >
            Adaptaciones
          </button>
        </div>

        <div className="lesson-content">
          {/* Content Tab */}
          {activeTab === 'content' && (
            <div className="tab-panel">
              <div className="content-section">
                <h3>Contenido Pedagógico</h3>
                <div className="meta-info">
                  <span className="meta-item">
                    ⏱ {momento.duration_minutes} minutos
                  </span>
                </div>
                <div className="content-text">
                  {momento.content_text || (
                    <em className="empty-state">
                      Sin contenido definido
                    </em>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <div className="tab-panel">
              <div className="content-section">
                <h3>Recursos Necesarios</h3>
                {momento.recursos && momento.recursos.length > 0 ? (
                  <ul className="resources-list">
                    {momento.recursos.map((recurso, idx) => (
                      <li key={idx}>{recurso}</li>
                    ))}
                  </ul>
                ) : (
                  <em className="empty-state">
                    No hay recursos especificados
                  </em>
                )}
              </div>
            </div>
          )}

          {/* Assessment Tab */}
          {activeTab === 'assessment' && (
            <div className="tab-panel">
              <div className="content-section">
                <h3>Estrategia de Evaluación</h3>
                <div className="assessment-text">
                  {momento.evaluacion || (
                    <em className="empty-state">
                      Sin estrategia de evaluación definida
                    </em>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Adaptations Tab */}
          {activeTab === 'adaptations' && (
            <div className="tab-panel">
              <div className="content-section">
                <h3>Adaptaciones para Perfiles Neuroincluyentes</h3>
                <p className="info-message">
                  Las adaptaciones para cada perfil se generarán automáticamente
                  basadas en el contenido pedagógico.
                </p>
                <div className="adaptation-profiles">
                  <div className="adaptation-item">
                    <h4>📖 Dislexia</h4>
                    <p>Texto en Dyslexie, espaciado aumentado, sin cursivas</p>
                  </div>
                  <div className="adaptation-item">
                    <h4>🎨 ADHD</h4>
                    <p>
                      Colores contrastantes, fragmentos cortos, indicadores de
                      progreso
                    </p>
                  </div>
                  <div className="adaptation-item">
                    <h4>📋 TEA</h4>
                    <p>Estructura predecible, lenguaje literal, sin decoración</p>
                  </div>
                  <div className="adaptation-item">
                    <h4>🔢 Dyscalculia</h4>
                    <p>Números en monoespaciado, códigos de color por magnitud</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="lesson-footer">
          <button className="btn-edit">✎ Editar</button>
          <button className="btn-export">⬇ Exportar a DOCX</button>
          <button className="btn-print">🖨 Imprimir</button>
        </div>
      </div>
    </div>
  );
}
