'use client';

import { useState } from 'react';

interface ProductosEditorProps {
  pdc_id: string | number;
  onSave: (products: string[]) => Promise<void>;
  initialProducts?: string[];
}

export default function ProductosEditor({
  pdc_id,
  onSave,
  initialProducts = [],
}: ProductosEditorProps) {
  const [products, setProducts] = useState<string[]>(initialProducts);
  const [newProduct, setNewProduct] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleAddProduct = () => {
    if (newProduct.trim()) {
      const updated = [...products, newProduct];
      setProducts(updated);
      setNewProduct('');
      saveProducts(updated);
    }
  };

  const handleRemoveProduct = (index: number) => {
    const updated = products.filter((_, i) => i !== index);
    setProducts(updated);
    saveProducts(updated);
  };

  const saveProducts = async (productsToSave: string[]) => {
    setSaving(true);
    setMessage(null);
    try {
      await onSave(productsToSave);
      setMessage('Productos guardados!');
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
        Productos de Aprendizaje
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

      {/* Product List */}
      <div className="space-y-2">
        {products.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 italic">
            Sin productos añadidos aún.
          </p>
        ) : (
          <ul className="space-y-2">
            {products.map((product, index) => (
              <li
                key={index}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <span className="text-slate-900 dark:text-white">{product}</span>
                <button
                  onClick={() => handleRemoveProduct(index)}
                  disabled={saving}
                  className="px-2 py-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium disabled:opacity-50"
                  aria-label={`Remove product: ${product}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add Product Form */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newProduct}
          onChange={(e) => setNewProduct(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddProduct()}
          placeholder="Ej: Ensayo, Presentación, Proyecto..."
          className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={saving}
          aria-label="Product name"
        />
        <button
          onClick={handleAddProduct}
          disabled={saving || !newProduct.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
          aria-label="Add product"
        >
          Añadir
        </button>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400">
        Define los productos o entregables que los estudiantes crearán en este PDC.
      </p>
    </div>
  );
}
