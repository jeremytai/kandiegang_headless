/**
 * AuthContext.tsx
 * Supabase-backed authentication context for Kandiegang headless frontend.
 *
 * Responsibilities:
 * - Keep track of current Supabase auth session (user).
 * - Load and expose the matching `profiles` row.
 * - Bridge membership status from WordPress into Supabase profiles.
 * - Provide `login`, `logout`, and `refreshProfile` helpers.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { syncAuthProvidersForUser } from '../lib/authProviders';
import { fetchMembershipStatus } from '../lib/wordpress';
import { posthog, FUNNEL_EVENTS } from '../lib/posthog';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export type MembershipSource = 'wordpress' | 'supabase' | 'unknown' | null;

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  wp_user_id: number | null;
  is_member: boolean;
  membership_source: MembershipSource;
  /** Active WooCommerce membership plan names (e.g. "Kandie Gang Cycling Club Membership"). */
  membership_plans: string[];
  /** Earliest active membership start (YYYY-MM-DD). */
  member_since: string | null;
  /** Latest active membership expiration (YYYY-MM-DD). */
  membership_expiration: string | null;
  /** Whether the user is a Kandie Gang Guide (manual or synced from WP/CSV). */
  is_guide: boolean;
  /** True when email matches a Substack/Mailchimp subscriber export (synced via script). */
  is_substack_subscriber: boolean;
  /** Newsletter opt-in date (YYYY-MM-DD) from CSV sync, when available. */
  newsletter_opted_in_at: string | null;
  /** Discord user id (snowflake) from OAuth. */
  discord_id: string | null;
  /** Display name from Discord (or other provider). */
  username: string | null;
  /** Avatar URL from Discord (or other provider). */
  avatar_url: string | null;
}

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  profile: Profile | null;
  /**
   * Email/password login using Supabase auth.
   * Returns an error message on failure so callers can show UX.
   */
  login: (email: string, password: string) => Promise<{ error?: string }>;
  /**
   * Passwordless: send a magic link to the email. User clicks the link to sign in.
   * Returns { error } on failure; on success, show "Check your email" (no session until they click the link).
   */
  signInWithMagicLink: (email: string, redirectTo?: string) => Promise<{ error?: string }>;
  /**
   * Sign in (or link when already logged in) with Discord OAuth.
   * Redirects away to Discord; on return, session is restored. Pass redirectTo to control where users land (default: /members).
   */
  signInWithDiscord: (options?: { redirectTo?: string }) => Promise<{ error?: string }>;
  /**
   * Email/password sign-up. Optional displayName is stored in user_metadata and synced to profiles by the DB trigger.
   * Returns { error } on failure; { needsEmailConfirmation: true } if Supabase is set to confirm email and no session was created.
   */
  signUp: (
    email: string,
    password: string,
    options?: { displayName?: string }
  ) => Promise<{ error?: string; needsEmailConfirmation?: boolean }>;
  logout: () => Promise<void>;
  /**
   * Reloads the Supabase profile and, if possible, reconciles membership
   * status from WordPress into Supabase.
   */
  refreshProfile: () => Promise<void>;
  /**
   * Link Discord to the current user (redirects to Discord). Only when already logged in.
   * Enable manual linking in Supabase Dashboard → Auth → Providers.
   */
  linkDiscord: (options?: { redirectTo?: string }) => Promise<{ error?: string }>;
  /**
   * Unlink an identity from the current user. Fails if only one identity remains.
   * Pass the identity object from user.identities (e.g. { id, provider }).
   */
  unlinkIdentity: (identity: { id: string; provider: string }) => Promise<{ error?: string }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Discord identity_data shape from Supabase OAuth (partial). */
function getDiscordProfileFromUser(user: User): {
  discord_id: string | null;
  username: string | null;
  avatar_url: string | null;
} {
  const discord = user.identities?.find((i) => i.provider === 'discord');
  const data = discord?.identity_data as Record<string, unknown> | undefined;
  if (!data) {
    return { discord_id: null, username: null, avatar_url: null };
  }
  const discordId = typeof data.id === 'string' ? data.id : null;
  const username =
    (typeof data.full_name === 'string' ? data.full_name : null) ??
    (typeof data.name === 'string' ? data.name : null) ??
    (typeof data.username === 'string' ? data.username : null) ??
    null;
  let avatarUrl =
    typeof data.avatar_url === 'string' ? data.avatar_url : null;
  if (!avatarUrl && typeof data.avatar === 'string' && discordId) {
    avatarUrl = `https://cdn.discordapp.com/avatars/${discordId}/${data.avatar}.png`;
  }
  return { discord_id: discordId, username, avatar_url: avatarUrl };
}

