import { useState, useRef, useCallback, useEffect } from 'react';
import { getEstadoSistema } from '../api/admin';
import * as motores from '../api/motores';

export type MotorType = 'alpha2' | 'synthesis' | 'abp' | 'assessment' | 'plan' | 'slides' | 'ficha' | 'quiz' | 'tutor' | 'pdc' | 'recalibrate' | 'micro';
export type MotorStatus = 'idle' | 'generating' | 'polling' | 'done' | 'error';

interface MotorState {
  status: MotorStatus;
  result: unknown | null;
  error: string | null;
  motorKey: string | null;
}

// Map motor types to estado-sistema keys
const MOTOR_KEYS: Record<MotorType, string> = {
  alpha2: 'extraccion_curricular',
  synthesis: 'sintesis_unidad',
  abp: 'proyecto_abp',
  assessment: 'evaluacion',
  plan: 'plan_clase',
  slides: 'diapositivas',
  ficha: 'ficha_gamificada',
  quiz: 'pop_quiz',
  pdc: 'guia_tutor',
  tutor: 'guia_tutor',
  recalibrate: 'recalibrate',
  micro: 'micro',
};

// Map motor types to API functions
const API_FUNCTIONS: Record<MotorType, (data: any) => Promise<unknown>> = {
  alpha2: motores.motorAlpha2,
  synthesis: motores.motorSynthesis,
  abp: motores.motorAbp,
  assessment: motores.motorAssessment,
  plan: motores.motorPlan,
  slides: motores.motorSlides,
  ficha: motores.motorFicha,
  quiz: motores.motorQuiz,
  pdc: motores.motorPdc,
  tutor: async () => { throw new Error('Motor tutor not implemented'); },
  recalibrate: async () => { throw new Error('Motor recalibrate not implemented'); },
  micro: async () => { throw new Error('Motor micro not implemented'); },
};

export function useMotorGeneration() {
  const [state, setState] = useState<MotorState>({
    status: 'idle',
    result: null,
    error: null,
    motorKey: null,
  });
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Cleanup polling on unmount
  useEffect(() => stopPolling, [stopPolling]);

  const pollEstado = useCallback(async (motorKey: string) => {
    try {
      const estado = await getEstadoSistema();
      const motorStatus = (estado as unknown as Record<string, string>)[motorKey];

      if (motorStatus === 'done') {
        stopPolling();
        setState({ status: 'done', result: estado, error: null, motorKey });
      } else if (motorStatus === 'error') {
        stopPolling();
        setState({ status: 'error', result: null, error: 'Error en la generación del motor', motorKey });
      }
      // If 'generating' or 'pending' or undefined, keep polling
    } catch {
      // Keep polling on network error — don't interrupt
    }
  }, [stopPolling]);

  const submit = useCallback(async (type: MotorType, payload: any) => {
    // Clean up any existing polling
    stopPolling();

    const motorKey = MOTOR_KEYS[type];
    setState({ status: 'generating', result: null, error: null, motorKey });

    try {
      const apiFn = API_FUNCTIONS[type];
      await apiFn(payload);

      // Start polling for completion
      setState(prev => ({ ...prev, status: 'polling' }));
      pollingRef.current = setInterval(() => {
        pollEstado(motorKey);
      }, 2000);

      // Also do an immediate poll
      pollEstado(motorKey);
    } catch (err) {
      stopPolling();
      setState({
        status: 'error',
        result: null,
        error: err instanceof Error ? err.message : 'Error de conexión',
        motorKey: null,
      });
    }
  }, [stopPolling, pollEstado]);

  const reset = useCallback(() => {
    stopPolling();
    setState({ status: 'idle', result: null, error: null, motorKey: null });
  }, [stopPolling]);

  return { ...state, submit, reset, isActive: state.status === 'generating' || state.status === 'polling' };
}
