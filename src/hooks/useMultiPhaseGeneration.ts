import { useState, useCallback, useRef, useEffect } from 'react';
import type { MotorType } from '../types';
import { getPhaseDefs, TOTAL_PHASES } from '../lib/pptx/phaseDefinitions';
import type { PhaseDef } from '../lib/pptx/phaseDefinitions';
import { generatePhaseContent } from '../lib/pptx/multiPhaseContent';
import { executePrompt } from '../lib/pptx/promptRunner';

export type PhaseStatus = 'idle' | 'generating' | 'done' | 'error';

export type PhaseType = 'alpha2' | 'synthesis' | 'abp' | 'assessment';

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
  // New: multi-phase run state
  currentPhaseName: PhaseType | null;
  phaseProgress: number; // 0-100 within current phase
  completedPhases: PhaseType[];
  submit: (params: Record<string, unknown>) => Promise<void>;
  regenerate: (params: Record<string, unknown>) => Promise<void>;
  nextPhase: () => void;
  prevPhase: () => void;
  goToPhase: (index: number) => void;
  reset: () => void;
  isPhaseDone: (index: number) => boolean;
  // New: auto-run multi-phase
  runMultiPhase: (params: Record<string, unknown>) => Promise<void>;
  cancel: () => void;
  // Simulated flag from motor generation
  simulated: boolean;
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

  // New: multi-phase run state
  const [currentPhaseName, setCurrentPhaseName] = useState<PhaseType | null>(null);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [completedPhases, setCompletedPhases] = useState<PhaseType[]>([]);
  const [runError, setRunError] = useState<string | null>(null);
  const [simulated, setSimulated] = useState(false);

  // Abort controller ref for cancellation
  const abortRef = useRef<AbortController | null>(null);

  // Progress interval ref for cleanup (B-2)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Helper to clear the progress interval (B-2) — stable across renders via ref
  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Reset when motorType changes
  useEffect(() => {
    if (prevMotorRef.current !== motorType) {
      prevMotorRef.current = motorType;
      setPhaseIndex(0);
      setPhaseStatuses(phases.map(() => 'idle'));
      setResults({});
      setErrors(phases.map(() => null));
      setCurrentPhaseName(null);
      setPhaseProgress(0);
      setCompletedPhases([]);
      setRunError(null);
    }
  }, [motorType, phases]);

  const currentPhaseDef = phases[phaseIndex];
  const currentStatus = phaseStatuses[phaseIndex] || 'idle';
  const currentError = errors[phaseIndex];
  const isActive = phaseStatuses.some(s => s === 'generating') || currentPhaseName !== null;
  const allPhasesDone = phaseStatuses.length > 0 && phaseStatuses.every(s => s === 'done');
  const doneCount = phaseStatuses.filter(s => s === 'done').length;
  const progress = totalPhases > 0 ? Math.round((doneCount / totalPhases) * 100) : 0;

  const submitPhase = useCallback(async (
    params: Record<string, unknown>,
    phaseIdx: number,
    signal?: AbortSignal,
    onProgress?: (pct: number) => void
  ) => {
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

    // Execute via promptRunner (FULL_AI mode = real LLM streaming)
    const context = {
      motorType,
      phaseId,
      params,
      accumulated: currentResults,
    };

    try {
      const result = await executePrompt(context, 'FULL_AI');

      // Clear progress interval and set to 100%
      clearProgressInterval();
      if (onProgress) onProgress(100);

      // Check if aborted
      if (signal?.aborted) {
        setPhaseStatuses(prev => {
          const copy = [...prev];
          copy[phaseIdx] = 'idle';
          return copy;
        });
        return;
      }

      // Use the structured output from promptRunner
      const phaseContent = result.structuredOutput ?? generatePhaseContent(motorType, phaseId, currentResults, params);

      // Track whether content was simulated
      if (result.simulated) {
        setSimulated(true);
      }

      setResults(prev => ({
        ...prev,
        [phaseId]: phaseContent,
      }));
      setPhaseStatuses(prev => {
        const copy = [...prev];
        copy[phaseIdx] = 'done';
        return copy;
      });
    } catch (err) {
      clearProgressInterval();
      if (signal?.aborted) {
        setPhaseStatuses(prev => {
          const copy = [...prev];
          copy[phaseIdx] = 'idle';
          return copy;
        });
        return;
      }
      setPhaseStatuses(prev => {
        const copy = [...prev];
        copy[phaseIdx] = 'error';
        return copy;
      });
      setErrors(prev => {
        const copy = [...prev];
        copy[phaseIdx] = err instanceof Error ? err.message : String(err);
        return copy;
      });
      throw err;
    }
  }, [motorType, phases, clearProgressInterval]);

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
    setSimulated(false);
  }, [phases]);

  const isPhaseDone = useCallback((index: number): boolean => {
    return phaseStatuses[index] === 'done';
  }, [phaseStatuses]);

  // Cancel running multi-phase (B-2: clear interval on cancel)
  const cancel = useCallback(() => {
    abortRef.current?.abort();
    clearProgressInterval();
    abortRef.current = null;
    setCurrentPhaseName(null);
    setPhaseProgress(0);
    setRunError('Cancelado por el usuario');
  }, [clearProgressInterval]);

  // Auto-run all phases sequentially
  const runMultiPhase = useCallback(async (params: Record<string, unknown>) => {
    abortRef.current = new AbortController();
    setCompletedPhases([]);
    setRunError(null);
    setCurrentPhaseName(null);
    setPhaseProgress(0);
    setSimulated(false);

    // Reset all phase statuses to idle
    setPhaseStatuses(phases.map(() => 'idle'));
    setResults({});

    const phaseSequence: PhaseType[] = ['alpha2', 'synthesis', 'abp', 'assessment'];

    for (let i = 0; i < phaseSequence.length; i++) {
      const phaseName = phaseSequence[i];
      const phaseIdx = phases.findIndex(p => p.id === phaseName);

      if (phaseIdx === -1) continue;
      if (abortRef.current.signal.aborted) {
        setRunError('Cancelado por el usuario');
        setCurrentPhaseName(null);
        return;
      }

      setCurrentPhaseName(phaseName);
      setPhaseProgress(0);

      try {
        await submitPhase(params, phaseIdx, abortRef.current.signal, (pct) => {
          if (!abortRef.current?.signal.aborted) {
            setPhaseProgress(pct);
          }
        });

        if (abortRef.current.signal.aborted) {
          setRunError('Cancelado por el usuario');
          setCurrentPhaseName(null);
          return;
        }

        setCompletedPhases(prev => [...prev, phaseName]);
      } catch (err) {
        if (abortRef.current.signal.aborted) {
          setRunError('Cancelado por el usuario');
        } else {
          // B-3: prefix error with phase name
          const message = err instanceof Error ? err.message : String(err);
          setRunError(`Fase ${phaseName} falló: ${message}`);
        }
        setCurrentPhaseName(null);
        return;
      }
    }

    setCurrentPhaseName(null);
    setPhaseProgress(100);
  }, [phases, submitPhase]);

  return {
    phaseDefs: phases,
    currentPhase: phaseIndex,
    totalPhases,
    phaseStatus: currentStatus,
    phaseStatuses,
    results,
    currentResult: currentPhaseDef ? results[currentPhaseDef.id] : null,
    error: currentError ?? runError,
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
    currentPhaseName,
    phaseProgress,
    completedPhases,
    runMultiPhase,
    cancel,
    simulated,
  };
}
