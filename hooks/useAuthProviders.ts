/**
 * useAuthProviders.ts
 * Hook for managing linked login methods (auth_providers) and link/unlink actions.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { AuthProviderRow } from '../lib/authProviders';

export type AuthProviderType = 'email' | 'discord';

export interface UseAuthProvidersResult {
  /** Rows from auth_providers for the current user */
  providers: AuthProviderRow[];
  loading: boolean;
  error: string | null;
  /** Link Discord to current account (redirects). Requires manual linking enabled in Supabase. */
  linkDiscord: () => Promise<{ error?: string }>;
  /** Unlink an identity. Fails if only one method remains. */
  unlinkProvider: (identity: { id: string; provider: string }) => Promise<{ error?: string }>;
  /** Refresh the list (e.g. after link/unlink). */
  refresh: () => Promise<void>;
  /** Whether user can unlink (has more than one identity) */
  canUnlink: boolean;
  /** Current user's identities from session (for display and unlink target) */
  identities: Array<{ id: string; provider: string; identity_data?: Record<string, unknown> }>;
}

export function useAuthProviders(): UseAuthProvidersResult {
  const { user, linkDiscord: authLinkDiscord, unlinkIdentity } = useAuth();
  const [providers, setProviders] = useState<AuthProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    if (!supabase || !user?.id) {
      setProviders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: e } = await supabase
      .from('auth_providers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (e) {
      setError(e.message);
      setProviders([]);
    } else {
      setProviders((data ?? []) as AuthProviderRow[]);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const linkDiscord = useCallback(async () => {
    const result = await authLinkDiscord({
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/members/settings`,
    });
    if (result.error) setError(result.error);
    return result;
  }, [authLinkDiscord]);

  const unlinkProvider = useCallback(
    async (identity: { id: string; provider: string }) => {
      const result = await unlinkIdentity(identity);
      if (result.error) setError(result.error);
      else await fetchProviders();
      return result;
    },
    [unlinkIdentity, fetchProviders]
  );

  const identities = user?.identities ?? [];
  const canUnlink = identities.length > 1;

  return {
    providers,
    loading,
    error,
    linkDiscord,
    unlinkProvider,
    refresh: fetchProviders,
    canUnlink,
    identities,
  };
}
