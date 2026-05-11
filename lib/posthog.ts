/**
 * PostHog analytics: init only when key is set. Called from CookieConsentContext
 * after analytics consent so we don't track before consent (GDPR/TTDSG).
 *
 * Reverse proxy: events are sent to `api_host` (first-party subdomain by default).
 * Keep `ui_host` pointed at the real PostHog region so in-app links (session replay,
 * toolbar) still resolve. See: https://posthog.com/docs/advanced/proxy
 *
 * Funnel events: use these names in PostHog when building funnels (Insights → Funnels).
 */

import posthog from 'posthog-js';

let initialized = false;

/** First-party ingest (reverse proxy). Override with `VITE_POSTHOG_HOST` in env. */
const DEFAULT_POSTHOG_API_HOST = 'https://g.kandiegang.com';
/** PostHog EU app origin (not the proxy). Override with `VITE_POSTHOG_UI_HOST` if needed. */
const DEFAULT_POSTHOG_UI_HOST = 'https://eu.posthog.com';

/** Funnel event names – use these in PostHog when defining funnel steps */
export const FUNNEL_EVENTS = {
  ADDED_TO_CART: 'added_to_cart',
  CHECKOUT_STARTED: 'checkout_started',
  ORDER_COMPLETED: 'order_completed',
  CHECKOUT_CANCELLED: 'checkout_cancelled',
  CONTACT_FORM_SUBMITTED: 'contact_form_submitted',
  MEMBERS_AREA_VIEWED: 'members_area_viewed',
  SIGNUP_REQUESTED: 'signup_requested',
  LOGIN_REQUESTED: 'login_requested',
} as const;

export function initPostHog(): void {
  if (initialized) return;
  if (typeof window === 'undefined') return;

  const env = (import.meta as unknown as {
    env: { VITE_POSTHOG_KEY?: string; VITE_POSTHOG_HOST?: string; VITE_POSTHOG_UI_HOST?: string };
  }).env;

  const key = env.VITE_POSTHOG_KEY?.trim();
  if (!key) return;

  const apiHost = env.VITE_POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_API_HOST;
  const uiHost = env.VITE_POSTHOG_UI_HOST?.trim() || DEFAULT_POSTHOG_UI_HOST;

  posthog.init(key, {
    api_host: apiHost.replace(/\/$/, ''),
    ui_host: uiHost.replace(/\/$/, ''),
    defaults: '2026-01-30',
    person_profiles: 'identified_only',
    respect_dnt: true,
  });
  posthog.opt_in_capturing();
  initialized = true;
}

/** Call when user revokes analytics consent so PostHog stops sending data (GDPR). */
export function optOutPostHog(): void {
  if (typeof window === 'undefined' || !initialized) return;
  posthog.opt_out_capturing();
}

export { posthog };
