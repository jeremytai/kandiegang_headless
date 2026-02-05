/**
 * lib/supabaseClient.ts
 * Singleton Supabase client for the frontend.
 *
 * Uses public anon key + URL from Vite env vars:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 *
 * These values are safe to expose in the browser but should map to
 * "anon" credentials in Supabase (never service role keys).
 *
 * When env vars are missing (e.g. not set in Vercel), supabase is null and
 * auth is disabled so the app still loads without throwing.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const hasConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!hasConfig) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabaseClient] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. Supabase auth will be disabled. Set them in Vercel (or .env) to enable auth.'
  );
}

export const supabase: SupabaseClient | null = hasConfig
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
  : null;

