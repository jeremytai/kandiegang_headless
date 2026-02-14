/**
 * lib/authProviders.ts
 * Utilities for syncing and querying the auth_providers table (linked login methods).
 */

import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export type AuthProviderType = 'email' | 'discord';

export interface AuthProviderRow {
  id: string;
  user_id: string;
  provider_type: AuthProviderType;
  provider_user_id: string;
  created_at: string;
}

/**
 * Build rows for auth_providers from the current Supabase user (email + identities).
 */
function buildAuthProviderRows(
  user: User
): Array<{ user_id: string; provider_type: AuthProviderType; provider_user_id: string }> {
  const rows: Array<{
    user_id: string;
    provider_type: AuthProviderType;
    provider_user_id: string;
  }> = [];
  if (user.email?.trim()) {
    rows.push({
      user_id: user.id,
      provider_type: 'email',
      provider_user_id: user.email.toLowerCase().trim(),
    });
  }
  const discord = user.identities?.find((i) => i.provider === 'discord');
  if (discord?.id) {
    rows.push({
      user_id: user.id,
      provider_type: 'discord',
      provider_user_id: discord.id,
    });
  }
  return rows;
}

/**
 * Sync auth_providers for the current user from their session (email + Discord identity).
 * Call after login and after link/unlink so the table stays in sync.
 */
export async function syncAuthProvidersForUser(user: User): Promise<void> {
  const rows = buildAuthProviderRows(user);
  for (const row of rows) {
    await fetch('/api/auth-providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
  }
}