/** Sync Discord identity from auth user to profiles row. No-op if no Discord identity. */
async function syncDiscordToProfile(user: User): Promise<void> {
  if (!supabase) return;
  const { discord_id, username, avatar_url } = getDiscordProfileFromUser(user);
  if (!discord_id && !username && !avatar_url) return;
  await supabase
    .from('profiles')
    .update({
      discord_id: discord_id ?? undefined,
      username: username ?? undefined,
      avatar_url: avatar_url ?? undefined,
    })
    .eq('id', user.id);
}

async function loadUserAndProfile(): Promise<{
  user: User | null;
  profile: Profile | null;
}> {
  if (!supabase) {
    return { user: null, profile: null };
  }

  const { data: sessionResult, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    // eslint-disable-next-line no-console
    console.warn('[AuthContext] Failed to read Supabase session', sessionError);
  }

  const user = sessionResult?.session?.user ?? null;
  if (!user) {
    return { user: null, profile: null };
  }

  // Sync Discord (and other OAuth) identity into profiles when present
  await syncDiscordToProfile(user);

  // Keep auth_providers in sync so settings can show connected accounts
  await syncAuthProvidersForUser(user);

  const { data: raw, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    // eslint-disable-next-line no-console
    console.warn('[AuthContext] Failed to load profile for user', user.id, profileError);
    return { user, profile: null };
  }

  if (!raw) return { user, profile: null };

  // Normalize: PostgREST returns snake_case; ensure we have a consistent shape
  const profile: Profile = {
    id: raw.id,
    email: raw.email ?? null,
    display_name: raw.display_name ?? null,
    wp_user_id: raw.wp_user_id ?? null,
    is_member: Boolean(raw.is_member),
    membership_source: raw.membership_source ?? null,
    membership_plans: Array.isArray(raw.membership_plans) ? raw.membership_plans : [],
    member_since: raw.member_since ?? null,
    membership_expiration: raw.membership_expiration ?? null,
    is_guide: Boolean(raw.is_guide),
    is_substack_subscriber: Boolean(raw.is_substack_subscriber),
    newsletter_opted_in_at: raw.newsletter_opted_in_at ?? null,
    discord_id: raw.discord_id ?? null,
    username: raw.username ?? null,
    avatar_url: raw.avatar_url ?? null,
  };
  return { user, profile };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Initial session + profile load
  useEffect(() => {
    if (!supabase) {
      setStatus('unauthenticated');
      return;
    }

    let isMounted = true;
    (async () => {
      const { user: loadedUser, profile: loadedProfile } = await loadUserAndProfile();
      if (!isMounted) return;
      setUser(loadedUser);
      setProfile(loadedProfile);
      setStatus(loadedUser ? 'authenticated' : 'unauthenticated');
      if (loadedUser && typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    })();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setStatus(session?.user ? 'authenticated' : 'unauthenticated');
      // Strip hash from URL after OAuth/magic-link callback (Supabase puts tokens in hash)
      if (session?.user && typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      // We intentionally do not eagerly reload profile here – callers
      // should use refreshProfile() when needed to keep things predictable.
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Strip hash from URL whenever we're authenticated (handles OAuth/magic-link return and trailing #)
  useEffect(() => {
    if (status !== 'authenticated' || typeof window === 'undefined') return;
    if (window.location.hash) {
      const clean = window.location.pathname + (window.location.search || '') || '/';
      window.history.replaceState(null, '', clean);
    }
  }, [status]);

  const refreshProfile = useCallback(async () => {
    if (!supabase) return;
    const { user: loadedUser, profile: loadedProfile } = await loadUserAndProfile();
    setUser(loadedUser);
    setProfile(loadedProfile);
    setStatus(loadedUser ? 'authenticated' : 'unauthenticated');

    // Bridge membership status from WordPress if we have an identity to look up.
    if (!loadedUser) return;

    const emailForLookup =
      loadedProfile?.email ?? loadedUser.email ?? null;

    if (!emailForLookup) return;

    try {
      // Don't overwrite membership when Supabase is the source of truth for this user (e.g. manual grant or migrated member).
      if (loadedProfile?.membership_source === 'supabase') return;

      const membership = await fetchMembershipStatus(emailForLookup);

      if (membership && typeof membership.isMember === 'boolean') {
        const wpIsGuide =
          Array.isArray(membership.roles) &&
          membership.roles.some((r) => String(r).toLowerCase().includes('guide'));
        const nextProfile: Profile | null = loadedProfile
          ? {
              ...loadedProfile,
              is_member: membership.isMember,
              membership_source: membership.membershipSource ?? 'wordpress',
              is_guide: loadedProfile.is_guide || wpIsGuide,
            }
          : null;

        if (nextProfile) {
          const { error: upsertError } = await supabase
            .from('profiles')
            .update({
              is_member: nextProfile.is_member,
              membership_source: nextProfile.membership_source,
              is_guide: nextProfile.is_guide,
            })
            .eq('id', nextProfile.id);

          if (upsertError) {
            // eslint-disable-next-line no-console
            console.warn('[AuthContext] Failed to update membership flags in Supabase', upsertError);
          } else {
            setProfile(nextProfile);
          }
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[AuthContext] Failed to bridge membership status from WordPress', error);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      if (!supabase) {
        return { error: 'Sign-in is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' };
      }
      setStatus('loading');
      const { error, data } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setStatus('unauthenticated');
        return { error: error.message || 'Unable to log in. Please try again.' };
      }

      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      setStatus(sessionUser ? 'authenticated' : 'unauthenticated');
      await refreshProfile();
      return {};
    },
    [refreshProfile]
  );

  const signInWithMagicLink = useCallback(
    async (email: string, redirectTo?: string): Promise<{ error?: string }> => {
      if (!supabase) {
        return { error: 'Sign-in is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' };
      }
      const redirectTarget =
        redirectTo ?? (typeof window !== 'undefined' ? `${window.location.origin}/members` : undefined);
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTarget },
      });
      if (error) {
        return { error: error.message || 'Could not send the login link. Please try again.' };
      }
      posthog.capture(FUNNEL_EVENTS.LOGIN_REQUESTED, { method: 'magic_link' });
      return {};
    },
    []
  );

  const signInWithDiscord = useCallback(
    async (options?: { redirectTo?: string }): Promise<{ error?: string }> => {
      if (!supabase) {
        return { error: 'Sign-in is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' };
      }
      const redirectTo =
        options?.redirectTo ??
        (typeof window !== 'undefined' ? `${window.location.origin}/members` : undefined);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          scopes: 'identify email',
          redirectTo,
        },
      });
      if (error) {
        return { error: error.message || 'Could not sign in with Discord. Please try again.' };
      }
      posthog.capture(FUNNEL_EVENTS.LOGIN_REQUESTED, { method: 'discord' });
      return {};
    },
    []
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      options?: { displayName?: string }
    ): Promise<{ error?: string; needsEmailConfirmation?: boolean }> => {
      if (!supabase) {
        return { error: 'Sign-up is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' };
      }
      setStatus('loading');
      const { error, data } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: options?.displayName
            ? { display_name: options.displayName }
            : undefined,
        },
      });

      if (error) {
        setStatus('unauthenticated');
        return { error: error.message || 'Unable to create account. Please try again.' };
      }

      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      setStatus(sessionUser ? 'authenticated' : 'unauthenticated');
      if (sessionUser) {
        await refreshProfile();
        posthog.capture(FUNNEL_EVENTS.SIGNUP_REQUESTED, { method: 'password', immediate_session: true });
        return {};
      }
      posthog.capture(FUNNEL_EVENTS.SIGNUP_REQUESTED, { method: 'password', immediate_session: false });
      return { needsEmailConfirmation: true };
    },
    [refreshProfile]
  );

  const logout = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setStatus('unauthenticated');
  }, []);

  const linkDiscord = useCallback(
    async (options?: { redirectTo?: string }): Promise<{ error?: string }> => {
      if (!supabase) {
        return { error: 'Sign-in is not configured.' };
      }
      if (!user) {
        return { error: 'You must be logged in to link Discord.' };
      }
      const redirectTo =
        options?.redirectTo ??
        (typeof window !== 'undefined' ? `${window.location.origin}/members/settings` : undefined);
      const { error } = await supabase.auth.linkIdentity({
        provider: 'discord',
        options: { redirectTo },
      });
      if (error) {
        return { error: error.message || 'Could not link Discord. It may already be connected to another account.' };
      }
      return {};
    },
    [user]
  );

  const unlinkIdentity = useCallback(
    async (identity: { id: string; provider: string }): Promise<{ error?: string }> => {
      if (!supabase || !user) {
        return { error: 'Not authenticated.' };
      }
      const identities = user.identities ?? [];
      if (identities.length <= 1) {
        return { error: 'You must keep at least one login method.' };
      }
      const { error } = await supabase.auth.unlinkIdentity(identity);
      if (error) {
        return { error: error.message || 'Could not unlink this account.' };
      }
      await refreshProfile();
      return {};
    },
    [user, refreshProfile]
  );

  const value: AuthContextValue = useMemo(
    () => ({
      status,
      user,
      profile,
      login,
      signInWithMagicLink,
      signInWithDiscord,
      signUp,
      logout,
      refreshProfile,
      linkDiscord,
      unlinkIdentity,
    }),
    [status, user, profile, login, signInWithMagicLink, signInWithDiscord, signUp, logout, refreshProfile, linkDiscord, unlinkIdentity]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};

