import { useState, useEffect, useCallback, useRef } from 'react';
import { TOKEN_KEY } from '../constants';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unknown';
  checks: { server: string; database: string };
  version: string;
  uptime: number;
}

const HEALTH_INTERVAL = 30_000; // 30 seconds

export function useHealthCheck() {
  const [health, setHealth] = useState<HealthStatus>({
    status: 'unknown',
    checks: { server: 'unknown', database: 'unknown' },
    version: '',
    uptime: 0,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkHealth = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const res = await fetch('/api/health', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        const payload = data.data || data;
        setHealth({
          status: payload.status || 'unknown',
          checks: payload.checks || { server: 'unknown', database: 'unknown' },
          version: payload.version || '',
          uptime: payload.uptime || 0,
        });
      } else {
        setHealth(prev => ({ ...prev, status: 'degraded' }));
      }
    } catch {
      setHealth(prev => ({ ...prev, status: 'unknown' }));
    }
  }, []);

  useEffect(() => {
    checkHealth();
    intervalRef.current = setInterval(checkHealth, HEALTH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkHealth]);

  return { ...health, refetch: checkHealth };
}