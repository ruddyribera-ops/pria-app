'use client';

import { useState } from 'react';

interface AdaptacionesPanelProps {
  pdc_id: string | number;
  onSave: (content: string) => Promise<void>;
  initialContent?: string;
}

export default function AdaptacionesPanel({
  pdc_id,
  onSave,
  initialContent = '',
}: AdaptacionesPanelProps) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await onSave(content);
      setMessage('Adaptaciones guardadas!');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
        Adaptaciones Personalizadas
      </h3>

      {message && (
        <div
          className={`p-3 rounded text-sm ${
            message.includes('Error')
              ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
          }`}
          role="alert"
        >
          {message}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Contenido personalizado
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          placeholder="Añade aquí las adaptaciones personalizadas para este PDC..."
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Custom adaptations content"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !content.trim()}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
        aria-label="Save adaptations"
      >
        {saving ? 'Guardando...' : 'Guardar Adaptaciones'}
      </button>
    </div>
  );
}
