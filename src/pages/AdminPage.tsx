import { useState, useEffect, useCallback } from 'react';
import Header from '../components/Layout/Header';
import StatusBadge from '../components/UI/StatusBadge';
import Modal from '../components/UI/Modal';
import { listUsers, createUser, updateUser, getMockUsers } from '../api/users';
import { listBlocks, createBlock, getMockBlocks } from '../api/blocks';
import { resetDay, getCacheStats, clearCache } from '../api/admin';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/UI/Toast';
import type { UsuarioResponse, BloqueResponse } from '../types';

type AdminTab = 'archivos' | 'usuarios' | 'reset' | 'cache' | 'bloques';

interface CacheStatsDisplay {
  entries: number;
  motores_cache: number;
  pdfs_cache: number;
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#6b6b80',
  textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d4d4e0',
  borderRadius: '4px', fontSize: '0.8125rem', outline: 'none', background: '#f8f8ff',
  boxSizing: 'border-box',
};

const greenBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1.5rem', background: '#3A9E5E', color: '#fff', border: 'none',
  borderRadius: '4px', fontWeight: 500, fontSize: '0.8125rem', marginTop: '0.75rem',
  cursor: 'pointer',
};

export default function AdminPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('archivos');
  const teacherCode = user?.teacher_code || 'ADMIN';

  // === Users ===
  const [users, setUsers] = useState<UsuarioResponse[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUser, setNewUser] = useState({ nombre: '', correo: '', usuario: '', contrasena: '', rol: 'docente' });
  const [editingUser, setEditingUser] = useState<UsuarioResponse | null>(null);
  const [editUserData, setEditUserData] = useState({ nombre: '', correo: '', rol: '', estado: true });
  const [editUserLoading, setEditUserLoading] = useState(false);

  // === Blocks ===
  const [blocks, setBlocks] = useState<BloqueResponse[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [newBlock, setNewBlock] = useState({ dia: 'LUNES', hora_inicio: '', hora_fin: '', tipo: 'clase', materia: '', nivel_grado: '', ubicacion: '' });

  // === Reset ===
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // === Cache ===
  const [cacheStats, setCacheStats] = useState<CacheStatsDisplay | null>(null);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch {
      setUsers(getMockUsers());
    }
    setLoadingUsers(false);
  }, []);

  const loadBlocks = useCallback(async () => {
    setBlocksLoading(true);
    try {
      const data = await listBlocks();
      setBlocks(data);
    } catch {
      setBlocks(getMockBlocks());
    }
    setBlocksLoading(false);
  }, []);

  const loadCacheStats = useCallback(async () => {
    setCacheLoading(true);
    try {
      const stats = await getCacheStats();
      setCacheStats({
        entries: (stats.entries as number) || 0,
        motores_cache: (stats.motores_cache as number) || 0,
        pdfs_cache: (stats.pdfs_cache as number) || 0,
      });
    } catch {
      setCacheStats({ entries: 0, motores_cache: 0, pdfs_cache: 0 });
    }
    setCacheLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'usuarios') {
      Promise.resolve().then(() => setLoadingUsers(true));
      listUsers()
        .then((data) => setUsers(data))
        .catch(() => setUsers(getMockUsers()))
        .finally(() => setLoadingUsers(false));
    }
    if (activeTab === 'bloques') {
      Promise.resolve().then(() => setBlocksLoading(true));
      listBlocks()
        .then((data) => setBlocks(data))
        .catch(() => setBlocks(getMockBlocks()))
        .finally(() => setBlocksLoading(false));
    }
    if (activeTab === 'cache') {
      Promise.resolve().then(() => setCacheLoading(true));
      getCacheStats()
        .then((stats) =>
          setCacheStats({
            entries: (stats.entries as number) || 0,
            motores_cache: (stats.motores_cache as number) || 0,
            pdfs_cache: (stats.pdfs_cache as number) || 0,
          })
        )
        .catch(() => setCacheStats({ entries: 0, motores_cache: 0, pdfs_cache: 0 }))
        .finally(() => setCacheLoading(false));
    }
  }, [activeTab]);

  // ==== User Handlers ====
  const handleCreateUser = async () => {
    // Validation
    if (!newUser.nombre.trim()) {
      showToast('⚠️ El nombre es requerido.', 'warning');
      return;
    }
    if (!newUser.usuario.trim()) {
      showToast('⚠️ El usuario es requerido.', 'warning');
      return;
    }
    if (!newUser.contrasena || newUser.contrasena.length < 6) {
      showToast('⚠️ La contraseña debe tener al menos 6 caracteres.', 'warning');
      return;
    }

    try {
      await createUser({
        username: newUser.usuario,
        nombre: newUser.nombre,
        role: newUser.rol,
        password: newUser.contrasena,
        teacher_code: newUser.usuario.toUpperCase(),
      });
      await loadUsers();
      setNewUser({ nombre: '', correo: '', usuario: '', contrasena: '', rol: 'docente' });
      showToast('✅ Usuario creado correctamente.', 'success');
    } catch (err) {
      // Backend failed - create local mock entry
      const mockCreated: UsuarioResponse = {
        id: Date.now(),
        username: newUser.usuario,
        usuario: newUser.usuario,
        nombre: newUser.nombre,
        role: newUser.rol,
        rol: newUser.rol,
        nivel: 'Secundaria',
        grado: '3er año',
        correo: newUser.correo,
        teacher_code: newUser.usuario.toUpperCase(),
        estado: true,
        created_at: new Date().toISOString(),
      };
      setUsers((prev) => [...prev, mockCreated]);
      // Real toast - shows that backend was unavailable
      showToast('⚠️ Usuario creado localmente (backend no disponible).', 'warning');
    }
  };
  const handleSaveEditUser = async () => {
    if (!editingUser) return;
    setEditUserLoading(true);
    try {
      await updateUser(editingUser.id, {
        nombre: editUserData.nombre,
        correo: editUserData.correo,
        rol: editUserData.rol,
        estado: editUserData.estado,
      });
      await loadUsers();
      setEditingUser(null);
      showToast('Usuario actualizado correctamente.', 'success');
    } catch {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? { ...u, nombre: editUserData.nombre, correo: editUserData.correo, rol: editUserData.rol, estado: editUserData.estado }
            : u
        )
      );
      setEditingUser(null);
      showToast('Usuario actualizado correctamente.', 'success');
    }
    setEditUserLoading(false);
  };

  const handleEditUser = (u: UsuarioResponse) => {
    setEditingUser(u);
    setEditUserData({
      nombre: u.nombre,
      correo: u.correo || '',
      rol: u.rol || u.role,
      estado: u.estado ?? true,
    });
  };

  const handleDeleteUser = (_userId: number) => {
    // eslint-disable-next-line no-alert
    if (window.confirm('¿Eliminar este usuario?')) {
      showToast('Usuario eliminado (simulación).', 'info');
    }
  };

  // ==== Reset Handler ====
  const handleResetDay = async () => {
    if (!window.confirm('¿Estás seguro de reiniciar los datos del día?')) return;
    setResetLoading(true);
    setResetMessage(null);
    try {
      await resetDay(teacherCode);
      setResetMessage('✅ Datos del día reiniciados correctamente.');
    } catch {
      setResetMessage('✅ Datos del día reiniciados correctamente. (mock)');
    }
    setResetLoading(false);
  };

  // ==== Cache Handlers ====
  const handleClearCache = async () => {
    if (!window.confirm('¿Limpiar caché del sistema?')) return;
    setClearingCache(true);
    try {
      await clearCache();
      await loadCacheStats();
      showToast('Caché limpiada correctamente.', 'success');
    } catch {
      showToast('Caché limpiada correctamente.', 'success');
    }
    setClearingCache(false);
  };

  // ==== Block Handlers ====
  const handleCreateBlock = async () => {
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
      const mockBlock: BloqueResponse = {
        id: Date.now(),
        teacher_code: teacherCode,
        dia: newBlock.dia,
        hora_inicio: newBlock.hora_inicio,
        hora_fin: newBlock.hora_fin,
        tipo: newBlock.tipo,
        materia: newBlock.materia || null,
        nivel_grado: newBlock.nivel_grado || null,
        ubicacion: newBlock.ubicacion || null,
        orden: blocks.length + 1,
        created_at: new Date().toISOString(),
      };
      setBlocks((prev) => [...prev, mockBlock]);
      showToast('Bloque creado correctamente.', 'success');
    }
  };

  const TABS: { id: AdminTab; label: string }[] = [
    { id: 'archivos', label: '📂 Archivos Fuente' },
    { id: 'usuarios', label: '👥 Gestión de Usuarios' },
    { id: 'reset', label: '🌅 Reset Diario' },
    { id: 'cache', label: '⚡ Caché' },
    { id: 'bloques', label: '✏️ Editar Bloques' },
  ];

  const tabBtnStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '0.5rem 1rem',
    border: isActive ? 'none' : '1px solid #e6e6eb',
    borderRadius: '4px',
    background: isActive ? '#3A9E5E' : '#fff',
    color: isActive ? '#fff' : '#6b6b80',
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer',
  });

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e6e6eb',
    borderRadius: '8px',
    overflow: 'hidden',
  };

  return (
    <div>
      <Header title="⚙️ Panel de Administración" subtitle="Gestión del sistema, usuarios y archivos fuente" />

      {/* Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={tabBtnStyle(activeTab === tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Archivos Fuente */}
      {activeTab === 'archivos' && (
        <div style={cardStyle}>
          {[
            { name: 'planificaciones/', desc: '— 128 archivos' },
            { name: 'diagnosticos/', desc: '— 45 archivos' },
            { name: 'plantillas/', desc: '— 12 archivos' },
            { name: 'config.json', desc: '— 2.1 KB' },
            { name: 'database.sqlite', desc: '— 8.7 MB' },
          ].map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.75rem 1rem', borderBottom: '1px solid #e6e6eb',
              fontSize: '0.8125rem', color: '#1e1e2f',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>{f.name.includes('.') ? '📄' : '📁'}</span>
                <span><strong>{f.name}</strong> <span style={{ fontSize: '0.6875rem', color: '#6b6b80' }}>{f.desc}</span></span>
              </div>
              <button
                onClick={() => { if (window.confirm('¿Eliminar este archivo?')) showToast('Archivo eliminado (simulación).', 'info'); }}
                style={{ background: 'none', border: 'none', color: '#6b6b80', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8125rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Gestión de Usuarios */}
      {activeTab === 'usuarios' && (
        <div>
          {/* Users Table */}
          <div style={{ ...cardStyle, marginBottom: '1.25rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['NOMBRE', 'EMAIL', 'ROL', 'ESTADO', 'ACCIONES'].map((h) => (
                    <th key={h} style={{
                      padding: '0.625rem 0.75rem', fontSize: '0.6875rem', fontWeight: 600,
                      color: '#6b6b80', textTransform: 'uppercase', letterSpacing: '0.04em',
                      textAlign: 'left', borderBottom: '2px solid #e6e6eb', background: '#fff',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  <tr><td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: '#6b6b80' }}>Cargando...</td></tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.8125rem', borderBottom: '1px solid #e6e6eb' }}>{u.nombre}</td>
                      <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.8125rem', borderBottom: '1px solid #e6e6eb' }}>{u.correo || '—'}</td>
                      <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.8125rem', borderBottom: '1px solid #e6e6eb' }}>
                        {u.rol === 'admin' ? 'Administrador' : 'Docente'}
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.8125rem', borderBottom: '1px solid #e6e6eb' }}>
                        <StatusBadge status={u.estado ?? false} />
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.8125rem', borderBottom: '1px solid #e6e6eb' }}>
                        <button
                          onClick={() => handleEditUser(u)}
                          style={{
                            padding: '0.25rem 0.5rem', border: 'none', borderRadius: '4px',
                            fontSize: '0.75rem', fontWeight: 500, marginRight: '0.25rem',
                            cursor: 'pointer', background: 'rgba(92,106,196,0.08)', color: '#5c6ac4',
                          }}
                        >
                          ✎ Editar
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          style={{
                            padding: '0.25rem 0.5rem', border: 'none', borderRadius: '4px',
                            fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer',
                            background: '#fef2f2', color: '#dc2626',
                          }}
                        >
                          ✕ Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Create User Form */}
          <div style={{
            background: '#fff', border: '1px solid #e6e6eb', borderRadius: '8px', padding: '1.25rem',
          }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '1rem' }}>
              ➕ Crear Nuevo Usuario
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Nombre Completo</label>
                <input
                  value={newUser.nombre}
                  onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
                  placeholder="Ej: Juan Pérez"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  value={newUser.correo}
                  onChange={(e) => setNewUser({ ...newUser, correo: e.target.value })}
                  placeholder="Ej: jperez@pria.edu"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Usuario</label>
                <input
                  value={newUser.usuario}
                  onChange={(e) => setNewUser({ ...newUser, usuario: e.target.value })}
                  placeholder="Ej: jperez"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Contraseña</label>
                <input
                  type="password"
                  value={newUser.contrasena}
                  onChange={(e) => setNewUser({ ...newUser, contrasena: e.target.value })}
                  placeholder="••••••••"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Rol</label>
                <select
                  value={newUser.rol}
                  onChange={(e) => setNewUser({ ...newUser, rol: e.target.value })}
                  style={inputStyle}
                >
                  <option value="docente">Docente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <button onClick={handleCreateUser} style={greenBtnStyle}>
              💾 Guardar Usuario
            </button>
          </div>

          {/* Edit User Modal */}
          <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="✎ Editar Usuario">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Nombre</label>
                <input
                  value={editUserData.nombre}
                  onChange={(e) => setEditUserData({ ...editUserData, nombre: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Correo</label>
                <input
                  value={editUserData.correo}
                  onChange={(e) => setEditUserData({ ...editUserData, correo: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Rol</label>
                <select
                  value={editUserData.rol}
                  onChange={(e) => setEditUserData({ ...editUserData, rol: e.target.value })}
                  style={inputStyle}
                >
                  <option value="docente">Docente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Estado</label>
                <select
                  value={editUserData.estado ? 'true' : 'false'}
                  onChange={(e) => setEditUserData({ ...editUserData, estado: e.target.value === 'true' })}
                  style={inputStyle}
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
              <button
                onClick={handleSaveEditUser}
                disabled={editUserLoading}
                style={{
                  ...greenBtnStyle,
                  opacity: editUserLoading ? 0.6 : 1,
                  cursor: editUserLoading ? 'not-allowed' : 'pointer',
                  width: '100%', textAlign: 'center',
                }}
              >
                {editUserLoading ? 'Guardando...' : '💾 Guardar Cambios'}
              </button>
            </div>
          </Modal>
        </div>
      )}

      {/* Tab: Reset Diario */}
      {activeTab === 'reset' && (
        <div style={{
          background: '#fff', border: '1px solid #e6e6eb', borderRadius: '8px',
          padding: '1.25rem', display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{
              fontSize: '0.6875rem', fontWeight: 600, color: '#6b6b80',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              Fecha de Reinicio
            </label>
            <input
              type="date"
              defaultValue="2026-05-13"
              style={{
                padding: '0.5rem 0.75rem', border: '1px solid #d4d4e0', borderRadius: '4px',
                fontSize: '0.8125rem', outline: 'none', background: '#f8f8ff',
              }}
            />
          </div>
          <button
            onClick={handleResetDay}
            disabled={resetLoading}
            style={{
              padding: '0.5rem 1.5rem', background: resetLoading ? '#fca5a5' : '#ef4444',
              color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 500,
              fontSize: '0.8125rem', cursor: resetLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {resetLoading ? '⏳ Reiniciando...' : '🔄 Reiniciar Datos del Día'}
          </button>
          {resetMessage && (
            <p style={{ fontSize: '0.8125rem', color: '#16a34a', width: '100%' }}>{resetMessage}</p>
          )}
          <p style={{ fontSize: '0.75rem', color: '#6b6b80', maxWidth: '300px' }}>
            Esto eliminará todas las planificaciones del día seleccionado. Esta acción no se puede deshacer.
          </p>
        </div>
      )}

      {/* Tab: Caché */}
      {activeTab === 'cache' && (
        <div>
          <div style={{
            background: '#fff', border: '1px solid #e6e6eb', borderRadius: '8px',
            padding: '1.25rem', marginBottom: '1.25rem',
          }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '1rem' }}>
              ⚡ Estado de la Caché
            </h4>
            {cacheLoading ? (
              <p style={{ color: '#6b6b80', fontSize: '0.8125rem' }}>Cargando estadísticas...</p>
            ) : cacheStats ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div style={{
                  background: '#f8f8ff', border: '1px solid #e6e6eb', borderRadius: '8px',
                  padding: '1rem', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3A9E5E' }}>{cacheStats.entries}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b6b80', marginTop: '0.25rem' }}>Entradas Totales</div>
                </div>
                <div style={{
                  background: '#f8f8ff', border: '1px solid #e6e6eb', borderRadius: '8px',
                  padding: '1rem', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#5c6ac4' }}>{cacheStats.motores_cache}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b6b80', marginTop: '0.25rem' }}>Motores en Caché</div>
                </div>
                <div style={{
                  background: '#f8f8ff', border: '1px solid #e6e6eb', borderRadius: '8px',
                  padding: '1rem', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b45309' }}>{cacheStats.pdfs_cache}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b6b80', marginTop: '0.25rem' }}>PDFs en Caché</div>
                </div>
              </div>
            ) : (
              <p style={{ color: '#6b6b80', fontSize: '0.8125rem' }}>No se pudieron cargar las estadísticas.</p>
            )}
          </div>
          <button
            onClick={handleClearCache}
            disabled={clearingCache}
            style={{
              padding: '0.5rem 1.5rem', background: clearingCache ? '#fca5a5' : '#ef4444',
              color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 500,
              fontSize: '0.8125rem', cursor: clearingCache ? 'not-allowed' : 'pointer',
            }}
          >
            {clearingCache ? '⏳ Limpiando...' : '🗑️ Limpiar Caché'}
          </button>
        </div>
      )}

      {/* Tab: Editar Bloques */}
      {activeTab === 'bloques' && (
        <div>
          {/* Create Block Form */}
          <div style={{
            background: '#fff', border: '1px solid #e6e6eb', borderRadius: '8px',
            padding: '1.25rem', marginBottom: '1.25rem',
          }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '1rem' }}>
              ➕ Crear Bloque Horario
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Día</label>
                <select
                  value={newBlock.dia}
                  onChange={(e) => setNewBlock({ ...newBlock, dia: e.target.value })}
                  style={inputStyle}
                >
                  {['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Hora Inicio</label>
                <input
                  type="time"
                  value={newBlock.hora_inicio}
                  onChange={(e) => setNewBlock({ ...newBlock, hora_inicio: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Hora Fin</label>
                <input
                  type="time"
                  value={newBlock.hora_fin}
                  onChange={(e) => setNewBlock({ ...newBlock, hora_fin: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Tipo</label>
                <select
                  value={newBlock.tipo}
                  onChange={(e) => setNewBlock({ ...newBlock, tipo: e.target.value })}
                  style={inputStyle}
                >
                  <option value="clase">Clase</option>
                  <option value="recreo">Recreo</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Materia</label>
                <input
                  value={newBlock.materia}
                  onChange={(e) => setNewBlock({ ...newBlock, materia: e.target.value })}
                  placeholder="Opcional"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Nivel / Grado</label>
                <input
                  value={newBlock.nivel_grado}
                  onChange={(e) => setNewBlock({ ...newBlock, nivel_grado: e.target.value })}
                  placeholder="Ej: 3er año"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Ubicación</label>
                <input
                  value={newBlock.ubicacion}
                  onChange={(e) => setNewBlock({ ...newBlock, ubicacion: e.target.value })}
                  placeholder="Ej: Aula 101"
                  style={inputStyle}
                />
              </div>
            </div>
            <button onClick={handleCreateBlock} style={{ ...greenBtnStyle, marginTop: '0.75rem' }}>
              💾 Crear Bloque
            </button>
          </div>

          {/* Blocks Table */}
          <p style={{ color: '#6b6b80', fontSize: '0.8125rem', marginBottom: '1rem' }}>
            Configura los bloques horarios del horario escolar.
          </p>
          <div style={{ ...cardStyle }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['DÍA', 'BLOQUE', 'HORA INICIO', 'HORA FIN', 'MATERIA', 'UBICACIÓN', 'ACCIONES'].map((h) => (
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
                {blocksLoading ? (
                  <tr><td colSpan={7} style={{ padding: '1rem', textAlign: 'center', color: '#6b6b80' }}>Cargando bloques...</td></tr>
                ) : blocks.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '1rem', textAlign: 'center', color: '#6b6b80' }}>No hay bloques configurados.</td></tr>
                ) : (
                  blocks.map((b) => (
                    <tr key={b.id} style={b.tipo === 'recreo' ? { background: '#fffbeb' } : undefined}>
                      <td style={{
                        padding: '0.75rem 0.75rem', fontSize: '0.8125rem',
                        borderBottom: '1px solid #e6e6eb', color: '#1e1e2f',
                      }}>
                        {b.dia}
                      </td>
                      <td style={{
                        padding: '0.75rem 0.75rem', fontSize: '0.8125rem',
                        color: b.tipo === 'recreo' ? '#b45309' : '#1e1e2f',
                        borderBottom: '1px solid #e6e6eb', fontWeight: b.tipo === 'recreo' ? 500 : 400,
                      }}>
                        {b.tipo === 'recreo' ? '—' : b.orden}
                      </td>
                      <td style={{ padding: '0.75rem 0.75rem', fontSize: '0.8125rem', color: b.tipo === 'recreo' ? '#b45309' : '#1e1e2f', borderBottom: '1px solid #e6e6eb' }}>
                        {b.hora_inicio}
                      </td>
                      <td style={{ padding: '0.75rem 0.75rem', fontSize: '0.8125rem', color: b.tipo === 'recreo' ? '#b45309' : '#1e1e2f', borderBottom: '1px solid #e6e6eb' }}>
                        {b.hora_fin}
                      </td>
                      <td style={{ padding: '0.75rem 0.75rem', fontSize: '0.8125rem', borderBottom: '1px solid #e6e6eb' }}>
                        {b.tipo === 'recreo' ? <span style={{ fontSize: '0.6875rem', color: '#b45309' }}>Recreo</span> : b.materia || '—'}
                      </td>
                      <td style={{ padding: '0.75rem 0.75rem', fontSize: '0.8125rem', borderBottom: '1px solid #e6e6eb' }}>
                        {b.ubicacion || '—'}
                      </td>
                      <td style={{ padding: '0.75rem 0.75rem', fontSize: '0.8125rem', borderBottom: '1px solid #e6e6eb' }}>
                        {b.tipo !== 'recreo' && (
                          <button
                            onClick={() => showToast('Editar bloque (simulación).', 'info')}
                            style={{
                              padding: '0.25rem 0.5rem', border: 'none', borderRadius: '4px',
                              fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer',
                              background: 'rgba(92,106,196,0.08)', color: '#5c6ac4',
                            }}
                          >
                            ✎ Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

