import { useState, useCallback, useEffect } from 'react';
import { executePrompt, executePromptStreaming } from '../lib/pptx/promptRunner';
import { streamMotor, getMotorResult } from '../api/motores';
import type { FidelityReport } from '../lib/ai/minimaxClient';

export function useMotorGenerator<T = unknown>(
  motorType: string,
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void,
) {
  const [result, setResult] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulated, setSimulated] = useState(false);
  const [fidelity, setFidelity] = useState<FidelityReport | null>(null);

  // Hydrate from motor history on mount
  useEffect(() => {
    let cancelled = false;
    async function loadFromHistory() {
      try {
        const { fetchMotorHistory } = await import('../hooks/useMotorHistory');
        const data = await fetchMotorHistory({ motor_type: motorType, limit: 1 });
        if (cancelled || !data.data?.[0]) return;
        const latest = data.data[0];
        if (latest.status === 'done' && latest.result_json_preview) {
          try {
            // result_json_preview is a 2000-char prefix, try to get full result by ID
            const fullResult = await getMotorResult(latest.id);
            if (!cancelled && fullResult.result_json) {
              setResult(fullResult.result_json as T);
              setSimulated(fullResult.simulated ?? false);
            }
          } catch {
            // getMotorResult failed, try parsing preview
            try {
              const parsed = JSON.parse(latest.result_json_preview);
              if (!cancelled && parsed) {
                setResult(parsed as T);
                setSimulated(latest.simulated ?? false);
              }
            } catch {
              // Preview isn't valid JSON, skip hydration
            }
          }
        }
      } catch {
        // History fetch failed silently
      }
    }
    loadFromHistory();
    return () => { cancelled = true; };
  }, [motorType]);

  const generate = useCallback(async (
    params: Record<string, unknown>,
    onStream?: (text: string) => void,
  ) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSimulated(false);
    setFidelity(null);

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
        setSimulated(res.simulated ?? false);
        // Capture fidelity from the promptRunner result if present
        const fidelityFromRes = (res as { fidelity?: FidelityReport }).fidelity;
        if (fidelityFromRes) setFidelity(fidelityFromRes);
        showToast('¡Generado!');
      }
    } catch (err) {
      setError(String(err));
      showToast('Error al generar.');
    } finally {
      setLoading(false);
    }
  }, [motorType, showToast]);

  /**
   * Streaming variant — calls SSE endpoint /api/motores/:type/stream
   * Streams tokens via onStream callback, sets result when done.
   */
  const generateStreaming = useCallback(async (
    params: Record<string, unknown>,
    onStream?: (text: string) => void,
  ) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSimulated(false);

    try {
      const finalResult = await streamMotor(
        motorType,
        { params },
        (chunk) => onStream?.(chunk),
        (status, data) => {
          if (status === 'done') {
            setSimulated(Boolean((data as { simulated?: boolean })?.simulated));
          }
        },
      );

      if (finalResult.status === 'error') {
        const errMsg = (finalResult.error as string) || 'Error en streaming';
        setError(errMsg);
        showToast(errMsg.slice(0, 100), 'error');
        return;
      }

      if (finalResult.output) {
        setResult(finalResult.output as T);
        setSimulated(Boolean(finalResult.simulated));
        showToast('¡Generado!');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      showToast(`Error de conexión: ${errMsg.slice(0, 80)}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [motorType, showToast]);

  return { result, loading, error, simulated, fidelity, generate, generateStreaming } as const;
}