import { useState, useEffect, useCallback } from 'react';
import { listBlocks, createBlock, updateBlock, deleteBlock } from '../api/blocks';
import { adminTheme } from '../styles/adminTheme';
import Modal from '../components/UI/Modal';
import type { BloqueResponse } from '../types';

interface Props {
  teacherCode: string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

interface EditState {
  id: number;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  tipo: string;
  materia: string;
  nivel_grado: string;
  ubicacion: string;
}

export default function AdminBloquesPanel({ teacherCode, showToast }: Props) {
  const [blocks, setBlocks] = useState<BloqueResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingBlock, setEditingBlock] = useState<EditState | null>(null);
  const [newBlock, setNewBlock] = useState({
    dia: 'LUNES', hora_inicio: '', hora_fin: '', tipo: 'clase',
    materia: '', nivel_grado: '', ubicacion: '',
  });

  const loadBlocks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listBlocks();
      setBlocks(data);
    } catch {
      setBlocks([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadBlocks(); }, [loadBlocks]);

  const handleSaveEdit = async () => {
    if (!editingBlock) return;
    try {
      await updateBlock(editingBlock.id, {
        dia: editingBlock.dia,
        hora_inicio: editingBlock.hora_inicio,
        hora_fin: editingBlock.hora_fin,
        tipo: editingBlock.tipo,
        materia: editingBlock.materia || null,
        nivel_grado: editingBlock.nivel_grado || null,
        ubicacion: editingBlock.ubicacion || null,
      });
      setEditingBlock(null);
      await loadBlocks();
      showToast('Bloque actualizado.', 'success');
    } catch {
      showToast('Error al actualizar el bloque.', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar este bloque horario?')) return;
    try {
      await deleteBlock(id);
      await loadBlocks();
      showToast('Bloque eliminado.', 'success');
    } catch {
      showToast('Error al eliminar bloque.', 'error');
    }
  };

  const handleCreate = async () => {
    if (!newBlock.hora_inicio || !newBlock.hora_fin) {
      showToast('Debes ingresar hora de inicio y fin.', 'warning');
      return;
    }
    try {
      await createBlock({
        teacher_code: teacherCode,
        dia: newBlock.dia,
        hora_inicio: newBlock.hora_inicio,
        hora_fin: newBlock.hora_fin,
        tipo: newBlock.tipo,
        materia: newBlock.materia || null,
        nivel_grado: newBlock.nivel_grado || null,
        ubicacion: newBlock.ubicacion || null,
      });
      await loadBlocks();
      setNewBlock({ dia: 'LUNES', hora_inicio: '', hora_fin: '', tipo: 'clase', materia: '', nivel_grado: '', ubicacion: '' });
      showToast('Bloque creado correctamente.', 'success');
    } catch {
      showToast('Error al crear bloque.', 'error');
    }
  };

  const blockStyle = (b: BloqueResponse) =>
    b.tipo === 'recreo' ? { background: '#fffbeb' } : undefined;

  const cellStyle = (b: BloqueResponse) => ({
    padding: '0.75rem 0.75rem',
    fontSize: '0.8125rem',
    color: b.tipo === 'recreo' ? '#b45309' : '#1e1e2f',
    borderBottom: '1px solid #e6e6eb',
    fontWeight: b.tipo === 'recreo' ? 500 : 400,
  });

  return (
    <div>
      {/* Create Block Form */}
      <div style={{ background: '#fff', border: '1px solid #e6e6eb', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '1rem' }}>
          Crear Bloque Horario
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
          <div>
            <label style={adminTheme.label}>Dia</label>
            <select value={newBlock.dia} onChange={e => setNewBlock({ ...newBlock, dia: e.target.value })} style={adminTheme.input}>
              {['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={adminTheme.label}>Hora Inicio</label>
            <input type="time" value={newBlock.hora_inicio}
              onChange={e => setNewBlock({ ...newBlock, hora_inicio: e.target.value })} style={adminTheme.input} />
          </div>
          <div>
            <label style={adminTheme.label}>Hora Fin</label>
            <input type="time" value={newBlock.hora_fin}
              onChange={e => setNewBlock({ ...newBlock, hora_fin: e.target.value })} style={adminTheme.input} />
          </div>
          <div>
            <label style={adminTheme.label}>Tipo</label>
            <select value={newBlock.tipo} onChange={e => setNewBlock({ ...newBlock, tipo: e.target.value })} style={adminTheme.input}>
              <option value="clase">Clase</option>
              <option value="recreo">Recreo</option>
            </select>
          </div>
          <div>
            <label style={adminTheme.label}>Materia</label>
            <input value={newBlock.materia} placeholder="Opcional"
              onChange={e => setNewBlock({ ...newBlock, materia: e.target.value })} style={adminTheme.input} />
          </div>
          <div>
            <label style={adminTheme.label}>Nivel / Grado</label>
            <input value={newBlock.nivel_grado} placeholder="Ej: 3er ano"
              onChange={e => setNewBlock({ ...newBlock, nivel_grado: e.target.value })} style={adminTheme.input} />
          </div>
          <div>
            <label style={adminTheme.label}>Ubicacion</label>
            <input value={newBlock.ubicacion} placeholder="Ej: Aula 101"
              onChange={e => setNewBlock({ ...newBlock, ubicacion: e.target.value })} style={adminTheme.input} />
          </div>
        </div>
        <button onClick={handleCreate} style={{ ...adminTheme.greenBtn, marginTop: '0.75rem' }}>
          Crear Bloque
        </button>
      </div>

      <p style={{ color: '#6b6b80', fontSize: '0.8125rem', marginBottom: '1rem' }}>
        Configura los bloques horarios del horario escolar.
      </p>

      <div style={adminTheme.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['DIAS', 'BLOQUE', 'HORA INICIO', 'HORA FIN', 'MATERIA', 'UBICACION', 'ACCIONES'].map(h => (
                <th key={h} style={{
                  padding: '0.75rem 0.75rem', fontSize: '0.6875rem', fontWeight: 600,
                  color: '#6b6b80', textTransform: 'uppercase', letterSpacing: '0.04em',
                  textAlign: 'left', borderBottom: '2px solid #e6e6eb', background: '#fff',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '1rem', textAlign: 'center', color: '#6b6b80' }}>
                  Cargando bloques...
                </td>
              </tr>
            ) : blocks.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '1rem', textAlign: 'center', color: '#6b6b80' }}>
                  No hay bloques configurados.
                </td>
              </tr>
            ) : (
              blocks.map(b => (
                <tr key={b.id} style={blockStyle(b)}>
                  <td style={cellStyle(b)}>{b.dia}</td>
                  <td style={cellStyle(b)}>{b.tipo === 'recreo' ? '\u2014' : b.orden}</td>
                  <td style={cellStyle(b)}>{b.hora_inicio}</td>
                  <td style={cellStyle(b)}>{b.hora_fin}</td>
                  <td style={cellStyle(b)}>
                    {b.tipo === 'recreo' ? (
                      <span style={{ fontSize: '0.6875rem', color: '#b45309' }}>Recreo</span>
                    ) : (b.materia || '\u2014')}
                  </td>
                  <td style={cellStyle(b)}>{b.ubicacion || '\u2014'}</td>
                  <td style={cellStyle(b)}>
                    <button
                      onClick={() => setEditingBlock({
                        id: b.id, dia: b.dia, hora_inicio: b.hora_inicio,
                        hora_fin: b.hora_fin, tipo: b.tipo, materia: b.materia || '',
                        nivel_grado: b.nivel_grado || '', ubicacion: b.ubicacion || '',
                      })}
                      style={{
                        padding: '0.25rem 0.5rem', border: 'none', borderRadius: '4px',
                        fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer',
                        background: 'rgba(92,106,196,0.08)', color: '#5c6ac4',
                      }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      style={{
                        marginLeft: '0.25rem',
                        padding: '0.25rem 0.5rem', border: 'none', borderRadius: '4px',
                        fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer',
                        background: '#fef2f2', color: '#dc2626',
                      }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingBlock}
        onClose={() => setEditingBlock(null)}
        title="Editar Bloque"
      >
        {editingBlock && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={adminTheme.label}>Dia</label>
                <select
                  value={editingBlock.dia}
                  onChange={e => setEditingBlock({ ...editingBlock, dia: e.target.value })}
                  style={adminTheme.input}
                >
                  {['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={adminTheme.label}>Tipo</label>
                <select
                  value={editingBlock.tipo}
                  onChange={e => setEditingBlock({ ...editingBlock, tipo: e.target.value })}
                  style={adminTheme.input}
                >
                  <option value="clase">Clase</option>
                  <option value="recreo">Recreo</option>
                </select>
              </div>
              <div>
                <label style={adminTheme.label}>Hora Inicio</label>
                <input type="time" value={editingBlock.hora_inicio}
                  onChange={e => setEditingBlock({ ...editingBlock, hora_inicio: e.target.value })}
                  style={adminTheme.input} />
              </div>
              <div>
                <label style={adminTheme.label}>Hora Fin</label>
                <input type="time" value={editingBlock.hora_fin}
                  onChange={e => setEditingBlock({ ...editingBlock, hora_fin: e.target.value })}
                  style={adminTheme.input} />
              </div>
              <div>
                <label style={adminTheme.label}>Materia</label>
                <input value={editingBlock.materia}
                  onChange={e => setEditingBlock({ ...editingBlock, materia: e.target.value })}
                  placeholder="Opcional" style={adminTheme.input} />
              </div>
              <div>
                <label style={adminTheme.label}>Nivel / Grado</label>
                <input value={editingBlock.nivel_grado}
                  onChange={e => setEditingBlock({ ...editingBlock, nivel_grado: e.target.value })}
                  placeholder="Ej: 3er ano" style={adminTheme.input} />
              </div>
            </div>
            <div>
              <label style={adminTheme.label}>Ubicacion</label>
              <input value={editingBlock.ubicacion}
                onChange={e => setEditingBlock({ ...editingBlock, ubicacion: e.target.value })}
                placeholder="Ej: Aula 101" style={adminTheme.input} />
            </div>
            <button onClick={handleSaveEdit} style={adminTheme.greenBtn}>
              💾 Guardar cambios
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
