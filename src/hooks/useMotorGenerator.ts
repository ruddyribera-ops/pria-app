import { useState, useCallback } from 'react';
import { executePrompt } from '../lib/pptx/promptRunner';
import { executePromptStreaming } from '../lib/pptx/streaming';

export function useMotorGenerator<T = unknown>(
  motorType: string,
  showToast: (msg: string, type?: string) => void,
) {
  const [result, setResult] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (
    params: Record<string, unknown>,
    onStream?: (text: string) => void,
  ) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const context = {
        motorType: motorType as unknown,
        phaseId: motorType,
        params,
        accumulated: {} as Record<string, unknown>,
      };

      const res = onStream
        ? await executePromptStreaming(context as Parameters<typeof executePromptStreaming>[0], 'FULL_AI', onStream)
        : await executePrompt(context as Parameters<typeof executePrompt>[0], 'FULL_AI');

      if (res.error) {
        setError(res.error);
        showToast(res.error.slice(0, 100));
      }
      if (res.structuredOutput) {
        setResult(res.structuredOutput as T);
        showToast('¡Generado!');
      }
    } catch (err) {
      setError(String(err));
      showToast('Error al generar.');
    } finally {
      setLoading(false);
    }
  }, [motorType, showToast]);

  return { result, loading, error, generate } as const;
}
