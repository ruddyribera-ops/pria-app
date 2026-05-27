import { useState, useEffect, useCallback } from 'react';
import { TOKEN_KEY } from '../constants';

interface Curriculum {
  id?: number;
  unidad_real: string;
  temas: string[];
  contenido_temas: Record<string, string>;
  paginas_temas: Record<string, string>;
  raw_text?: string;
}

export function useCurriculum() {
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = localStorage.getItem(TOKEN_KEY);

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch('/api/curriculums/latest', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 404) { setLoading(false); return; }
        throw new Error(`HTTP ${res.status}`);
      }
      const { data } = await res.json();
      // Parse JSON strings back to objects
      const parsed = {
        ...data,
        temas: typeof data.temas === 'string' ? JSON.parse(data.temas) : data.temas,
        contenido_temas: typeof data.contenido_temas === 'string' ? JSON.parse(data.contenido_temas) : data.contenido_temas,
        paginas_temas: typeof data.paginas_temas === 'string' ? JSON.parse(data.paginas_temas) : data.paginas_temas,
      };
      setCurriculum(parsed);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const saveCurriculum = useCallback(async (data: Curriculum) => {
    if (!token) return;
    const res = await fetch('/api/curriculums', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        unidad_real: data.unidad_real,
        temas: data.temas,
        contenido_temas: data.contenido_temas,
        paginas_temas: data.paginas_temas,
        raw_text: data.raw_text || '',
      }),
    });
    if (!res.ok) throw new Error('Failed to save curriculum');
    const result = await res.json();
    // Reload to get parsed data
    await load();
    return result;
  }, [token, load]);

  return { curriculum, loading, error, saveCurriculum, reload: load };
}