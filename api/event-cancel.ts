// Migrated from /api/event-cancel.ts to Next.js API route

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';
import { checkRateLimit } from '../lib/rateLimit';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'Kandie Gang <hello@kandiegang.com>';
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://kandiegang.com');
const WP_GRAPHQL_URL =
  process.env.VITE_WP_GRAPHQL_URL ||
  process.env.WP_GRAPHQL_URL ||
  'https://wp-origin.kandiegang.com/graphql';

function createCancelToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(24).toString('base64url');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function fetchEventTitle(eventId: number): Promise<string> {
  const query = `query GetRideEventTitle($id: ID!) { rideEvent(id: $id, idType: DATABASE_ID) { title } }`;
  const response = await fetch(WP_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { id: eventId } }),
  });
  if (!response.ok) return 'Kandie Gang Event';
  const json = await response.json().catch(() => ({}));
  return json?.data?.rideEvent?.title || 'Kandie Gang Event';
}

function buildPromotedHtml(eventTitle: string, rideLevel: string, cancelUrl: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1F2223; max-width: 560px; margin: 0 auto; padding: 24px;"><h1 style="font-size: 1.4rem; color: #46519C; font-weight: 600;">A spot opened up</h1><p>You are now confirmed for:</p><p><strong>${eventTitle}</strong><br/>${rideLevel}</p><p style="margin-top: 24px; font-size: 0.9rem; color: #5f6264;">Need to cancel? Use the link below.</p><p style="margin-top: 8px;"><a href="${cancelUrl}" style="color: #46519C;">Cancel my spot</a></p></body></html>`;
}

