import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

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

  const load = useCallback(async () => {
    try {
      const res = await client.get('/curriculums/latest');
      const data = res.data.data;
      // Parse JSON strings back to objects
      const parsed = {
        ...data,
        temas: typeof data.temas === 'string' ? JSON.parse(data.temas) : data.temas,
        contenido_temas: typeof data.contenido_temas === 'string' ? JSON.parse(data.contenido_temas) : data.contenido_temas,
        paginas_temas: typeof data.paginas_temas === 'string' ? JSON.parse(data.paginas_temas) : data.paginas_temas,
      };
      setCurriculum(parsed);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error loading curriculum';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveCurriculum = useCallback(async (data: Curriculum) => {
    const res = await client.post('/curriculums', {
      unidad_real: data.unidad_real,
      temas: data.temas,
      contenido_temas: data.contenido_temas,
      paginas_temas: data.paginas_temas,
      raw_text: data.raw_text || '',
    });
    // Reload to get parsed data
    await load();
    return res.data;
  }, [load]);

  return { curriculum, loading, error, saveCurriculum, reload: load };
}