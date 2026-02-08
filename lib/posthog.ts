/**
 * PostHog analytics: init only when key is set. Called from CookieConsentContext
 * after analytics consent so we don't track before consent (GDPR/TTDSG).
 *
 * Funnel events: use these names in PostHog when building funnels (Insights → Funnels).
 */

import posthog from 'posthog-js';

let initialized = false;

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

  const key = (import.meta as unknown as { env: { VITE_POSTHOG_KEY?: string } }).env.VITE_POSTHOG_KEY?.trim();
  if (!key) return;

  const host = (import.meta as unknown as { env: { VITE_POSTHOG_HOST?: string } }).env.VITE_POSTHOG_HOST?.trim();
  posthog.init(key, {
    api_host: host || 'https://us.i.posthog.com',
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
