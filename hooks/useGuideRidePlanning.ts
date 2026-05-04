import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { RidePlanningData } from '../types/guideRidePlanning';

type RidePlanningHookState = {
  data: RidePlanningData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  mutate: (payload: Record<string, unknown>) => Promise<void>;
  runAction: <T = unknown>(payload: Record<string, unknown>, options?: { refresh?: boolean }) => Promise<T>;
};

export function useGuideRidePlanning(): RidePlanningHookState {
  const [tick, setTick] = useState(0);
  const [data, setData] = useState<RidePlanningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => setTick((v) => v + 1), []);

  const request = useCallback(async (method: 'GET' | 'POST', payload?: Record<string, unknown>) => {
    const {
      data: { session },
    } = (await supabase?.auth.getSession()) ?? { data: { session: null } };

    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/guide-ride-planning', {
      method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(method === 'POST' ? { body: JSON.stringify(payload ?? {}) } : {}),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || `HTTP ${response.status}`);
    }
    return body;
  }, []);

  const runAction = useCallback(
    async <T = unknown>(
      payload: Record<string, unknown>,
      options?: { refresh?: boolean }
    ): Promise<T> => {
      const result = (await request('POST', payload)) as T;
      if (options?.refresh !== false) refresh();
      return result;
    },
    [request, refresh]
  );

  const mutate = useCallback(
    async (payload: Record<string, unknown>) => {
      await runAction(payload, { refresh: true });
    },
    [runAction]
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const result = await request('GET');
        if (!mounted) return;
        setData(result as RidePlanningData);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load ride planning');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [tick, request]);

  return { data, loading, error, refresh, mutate, runAction };
}
