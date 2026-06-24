import { useState, useCallback, useEffect } from 'react';
import { listUsers, createUser, updateUser, deleteUser } from '../api/users';
import styles from '../styles/admin.module.css';
import StatusBadge from '../components/UI/StatusBadge';
import Modal from '../components/UI/Modal';
import type { UsuarioResponse } from '../types';

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function AdminUsuariosPanel({ showToast }: Props) {
  const [users, setUsers] = useState<UsuarioResponse[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUser, setNewUser] = useState({ nombre: '', correo: '', usuario: '', contrasena: '', rol: 'docente' });
  const [editingUser, setEditingUser] = useState<UsuarioResponse | null>(null);
  const [editUserData, setEditUserData] = useState({ nombre: '', correo: '', rol: '', estado: true });
  const [editUserLoading, setEditUserLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch {
      setUsers([]);
    }
    setLoadingUsers(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleCreateUser = async () => {
    if (!newUser.nombre.trim()) { showToast('⚠️ El nombre es requerido.', 'warning'); return; }
    if (!newUser.usuario.trim()) { showToast('⚠️ El usuario es requerido.', 'warning'); return; }
    if (!newUser.contrasena || newUser.contrasena.length < 6) { showToast('⚠️ La contraseña debe tener al menos 6 caracteres.', 'warning'); return; }
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
    } catch {
      showToast('⚠️ Error al crear usuario.', 'error');
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
    } catch (error) {
      showToast('⚠️ Error al actualizar el usuario.', 'error');
    } finally {
      setEditUserLoading(false);
    }
  };

  const handleEditUser = (u: UsuarioResponse) => {
    setEditingUser(u);
    setEditUserData({ nombre: u.nombre, correo: u.correo || '', rol: u.rol || u.role, estado: u.estado ?? true });
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('¿Eliminar este usuario?')) return;
    try {
      await deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      showToast('Usuario eliminado.', 'success');
    } catch {
      showToast('⚠️ Error al eliminar usuario.', 'error');
    }
  };

  return (
    <div>
      <div className={styles.adminCard} style={{ marginBottom: '1.25rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['NOMBRE', 'EMAIL', 'ROL', 'ESTADO', 'ACCIONES'].map(h => (
                <th key={h} style={{ padding: '0.625rem 0.75rem', fontSize: '0.6875rem', fontWeight: 600, color: '#6b6b80', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left', borderBottom: '2px solid #e6e6eb', background: '#fff' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loadingUsers ? (
              <tr><td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: '#6b6b80' }}>Cargando...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: '#6b6b80' }}>No hay usuarios.</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.id}>
                  <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.8125rem', borderBottom: '1px solid #e6e6eb' }}>{u.nombre}</td>
                  <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.8125rem', borderBottom: '1px solid #e6e6eb' }}>{u.correo || '—'}</td>
                  <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.8125rem', borderBottom: '1px solid #e6e6eb' }}>{u.rol === 'admin' ? 'Administrador' : 'Docente'}</td>
                  <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.8125rem', borderBottom: '1px solid #e6e6eb' }}><StatusBadge status={u.estado ?? false} /></td>
                  <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.8125rem', borderBottom: '1px solid #e6e6eb' }}>
                    <button type="button" onClick={() => handleEditUser(u)} aria-label={`Editar usuario ${u.nombre}`} style={{ padding: '0.25rem 0.5rem', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500, marginRight: '0.25rem', cursor: 'pointer', background: 'rgba(92,106,196,0.08)', color: '#5c6ac4' }}>✎ Editar</button>
                    <button type="button" onClick={() => handleDeleteUser(u.id)} aria-label={`Eliminar usuario ${u.nombre}`} style={{ padding: '0.25rem 0.5rem', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', background: '#fef2f2', color: '#dc2626' }}>✕ Eliminar</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create User Form */}
      <div style={{ background: '#fff', border: '1px solid #e6e6eb', borderRadius: '8px', padding: '1.25rem' }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '1rem' }}>➕ Crear Nuevo Usuario</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label htmlFor="new-user-nombre" className={styles.adminLabel}>Nombre Completo</label>
            <input id="new-user-nombre" value={newUser.nombre} onChange={e => setNewUser({ ...newUser, nombre: e.target.value })} placeholder="Ej: Juan Pérez" className={styles.adminInput} />
          </div>
          <div>
            <label htmlFor="new-user-correo" className={styles.adminLabel}>Email</label>
            <input id="new-user-correo" value={newUser.correo} onChange={e => setNewUser({ ...newUser, correo: e.target.value })} placeholder="Ej: jperez@pria.edu" className={styles.adminInput} />
          </div>
          <div>
            <label htmlFor="new-user-usuario" className={styles.adminLabel}>Usuario</label>
            <input id="new-user-usuario" value={newUser.usuario} onChange={e => setNewUser({ ...newUser, usuario: e.target.value })} placeholder="Ej: jperez" className={styles.adminInput} />
          </div>
          <div>
            <label htmlFor="new-user-contrasena" className={styles.adminLabel}>Contraseña</label>
            <input id="new-user-contrasena" type="password" value={newUser.contrasena} onChange={e => setNewUser({ ...newUser, contrasena: e.target.value })} placeholder="••••••••" className={styles.adminInput} />
          </div>
          <div>
            <label htmlFor="new-user-rol" className={styles.adminLabel}>Rol</label>
            <select id="new-user-rol" value={newUser.rol} onChange={e => setNewUser({ ...newUser, rol: e.target.value })} className={styles.adminInput}>
              <option value="docente">Docente</option><option value="admin">Administrador</option>
            </select>
          </div>
        </div>
        <button type="button" onClick={handleCreateUser} className={styles.adminGreenBtn}>💾 Guardar Usuario</button>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="✎ Editar Usuario">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><label htmlFor="edit-user-nombre" className={styles.adminLabel}>Nombre</label><input id="edit-user-nombre" value={editUserData.nombre} onChange={e => setEditUserData({ ...editUserData, nombre: e.target.value })} className={styles.adminInput} /></div>
          <div><label htmlFor="edit-user-correo" className={styles.adminLabel}>Correo</label><input id="edit-user-correo" value={editUserData.correo} onChange={e => setEditUserData({ ...editUserData, correo: e.target.value })} className={styles.adminInput} /></div>
          <div>
            <label htmlFor="edit-user-rol" className={styles.adminLabel}>Rol</label>
            <select id="edit-user-rol" value={editUserData.rol} onChange={e => setEditUserData({ ...editUserData, rol: e.target.value })} className={styles.adminInput}>
              <option value="docente">Docente</option><option value="admin">Administrador</option>
            </select>
          </div>
          <div>
            <label htmlFor="edit-user-estado" className={styles.adminLabel}>Estado</label>
            <select id="edit-user-estado" value={editUserData.estado ? 'true' : 'false'} onChange={e => setEditUserData({ ...editUserData, estado: e.target.value === 'true' })} className={styles.adminInput}>
              <option value="true">Activo</option><option value="false">Inactivo</option>
            </select>
          </div>
          <button type="button" onClick={handleSaveEditUser} disabled={editUserLoading} style={{ ...styles.adminGreenBtn, opacity: editUserLoading ? 0.6 : 1, cursor: editUserLoading ? 'not-allowed' : 'pointer', width: '100%', textAlign: 'center' }}>
            {editUserLoading ? 'Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
