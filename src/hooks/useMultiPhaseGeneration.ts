import { useState, useCallback, useRef, useEffect } from 'react';
import type { MotorType } from './useMotorGeneration';
import { getPhaseDefs, TOTAL_PHASES } from '../lib/pptx/phaseDefinitions';
import type { PhaseDef } from '../lib/pptx/phaseDefinitions';
import { generatePhaseContent } from '../lib/pptx/multiPhaseContent';
import { executePrompt, type PromptMode } from '../lib/pptx/promptRunner';
import * as motores from '../api/motores';

export type PhaseStatus = 'idle' | 'generating' | 'done' | 'error';

export interface MultiPhaseReturn {
  phaseDefs: PhaseDef[];
  currentPhase: number;
  totalPhases: number;
  phaseStatus: PhaseStatus;
  phaseStatuses: PhaseStatus[];
  results: Record<string, unknown>;
  currentResult: unknown;
  error: string | null;
  isActive: boolean;
  allPhasesDone: boolean;
  progress: number;
  submit: (params: Record<string, unknown>) => Promise<void>;
  regenerate: (params: Record<string, unknown>) => Promise<void>;
  nextPhase: () => void;
  prevPhase: () => void;
  goToPhase: (index: number) => void;
  reset: () => void;
  isPhaseDone: (index: number) => boolean;
}

export function useMultiPhaseGeneration(motorType: MotorType): MultiPhaseReturn {
  const phases = getPhaseDefs(motorType);
  const totalPhases = TOTAL_PHASES[motorType] || phases.length;

  // Track prev motorType to detect changes
  const prevMotorRef = useRef<MotorType>(motorType);

  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseStatuses, setPhaseStatuses] = useState<PhaseStatus[]>(
    () => phases.map(() => 'idle')
  );
  const [results, setResults] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<(string | null)[]>(
    () => phases.map(() => null)
  );

  // Reset when motorType changes
  useEffect(() => {
    if (prevMotorRef.current !== motorType) {
      prevMotorRef.current = motorType;
      setPhaseIndex(0);
      setPhaseStatuses(phases.map(() => 'idle'));
      setResults({});
      setErrors(phases.map(() => null));
    }
  }, [motorType, phases]);

  const currentPhaseDef = phases[phaseIndex];
  const currentStatus = phaseStatuses[phaseIndex] || 'idle';
  const currentError = errors[phaseIndex];
  const isActive = phaseStatuses.some(s => s === 'generating');
  const allPhasesDone = phaseStatuses.length > 0 && phaseStatuses.every(s => s === 'done');
  const doneCount = phaseStatuses.filter(s => s === 'done').length;
  const progress = totalPhases > 0 ? Math.round((doneCount / totalPhases) * 100) : 0;

  const submitPhase = useCallback(async (params: Record<string, unknown>, phaseIdx: number) => {
    // Get latest results at time of submission
    let currentResults: Record<string, unknown> = {};

    setPhaseStatuses(prev => {
      const copy = [...prev];
      copy[phaseIdx] = 'generating';
      return copy;
    });

    setErrors(prev => {
      const copy = [...prev];
      copy[phaseIdx] = null;
      return copy;
    });

    const phaseId = phases[phaseIdx]?.id;
    if (!phaseId) return;

    // Read latest results state
    await new Promise<void>(resolve => {
      setResults(prev => {
        currentResults = prev;
        resolve();
        return prev;
      });
    });

    // Use FULL_AI mode (MiniMax M2.7 API key is configured)
    const mode: PromptMode = 'FULL_AI';

    try {
      const apiFn = getApiFunction(motorType);
      const payload = {
        ...params,
        fase: phaseId,
        contexto_anterior: JSON.stringify(currentResults),
      };
      await apiFn(payload);
    } catch {
      // API down — use local prompt runner with MOCK mode
    }

    // Execute via promptRunner (MOCK mode = structured template output)
    const context = {
      motorType,
      phaseId,
      params,
      accumulated: currentResults,
    };
    const result = await executePrompt(context, mode);

    // Use the structured output from promptRunner
    const phaseContent = result.structuredOutput ?? generatePhaseContent(motorType, phaseId, currentResults, params);

    setResults(prev => ({
      ...prev,
      [phaseId]: phaseContent,
    }));
    setPhaseStatuses(prev => {
      const copy = [...prev];
      copy[phaseIdx] = 'done';
      return copy;
    });
  }, [motorType, phases]);

  const submit = useCallback(async (params: Record<string, unknown>) => {
    await submitPhase(params, phaseIndex);
  }, [submitPhase, phaseIndex]);

  const regenerate = useCallback(async (params: Record<string, unknown>) => {
    const phaseId = phases[phaseIndex]?.id;
    if (!phaseId) return;

    setResults(prev => {
      const copy = { ...prev };
      delete copy[phaseId];
      return copy;
    });
    await submitPhase(params, phaseIndex);
  }, [submitPhase, phaseIndex, phases]);

  const nextPhase = useCallback(() => {
    setPhaseIndex(prev => Math.min(prev + 1, phases.length - 1));
  }, [phases.length]);

  const prevPhase = useCallback(() => {
    setPhaseIndex(prev => Math.max(prev - 1, 0));
  }, []);

  const goToPhase = useCallback((index: number) => {
    if (index >= 0 && index < phases.length) {
      setPhaseIndex(index);
    }
  }, [phases.length]);

  const reset = useCallback(() => {
    setPhaseIndex(0);
    setPhaseStatuses(phases.map(() => 'idle'));
    setResults({});
    setErrors(phases.map(() => null));
  }, [phases]);

  const isPhaseDone = useCallback((index: number): boolean => {
    return phaseStatuses[index] === 'done';
  }, [phaseStatuses]);

  return {
    phaseDefs: phases,
    currentPhase: phaseIndex,
    totalPhases,
    phaseStatus: currentStatus,
    phaseStatuses,
    results,
    currentResult: currentPhaseDef ? results[currentPhaseDef.id] : null,
    error: currentError,
    isActive,
    allPhasesDone,
    progress,
    submit,
    regenerate,
    nextPhase,
    prevPhase,
    goToPhase,
    reset,
    isPhaseDone,
  };
}

function getApiFunction(type: MotorType) {
  const map: Record<string, (data: Record<string, unknown>) => Promise<unknown>> = {
    synthesis: (d) => motores.motorSynthesis(d as any),
    plan: (d) => motores.motorPlan(d as any),
    slides: (d) => motores.motorSlides(d as any),
    ficha: (d) => motores.motorFicha(d as any),
    quiz: (d) => motores.motorQuiz(d as any),
    pdc: (d) => motores.motorPdc(d as any),
  };
  return map[type] || (() => Promise.resolve({}));
}
