/**
 * lib/supabaseClient.ts
 * Singleton Supabase client for the frontend.
 *
 * Uses public anon key + URL from Vite env vars:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 *
 * These values are safe to expose in the browser but should map to
 * \"anon\" credentials in Supabase (never service role keys).
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // In dev this helps surface misconfiguration early.
  // In production, Supabase client will still be created as `undefined` will throw,
  // which is preferable to silently failing auth flows.
  // eslint-disable-next-line no-console
  console.warn(
    '[supabaseClient] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. Supabase auth will be disabled.'
  );
}

export const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_ANON_KEY ?? '');