function buildPromotedText(eventTitle: string, rideLevel: string, cancelUrl: string): string {
  return [
    'A spot opened up',
    '',
    'You are now confirmed for:',
    `${eventTitle} - ${rideLevel}`,
    '',
    'Need to cancel? Use this link:',
    cancelUrl,
  ].join('\n');
}


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // Authenticated: Authorization header present
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (bearerToken) {
    if (!checkRateLimit(req, res, { windowMs: 60_000, max: 20, keyPrefix: 'event-cancel-auth' })) {
      return;
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Event cancellation is not configured' });
    }
    const body = req.body as { eventId?: string | number; rideLevel?: string };
    const eventIdRaw = body?.eventId;
    const rideLevel = typeof body?.rideLevel === 'string' ? body.rideLevel : null;
    const eventId = typeof eventIdRaw === 'string' ? Number(eventIdRaw) : eventIdRaw;
    if (!eventId || Number.isNaN(eventId)) {
      return res.status(400).json({ error: 'Missing or invalid eventId' });
    }
    if (!rideLevel) {
      return res.status(400).json({ error: 'Missing ride level' });
    }
    try {
      const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const {
        data: { user },
        error: userError,
      } = await anonClient.auth.getUser(bearerToken);
      if (userError || !user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data, error } = await adminClient
        .from('registrations')
        .update({ cancelled_at: new Date().toISOString() })
        .eq('event_id', Number(eventId))
        .eq('ride_level', rideLevel)
        .eq('user_id', user.id)
        .is('cancelled_at', null)
        .select('id, is_waitlist, cancel_token_hash')
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error('Event cancel auth error:', error);
        return res.status(500).json({ error: error.message || 'Failed to cancel registration' });
      }
      if (!data) {
        return res.status(404).json({ error: 'Registration not found or already cancelled' });
      }
      if (data && data.is_waitlist === false) {
        const { data: nextInLine } = await adminClient
          .from('registrations')
          .select('id, user_id, email, ride_level')
          .eq('event_id', Number(eventId))
          .eq('ride_level', rideLevel)
          .eq('is_waitlist', true)
          .is('cancelled_at', null)
          .order('waitlist_joined_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (nextInLine) {
          // Generate a new cancel token for the promoted user
          const { token: newCancelToken, hash: newCancelTokenHash } = createCancelToken();

          // Update registration: promote from waitlist and issue new cancel token
          await adminClient
            .from('registrations')
            .update({
              is_waitlist: false,
              waitlist_promoted_at: new Date().toISOString(),
              cancel_token_hash: newCancelTokenHash,
              cancel_token_issued_at: new Date().toISOString(),
            })
            .eq('id', nextInLine.id);

          if (RESEND_API_KEY) {
            try {
              const resend = new Resend(RESEND_API_KEY);

              // Get email - either from guest signup or user profile
              let recipientEmail: string | null = null;

              if (nextInLine.email) {
                // Guest signup - email is in registration
                recipientEmail = nextInLine.email;
              } else if (nextInLine.user_id) {
                // Authenticated user - get email from profile
                const { data: profile } = await adminClient
                  .from('profiles')
                  .select('email')
                  .eq('id', nextInLine.user_id)
                  .single();
                recipientEmail = profile?.email ?? null;
              }

              if (recipientEmail) {
                const eventTitle = await fetchEventTitle(Number(eventId));
                // Use the actual token (not the hash) in the cancel URL
                const cancelUrl = `${BASE_URL}/event/cancel?token=${encodeURIComponent(newCancelToken)}`;
                await resend.emails.send({
                  from: FROM_EMAIL,
                  to: recipientEmail,
                  subject: 'A spot opened up for your event',
                  html: buildPromotedHtml(eventTitle, nextInLine.ride_level, cancelUrl),
                  text: buildPromotedText(eventTitle, nextInLine.ride_level, cancelUrl),
                });
              }
            } catch (emailErr) {
              console.warn('Waitlist promotion email failed:', emailErr);
            }
          }
        }
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('event-cancel-auth error:', err);
      return res.status(500).json({ error: 'Failed to cancel registration' });
    }
  }
  // Unauthenticated: fallback to token-based cancellation
  if (!checkRateLimit(req, res, { windowMs: 60_000, max: 20, keyPrefix: 'event-cancel' })) {
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Event cancellation is not configured' });
  }
  const body = req.body as { token?: string };
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  if (!token) {
    return res.status(400).json({ error: 'Missing cancellation token' });
  }
  try {
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const tokenHash = hashToken(token);
    const { data, error } = await adminClient
      .from('registrations')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('cancel_token_hash', tokenHash)
      .is('cancelled_at', null)
      .select('id, event_id, ride_level')
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('Event cancel error:', error);
      return res.status(500).json({ error: error.message || 'Failed to cancel registration' });
    }
    if (!data) {
      return res.status(404).json({ error: 'Cancellation link is invalid or already used' });
    }
    if (data?.event_id && data?.ride_level) {
      const { data: nextInLine } = await adminClient
        .from('registrations')
        .select('id, user_id, ride_level, cancel_token_hash')
        .eq('event_id', data.event_id)
        .eq('ride_level', data.ride_level)
        .eq('is_waitlist', true)
        .is('cancelled_at', null)
        .order('waitlist_joined_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (nextInLine) {
        await adminClient
          .from('registrations')
          .update({ is_waitlist: false, waitlist_promoted_at: new Date().toISOString() })
          .eq('id', nextInLine.id);
        if (RESEND_API_KEY) {
          try {
            const resend = new Resend(RESEND_API_KEY);
            const { data: profile } = await adminClient
              .from('profiles')
              .select('email')
              .eq('id', nextInLine.user_id)
              .single();
            const email = profile?.email ?? null;
            if (email) {
              const eventTitle = await fetchEventTitle(Number(data.event_id));
              const cancelUrl = `${BASE_URL}/event/cancel?token=${encodeURIComponent(token)}`;
              await resend.emails.send({
                from: FROM_EMAIL,
                to: email,
                subject: 'A spot opened up for your event',
                html: buildPromotedHtml(eventTitle, nextInLine.ride_level, cancelUrl),
                text: buildPromotedText(eventTitle, nextInLine.ride_level, cancelUrl),
              });
            }
          } catch (emailErr) {
            console.warn('Waitlist promotion email failed:', emailErr);
          }
        }
      }
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('event-cancel error:', err);
    return res.status(500).json({ error: 'Failed to cancel registration' });
  }
}
