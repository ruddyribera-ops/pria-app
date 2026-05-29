import { useState } from 'react';
import Header from '../components/Layout/Header';
import { adminTheme } from '../styles/adminTheme';
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
  const { user } = (window as any).__useAuth?.() || {};
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('archivos');
  const teacherCode = user?.teacher_code || 'ADMIN';

  return (
    <div>
      <Header title="⚙️ Panel de Administración" subtitle="Gestión del sistema, usuarios y archivos fuente" />

      {/* Tab bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={adminTheme.tabBtn(activeTab === tab.id)}>
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
