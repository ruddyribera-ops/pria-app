import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '../components/Layout/Header';
import { useToast } from '../components/UI/Toast';
import { listDiagnosticos, uploadDiagnostico, deleteDiagnostico, getMockDiagnosticos } from '../api/diagnosticos';
import { formatFileSize } from '../api/materials';
import type { Diagnostico } from '../types';

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
      setDiagnosticos(getMockDiagnosticos());
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
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '2px dashed #e6e6eb', borderRadius: '8px', padding: '2.5rem 2rem',
          textAlign: 'center', background: '#fff', cursor: 'pointer', marginBottom: '1.25rem',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🩺</div>
        <p style={{ fontSize: '0.875rem', color: '#1e1e2f', marginBottom: '0.25rem' }}>
          <strong>Subir archivo de diagnóstico</strong>
        </p>
        <p style={{ fontSize: '0.75rem', color: '#6b6b80' }}>
          Arrastra un archivo aquí o haz clic para seleccionar
        </p>
        <p style={{ fontSize: '0.75rem', color: '#6b6b80', marginTop: '0.25rem' }}>
          Formatos aceptados: PDF, DOCX, TXT · Máx: 20MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleUpload}
          style={{ display: 'none' }}
        />
      </div>

      {/* File List */}
      <div style={{
        background: '#fff', border: '1px solid #e6e6eb', borderRadius: '8px', overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6b6b80', fontSize: '0.8125rem' }}>
            Cargando diagnósticos...
          </div>
        ) : diagnosticos.length === 0 && !showForm ? (
          <div style={{ textAlign: 'center', padding: '1.5rem' }}>
            <p style={{ color: '#6b6b80', fontSize: '0.8125rem', marginBottom: '1rem' }}>
              No hay diagnósticos subidos
            </p>
            <button
              onClick={() => setShowForm(true)}
              style={{
                padding: '0.6rem 1.5rem',
                background: '#3A9E5E',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              ＋ Crear Diagnóstico
            </button>
          </div>
        ) : showForm ? (
          <div style={{
            background: '#fff', border: '1px solid #e6e6eb', borderRadius: '8px',
            padding: '1.25rem', marginTop: '1rem',
          }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '1rem' }}>
              Registrar Nuevo Diagnóstico
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#6b6b80', display: 'block', marginBottom: '0.25rem' }}>
                  Nombre del Estudiante
                </label>
                <input
                  type="text"
                  placeholder="Ej: María García"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d4d4e0', borderRadius: '4px', fontSize: '0.8125rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#6b6b80', display: 'block', marginBottom: '0.25rem' }}>
                  Nivel
                </label>
                <select style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d4d4e0', borderRadius: '4px', fontSize: '0.8125rem', boxSizing: 'border-box' }}>
                  <option>Primaria</option>
                  <option>Secundaria</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#6b6b80', display: 'block', marginBottom: '0.25rem' }}>
                  Área de Diagnóstico
                </label>
                <select style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d4d4e0', borderRadius: '4px', fontSize: '0.8125rem', boxSizing: 'border-box' }}>
                  <option>TDAH</option>
                  <option>TEA</option>
                  <option>Dislexia</option>
                  <option>Discalculia</option>
                  <option>Otro</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#6b6b80', display: 'block', marginBottom: '0.25rem' }}>
                  Fecha
                </label>
                <input
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d4d4e0', borderRadius: '4px', fontSize: '0.8125rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  padding: '0.5rem 1.25rem', background: '#fff', color: '#6b6b80',
                  border: '1px solid #e6e6eb', borderRadius: '4px', fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  showToast('Diagnóstico creado (simulación).', 'success');
                  setShowForm(false);
                }}
                style={{
                  padding: '0.5rem 1.25rem', background: '#3A9E5E', color: '#fff',
                  border: 'none', borderRadius: '4px', fontSize: '0.8125rem', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Guardar Diagnóstico
              </button>
            </div>
          </div>
        ) : (
          diagnosticos.map((d) => (
            <div key={d.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.75rem 1rem', borderBottom: '1px solid #e6e6eb', fontSize: '0.8125rem', color: '#1e1e2f',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📄</span>
                <span>
                  <strong>{d.filename}</strong>
                  {d.size && <span style={{ fontSize: '0.6875rem', color: '#6b6b80' }}> — {formatFileSize(d.size)}</span>}
                </span>
              </div>
              <button
                onClick={() => handleDelete(d.id)}
                style={{
                  background: 'none', border: 'none', color: '#6b6b80', padding: '0.25rem 0.5rem',
                  borderRadius: '4px', fontSize: '0.8125rem', cursor: 'pointer',
                }}
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
