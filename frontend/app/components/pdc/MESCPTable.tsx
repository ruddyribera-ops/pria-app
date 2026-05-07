'use client';

import { useState } from 'react';
import { MESCPRow } from '@/app/lib/types/pdc';

interface MESCPTableProps {
  rows: MESCPRow[];
  pdc_id: string | number;
  onAddRow: (data: Omit<MESCPRow, 'id' | 'pdc_id'>) => Promise<void>;
  onUpdateRow: (row_id: string, data: Partial<MESCPRow>) => Promise<void>;
  onDeleteRow: (row_id: string) => Promise<void>;
  loading?: boolean;
}

interface EditingRow {
  id: string | null;
  objetivo: string;
  contenidos: string;
  momentos: string;
  recursos: string;
  periodos: number;
  criterios: string;
}

export default function MESCPTable({
  rows,
  pdc_id,
  onAddRow,
  onUpdateRow,
  onDeleteRow,
  loading = false,
}: MESCPTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditingRow>({
    id: null,
    objetivo: '',
    contenidos: '',
    momentos: '',
    recursos: '',
    periodos: 1,
    criterios: '',
  });
  const [showNewForm, setShowNewForm] = useState(false);
  const [newFormData, setNewFormData] = useState<Omit<EditingRow, 'id'>>({
    objetivo: '',
    contenidos: '',
    momentos: '',
    recursos: '',
    periodos: 1,
    criterios: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = (row: MESCPRow) => {
    setEditingId(row.id);
    setEditData({ ...row });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    setError(null);
    try {
      await onUpdateRow(editingId, {
        objetivo: editData.objetivo,
        contenidos: editData.contenidos,
        momentos: editData.momentos,
        recursos: editData.recursos,
        periodos: editData.periodos,
        criterios: editData.criterios,
      });
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNew = async () => {
    setSaving(true);
    setError(null);
    try {
      await onAddRow(newFormData);
      setNewFormData({
        objetivo: '',
        contenidos: '',
        momentos: '',
        recursos: '',
        periodos: 1,
        criterios: '',
      });
      setShowNewForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add row');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row_id: string) => {
    if (!window.confirm('Delete this MESCP row?')) return;
    setSaving(true);
    setError(null);
    try {
      await onDeleteRow(row_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-white" style={{ width: '20%' }}>
                Objetivo
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-white" style={{ width: '20%' }}>
                Contenidos
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-white" style={{ width: '15%' }}>
                Momentos
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-white" style={{ width: '15%' }}>
                Recursos
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-white" style={{ width: '15%' }}>
                Períodos
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-white" style={{ width: '15%' }}>
                Criterios
              </th>
              <th className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-white">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                  No MESCP rows added yet. Add one below to get started.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={
                    editingId === row.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-b border-slate-200 dark:border-slate-700'
                      : 'border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                  }
                >
                  {editingId === row.id ? (
                    <>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editData.objetivo}
                          onChange={(e) => setEditData({ ...editData, objetivo: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <textarea
                          value={editData.contenidos}
                          onChange={(e) => setEditData({ ...editData, contenidos: e.target.value })}
                          rows={2}
                          className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded text-xs"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <textarea
                          value={editData.momentos}
                          onChange={(e) => setEditData({ ...editData, momentos: e.target.value })}
                          rows={2}
                          className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded text-xs"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <textarea
                          value={editData.recursos}
                          onChange={(e) => setEditData({ ...editData, recursos: e.target.value })}
                          rows={2}
                          className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded text-xs"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editData.periodos}
                          onChange={(e) => setEditData({ ...editData, periodos: parseInt(e.target.value) })}
                          className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <textarea
                          value={editData.criterios}
                          onChange={(e) => setEditData({ ...editData, criterios: e.target.value })}
                          rows={2}
                          className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded text-xs"
                        />
                      </td>
                      <td className="px-4 py-3 text-center space-x-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={saving}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white rounded text-xs font-medium"
                          aria-label="Save changes"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          disabled={saving}
                          className="px-2 py-1 bg-slate-400 hover:bg-slate-500 disabled:bg-slate-300 text-white rounded text-xs font-medium"
                          aria-label="Cancel editing"
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-slate-900 dark:text-white font-medium truncate">
                        {row.objetivo}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 truncate">
                        {row.contenidos}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 truncate">
                        {row.momentos}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 truncate">
                        {row.recursos}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {row.periodos} wks
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 truncate">
                        {row.criterios}
                      </td>
                      <td className="px-4 py-3 text-center space-x-2">
                        <button
                          onClick={() => handleEdit(row)}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
                          aria-label="Edit row"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium"
                          aria-label="Delete row"
                        >
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Row Form */}
      {!showNewForm ? (
        <button
          onClick={() => setShowNewForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
          aria-label="Add new MESCP row"
        >
          + Add MESCP Row
        </button>
      ) : (
        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Add New MESCP Row</h3>
          <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Objetivo
              </label>
              <input
                type="text"
                value={newFormData.objetivo}
                onChange={(e) => setNewFormData({ ...newFormData, objetivo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded"
                aria-label="Learning objective"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Contenidos
              </label>
              <input
                type="text"
                value={newFormData.contenidos}
                onChange={(e) => setNewFormData({ ...newFormData, contenidos: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded"
                aria-label="Content topics"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Momentos
              </label>
              <input
                type="text"
                value={newFormData.momentos}
                onChange={(e) => setNewFormData({ ...newFormData, momentos: e.target.value })}
                placeholder="Inicio / Desarrollo / Cierre"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded"
                aria-label="Instructional phases"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Recursos
              </label>
              <input
                type="text"
                value={newFormData.recursos}
                onChange={(e) => setNewFormData({ ...newFormData, recursos: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded"
                aria-label="Resources"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Períodos (weeks)
              </label>
              <input
                type="number"
                value={newFormData.periodos}
                onChange={(e) => setNewFormData({ ...newFormData, periodos: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded"
                aria-label="Duration in weeks"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Criterios
              </label>
              <input
                type="text"
                value={newFormData.criterios}
                onChange={(e) => setNewFormData({ ...newFormData, criterios: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded"
                aria-label="Assessment criteria"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSaveNew}
              disabled={saving}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white rounded font-medium"
              aria-label="Save new row"
            >
              {saving ? 'Saving...' : 'Save Row'}
            </button>
            <button
              onClick={() => setShowNewForm(false)}
              disabled={saving}
              className="px-4 py-2 bg-slate-400 hover:bg-slate-500 disabled:bg-slate-300 text-white rounded font-medium"
              aria-label="Cancel adding row"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
