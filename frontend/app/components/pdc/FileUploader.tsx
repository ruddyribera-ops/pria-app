'use client';

import { useState, useRef } from 'react';

interface FileUploaderProps {
  pdc_id: string | number;
  onUpload: (file: File) => Promise<void>;
}

export default function FileUploader({ pdc_id, onUpload }: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.name.endsWith('.docx')) {
        setFile(selected);
        setMessage(null);
      } else {
        setMessage('Solo se aceptan archivos .docx');
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setMessage(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 10, 90));
      }, 100);

      await onUpload(file);

      clearInterval(progressInterval);
      setProgress(100);
      setMessage('Archivo importado correctamente!');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al importar archivo');
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
        Importar DOCX
      </h3>

      <p className="text-sm text-slate-600 dark:text-slate-400">
        Importa un documento DOCX para auto-poblar este PDC con contenido
      </p>

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

      {file && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-300 font-medium">
            {file.name}
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-400">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      )}

      {uploading && progress > 0 && (
        <div className="space-y-2">
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{progress}%</p>
        </div>
      )}

      <div className="flex gap-2">
        <label className="flex-1">
          <span className="block px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-center font-medium cursor-pointer disabled:opacity-50 transition-colors">
            Seleccionar archivo
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            aria-label="Select DOCX file"
          />
        </label>
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
          aria-label="Upload file"
        >
          {uploading ? 'Subiendo...' : 'Subir'}
        </button>
      </div>
    </div>
  );
}
