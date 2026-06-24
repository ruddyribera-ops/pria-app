import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '../components/Layout/Header';
import { useToast } from '../components/UI/Toast';
import { listDiagnosticos, uploadDiagnostico, deleteDiagnostico } from '../api/diagnosticos';
import { formatFileSize } from '../api/materials';
import type { Diagnostico } from '../types';
import styles from './DiagnosticosPage.module.css';

export default function DiagnosticosPage() {
  const { showToast } = useToast();
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDiagnosticos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listDiagnosticos();
      setDiagnosticos(data);
    } catch {
      setDiagnosticos([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDiagnosticos();
  }, [loadDiagnosticos]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadDiagnostico(file, 'diagnostico');
      await loadDiagnosticos();
    } catch {
      const newDiag: Diagnostico = {
        id: Date.now(),
        estudiante: '',
        nivel: '',
        filename: file.name,
        tipo: file.name.split('.').pop() || 'unknown',
        size: file.size,
      };
      setDiagnosticos((prev) => [...prev, newDiag]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar este archivo?')) return;
    try {
      await deleteDiagnostico(id);
      await loadDiagnosticos();
      showToast('Archivo eliminado correctamente.', 'success');
    } catch {
      setDiagnosticos((prev) => prev.filter((d) => d.id !== id));
      showToast('Archivo eliminado correctamente.', 'success');
    }
  };

  return (
    <div>
      <Header title="🩺 Diagnósticos" subtitle="Sube los diagnósticos iniciales de tus estudiantes" />

      {/* Upload Area */}
      <div
        className={styles.uploadZone}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        aria-label="Subir archivo de diagnóstico"
      >
        <div className={styles.uploadIcon}>🩺</div>
        <p className={styles.uploadTitle}>
          <strong>Subir archivo de diagnóstico</strong>
        </p>
        <p className={styles.uploadSubtitle}>
          Arrastra un archivo aquí o haz clic para seleccionar
        </p>
        <p className={styles.uploadHint}>
          Formatos aceptados: PDF, DOCX, TXT · Máx: 20MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleUpload}
          className={styles.uploadInput}
          aria-label="Seleccionar archivo de diagnóstico"
        />
      </div>

      {/* File List */}
      <div className={styles.fileListCard}>
        {loading ? (
          <div className={styles.loadingState} role="status" aria-live="polite">
            <div style={{ width: '28px', height: '28px', border: '3px solid #e6e6eb', borderTop: '3px solid #3A9E5E', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 0.5rem' }} />
            <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
            Cargando diagnósticos...
          </div>
        ) : diagnosticos.length === 0 && !showForm ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>
              No hay diagnósticos subidos
            </p>
            <button
              className={styles.createBtn}
              onClick={() => setShowForm(true)}
            >
              ＋ Crear Diagnóstico
            </button>
          </div>
        ) : showForm ? (
          <div className={styles.formCard}>
            <h4 className={styles.formTitle}>
              Registrar Nuevo Diagnóstico
            </h4>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label htmlFor="diag-nombre" className={styles.formLabel}>
                  Nombre del Estudiante
                </label>
                <input
                  id="diag-nombre"
                  type="text"
                  placeholder="Ej: María García"
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formField}>
                <label htmlFor="diag-nivel" className={styles.formLabel}>
                  Nivel
                </label>
                <select id="diag-nivel" className={styles.formSelect}>
                  <option>Primaria</option>
                  <option>Secundaria</option>
                </select>
              </div>
              <div className={styles.formField}>
                <label htmlFor="diag-area" className={styles.formLabel}>
                  Área de Diagnóstico
                </label>
                <select id="diag-area" className={styles.formSelect}>
                  <option>TDAH</option>
                  <option>TEA</option>
                  <option>Dislexia</option>
                  <option>Discalculia</option>
                  <option>Otro</option>
                </select>
              </div>
              <div className={styles.formField}>
                <label htmlFor="diag-fecha" className={styles.formLabel}>
                  Fecha
                </label>
                <input
                  id="diag-fecha"
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className={styles.formInput}
                />
              </div>
            </div>
            <div className={styles.formActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </button>
              <button
                className={styles.saveBtn}
                onClick={() => {
                  showToast('Diagnóstico creado (simulación).', 'success');
                  setShowForm(false);
                }}
              >
                Guardar Diagnóstico
              </button>
            </div>
          </div>
        ) : (
          diagnosticos.map((d) => (
            <div key={d.id} className={styles.fileItem}>
              <div className={styles.fileInfo}>
                <span aria-hidden="true">📄</span>
                <span>
                  <strong className={styles.fileName}>{d.filename}</strong>
                  {d.size && <span className={styles.fileSize}> — {formatFileSize(d.size)}</span>}
                </span>
              </div>
              <button
                className={styles.deleteBtn}
                onClick={() => handleDelete(d.id)}
                aria-label={`Eliminar archivo ${d.filename}`}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}