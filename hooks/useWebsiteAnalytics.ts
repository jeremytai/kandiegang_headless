import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { WebsiteAnalytics } from '../types/analytics';

interface WebsiteAnalyticsState {
  data: WebsiteAnalytics | null;
  loading: boolean;
  error: string | null;
}

export function useWebsiteAnalytics() {
  const [state, setState] = useState<WebsiteAnalyticsState>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchWebsiteAnalytics() {
      try {
        setState({ data: null, loading: true, error: null });
        const {
          data: { session },
        } = (await supabase?.auth.getSession()) ?? { data: { session: null } };

        if (!session?.access_token) {
          throw new Error('Not authenticated');
        }

        const res = await fetch('/api/website-analytics', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }

        const json = await res.json();
        setState({
          data: json,
          loading: false,
          error: null,
        });
      } catch (err) {
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load website analytics',
        });
      }
    }

    fetchWebsiteAnalytics();
  }, []);

  return state;
}
