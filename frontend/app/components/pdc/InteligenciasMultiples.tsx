'use client';

import { useState, useEffect } from 'react';

const INTELLIGENCES = [
  { id: 'linguistic', label: 'Lingüística' },
  { id: 'logical-mathematical', label: 'Lógico-matemática' },
  { id: 'spatial', label: 'Espacial' },
  { id: 'musical', label: 'Musical' },
  { id: 'bodily-kinesthetic', label: 'Corporal' },
  { id: 'interpersonal', label: 'Interpersonal' },
  { id: 'intrapersonal', label: 'Intrapersonal' },
  { id: 'naturalistic', label: 'Naturalista' },
];

interface InteligenciasMultiplesProps {
  pdc_id: string | number;
  initialSelected?: string[];
  onSave: (selected: string[]) => Promise<void>;
}

export default function InteligenciasMultiples({
  pdc_id,
  initialSelected = [],
  onSave,
}: InteligenciasMultiplesProps) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleToggle = async (id: string) => {
    const newSelected = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id];

    setSelected(newSelected);

    // Auto-save on change
    setSaving(true);
    setMessage(null);
    try {
      await onSave(newSelected);
      setMessage('Inteligencias guardadas!');
      setTimeout(() => setMessage(null), 2000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
        Inteligencias Múltiples
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {INTELLIGENCES.map((intel) => (
          <label
            key={intel.id}
            className="flex items-center p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={selected.includes(intel.id)}
              onChange={() => handleToggle(intel.id)}
              disabled={saving}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 disabled:opacity-50"
              aria-label={`Select ${intel.label} intelligence`}
            />
            <span className="ml-3 text-slate-700 dark:text-slate-300 font-medium">
              {intel.label}
            </span>
          </label>
        ))}
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400">
        Selecciona las inteligencias múltiples que mejor se ajusten a este PDC.
        {selected.length > 0 && ` (${selected.length} seleccionadas)`}
      </p>
    </div>
  );
}
