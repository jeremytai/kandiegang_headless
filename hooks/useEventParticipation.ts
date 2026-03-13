import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { EventParticipationEvent } from '../types/analytics';

interface EventParticipationData {
  events: EventParticipationEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useEventParticipation(): EventParticipationData {
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const [data, setData] = useState<EventParticipationData>({
    events: [],
    loading: true,
    error: null,
    refresh,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        setData((prev) => ({ ...prev, loading: true, error: null }));

        const {
          data: { session },
        } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
        if (!session?.access_token) throw new Error('Not authenticated');

        const res = await fetch('/api/analytics-data?section=events', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }

        const json = await res.json();
        setData({ events: json.events ?? [], loading: false, error: null, refresh });
      } catch (err) {
        setData((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load event participation',
        }));
      }
    }

    fetchData();
  }, [tick, refresh]);

  return data;
}
