import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Layout/Header';
import adminStyles from '../styles/admin.module.css';
import styles from './AdminPage.module.css';
import { useToast } from '../components/UI/Toast';
import AdminArchivosPanel from './AdminArchivosPanel';
import AdminUsuariosPanel from './AdminUsuariosPanel';
import AdminResetPanel from './AdminResetPanel';
import AdminCachePanel from './AdminCachePanel';
import AdminBloquesPanel from './AdminBloquesPanel';

type AdminTab = 'archivos' | 'usuarios' | 'reset' | 'cache' | 'bloques';

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'archivos', label: '📂 Archivos Fuente' },
  { id: 'usuarios', label: '👥 Gestión de Usuarios' },
  { id: 'reset', label: '🌅 Reset Diario' },
  { id: 'cache', label: '⚡ Caché' },
  { id: 'bloques', label: '✏️ Editar Bloques' },
];

export default function AdminPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('archivos');
  const teacherCode = user?.teacher_code || 'ADMIN';

  return (
    <div>
      <Header title="⚙️ Panel de Administración" subtitle="Gestión del sistema, usuarios y archivos fuente" />

      {/* Tab bar */}
      <div className={styles.tabBar}>
        {TABS.map(tab => (
          <button type="button" key={tab.id} onClick={() => setActiveTab(tab.id)} className={activeTab === tab.id ? adminStyles.adminTabBtnActive : adminStyles.adminTabBtn}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      {activeTab === 'archivos' && <AdminArchivosPanel />}
      {activeTab === 'usuarios' && <AdminUsuariosPanel showToast={showToast} />}
      {activeTab === 'reset' && <AdminResetPanel teacherCode={teacherCode} />}
      {activeTab === 'cache' && <AdminCachePanel />}
      {activeTab === 'bloques' && <AdminBloquesPanel teacherCode={teacherCode} showToast={showToast} />}
    </div>
  );
}
