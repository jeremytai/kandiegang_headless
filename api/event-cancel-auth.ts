import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { checkRateLimit } from './_rateLimit';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'Kandie Gang <hello@kandiegang.com>';
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://kandiegang.com');
const WP_GRAPHQL_URL =
  process.env.VITE_WP_GRAPHQL_URL ||
  process.env.WP_GRAPHQL_URL ||
  'https://wp-origin.kandiegang.com/graphql';

async function fetchEventTitle(eventId: number): Promise<string> {
  const query = `
    query GetRideEventTitle($id: ID!) {
      rideEvent(id: $id, idType: DATABASE_ID) {
        title
      }
    }
  `;

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
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1F2223; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.4rem; color: #46519C; font-weight: 600;">A spot opened up</h1>
  <p>You are now confirmed for:</p>
  <p><strong>${eventTitle}</strong><br/>${rideLevel}</p>
  <p style="margin-top: 24px; font-size: 0.9rem; color: #5f6264;">Need to cancel? Use the link below.</p>
  <p style="margin-top: 8px;">
    <a href="${cancelUrl}" style="color: #46519C;">Cancel my spot</a>
  </p>
</body>
</html>`;
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!checkRateLimit(req, res, { windowMs: 60_000, max: 20, keyPrefix: 'event-cancel-auth' })) {
    return;
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
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
    } = await anonClient.auth.getUser(token);
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
        .select('id, user_id, ride_level, cancel_token_hash')
        .eq('event_id', Number(eventId))
        .eq('ride_level', rideLevel)
        .eq('is_waitlist', true)
        .is('cancelled_at', null)
        .order('waitlist_joined_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextInLine) {
        await adminClient
          .from('registrations')
          .update({
            is_waitlist: false,
            waitlist_promoted_at: new Date().toISOString(),
          })
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
              const eventTitle = await fetchEventTitle(Number(eventId));
              const cancelUrl = `${BASE_URL}/event/cancel?token=${encodeURIComponent(
                nextInLine.cancel_token_hash
              )}`;
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
    console.error('event-cancel-auth error:', err);
    return res.status(500).json({ error: 'Failed to cancel registration' });
  }
}
