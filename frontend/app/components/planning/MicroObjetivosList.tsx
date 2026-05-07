/**
 * MicroObjetivosList Component
 * Display and manage micro-objectives with priorities and dependencies
 */

'use client';

import React, { useState } from 'react';
import { MicroObjetivo } from '@/app/lib/types/planning';
import './MicroObjetivosList.css';

interface MicroObjetivosListProps {
  objetivos: MicroObjetivo[];
  onToggleCompletion?: (objetivo_id: string, completed: boolean) => Promise<void>;
  loading?: boolean;
}

export function MicroObjetivosList({
  objetivos,
  onToggleCompletion,
  loading = false,
}: MicroObjetivosListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getPriorityBadge = (prioridad: string) => {
    const config: Record<
      string,
      { label: string; className: string }
    > = {
      baja: { label: '● Baja', className: 'priority-low' },
      normal: { label: '● Normal', className: 'priority-normal' },
      alta: { label: '● Alta', className: 'priority-high' },
    };
    const cfg = config[prioridad] || config.normal;
    return (
      <span className={`priority-badge ${cfg.className}`}>
        {cfg.label}
      </span>
    );
  };

  const handleToggle = async (objetivo: MicroObjetivo) => {
    if (onToggleCompletion) {
      try {
        await onToggleCompletion(objetivo.id, !objetivo.completado);
      } catch (err) {
        console.error('Failed to toggle completion:', err);
      }
    }
  };

  if (objetivos.length === 0) {
    return (
      <div className="micro-objetivos-list empty">
        <p>No hay micro-objetivos asociados a esta semana</p>
      </div>
    );
  }

  return (
    <div className="micro-objetivos-list">
      <div className="list-header">
        <h3>Micro-objetivos de Aprendizaje</h3>
        <span className="count-badge">{objetivos.length}</span>
      </div>

      <div className="objetivos-container">
        {objetivos.map((objetivo) => (
          <div
            key={objetivo.id}
            className={`objetivo-item ${objetivo.completado ? 'completed' : ''}`}
          >
            {/* Checkbox */}
            <div className="objetivo-checkbox">
              <input
                type="checkbox"
                checked={objetivo.completado}
                onChange={() => handleToggle(objetivo)}
                disabled={loading}
                aria-label={`Marcar como completado: ${objetivo.texto}`}
              />
            </div>

            {/* Main Content */}
            <div className="objetivo-content">
              <div className="objetivo-header">
                <button
                  className="objetivo-toggle"
                  onClick={() =>
                    setExpandedId(expandedId === objetivo.id ? null : objetivo.id)
                  }
                  aria-expanded={expandedId === objetivo.id}
                  aria-label={`Ver detalles: ${objetivo.texto}`}
                >
                  <span className="toggle-icon">
                    {expandedId === objetivo.id ? '▼' : '▶'}
                  </span>
                  <span className="objetivo-texto">{objetivo.texto}</span>
                </button>
              </div>

              <div className="objetivo-metadata">
                {getPriorityBadge(objetivo.prioridad)}
                {objetivo.depende_de && objetivo.depende_de.length > 0 && (
                  <span className="dependency-indicator">
                    🔗 Tiene dependencias
                  </span>
                )}
              </div>

              {/* Expanded Content */}
              {expandedId === objetivo.id && (
                <div className="objetivo-details">
                  <div className="detail-section">
                    <h4>Verificación</h4>
                    <p>{objetivo.verificable}</p>
                  </div>

                  {objetivo.depende_de && objetivo.depende_de.length > 0 && (
                    <div className="detail-section">
                      <h4>Depende De</h4>
                      <ul className="dependency-list">
                        {objetivo.depende_de.map((dep_id) => (
                          <li key={dep_id}>
                            <code>{dep_id}</code>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="detail-section meta">
                    <span>ID: {objetivo.id}</span>
                    {objetivo.created_at && (
                      <span>
                        Creado:{' '}
                        {new Date(objetivo.created_at).toLocaleDateString('es-ES')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
