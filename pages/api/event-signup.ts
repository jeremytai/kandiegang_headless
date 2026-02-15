// Migrated from /api/event-signup.ts to Next.js API route
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';
import { checkRateLimit } from './_rateLimit';

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
const FLINTA_EARLY_DAYS = Number(process.env.FLINTA_EARLY_DAYS ?? 4);
const MEMBER_EARLY_DAYS = Number(process.env.MEMBER_EARLY_DAYS ?? 2);
const PLACES_PER_GUIDE = 7;

type EventSignupBody = {
  eventId?: string | number;
  rideLevel?: string;
  eventType?: string;
  flintaAttested?: boolean;
  eventTitle?: string;
  firstName?: string;
  lastName?: string;
};

type EventAccessData = {
  publicReleaseDate?: string | null;
  isFlintaOnly?: boolean | null;
  workshopCapacity?: number | null;
  guideCounts: Record<string, number>;
};

async function fetchEventAccessData(eventId: number): Promise<EventAccessData | null> {
  const query = `query GetRideEventAccess($id: ID!) { rideEvent(id: $id, idType: DATABASE_ID) { publicReleaseDate eventDetails { isFlintaOnly workshopCapacity level1 { guides { nodes { id } } } level2 { guides { nodes { id } } } level2plus { guides { nodes { id } } } level3 { guides { nodes { id } } } } } }`;
  const response = await fetch(WP_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { id: eventId } }),
  });
  if (!response.ok) {
    throw new Error(`WordPress query failed: ${response.status}`);
  }
  const json = await response.json();
  if (json?.errors) {
    throw new Error('WordPress query error');
  }
  const rideEvent = json?.data?.rideEvent;
  if (!rideEvent) return null;
  const details = rideEvent.eventDetails ?? {};
  const guideCounts = {
    level1: Array.isArray(details.level1?.guides?.nodes) ? details.level1.guides.nodes.length : 0,
    level2: Array.isArray(details.level2?.guides?.nodes) ? details.level2.guides.nodes.length : 0,
    level2plus: Array.isArray(details.level2plus?.guides?.nodes)
      ? details.level2plus.guides.nodes.length
      : 0,
    level3: Array.isArray(details.level3?.guides?.nodes) ? details.level3.guides.nodes.length : 0,
  };
  return {
    publicReleaseDate: rideEvent.publicReleaseDate ?? null,
    isFlintaOnly: details.isFlintaOnly ?? null,
    workshopCapacity:
      typeof details.workshopCapacity === 'number' ? details.workshopCapacity : null,
    guideCounts,
  };
}

function isWithinWindow(now: Date, target: Date, daysBefore: number): boolean {
  const windowStart = new Date(target.getTime() - daysBefore * 24 * 60 * 60 * 1000);
  return now >= windowStart && now < target;
}

function buildConfirmationHtml(eventTitle: string, rideLevel: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1F2223; max-width: 560px; margin: 0 auto; padding: 24px;"><h1 style="font-size: 1.4rem; color: #46519C; font-weight: 600;">Your event spot is saved</h1><p>We have you on the list for:</p><p><strong>${eventTitle}</strong><br/>${rideLevel}</p><p style="margin-top: 24px; font-size: 0.9rem; color: #5f6264;">Need to cancel? Use the link below.</p><p style="margin-top: 8px;"><a href="{{CANCEL_URL}}" style="color: #46519C;">Cancel my spot</a></p></body></html>`;
}

function buildConfirmationText(eventTitle: string, rideLevel: string): string {
  return [
    'Your event spot is saved',
    '',
    'We have you on the list for:',
    `${eventTitle} - ${rideLevel}`,
    '',
    'Need to cancel? Use this link:',
    '{{CANCEL_URL}}',
  ].join('\n');
}

function buildWaitlistHtml(eventTitle: string, rideLevel: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1F2223; max-width: 560px; margin: 0 auto; padding: 24px;"><h1 style="font-size: 1.4rem; color: #46519C; font-weight: 600;">You are on the waitlist</h1><p>We added you to the waitlist for:</p><p><strong>${eventTitle}</strong><br/>${rideLevel}</p><p style="margin-top: 24px; font-size: 0.9rem; color: #5f6264;">If a spot opens, we will email you right away.</p><p style="margin-top: 8px;"><a href="{{CANCEL_URL}}" style="color: #46519C;">Leave the waitlist</a></p></body></html>`;
}

function buildWaitlistText(eventTitle: string, rideLevel: string): string {
  return [
    'You are on the waitlist',
    '',
    'We added you to the waitlist for:',
    `${eventTitle} - ${rideLevel}`,
    '',
    'If a spot opens, we will email you right away.',
    'Leave the waitlist:',
    '{{CANCEL_URL}}',
  ].join('\n');
}

function _buildPromotedHtml(eventTitle: string, rideLevel: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1F2223; max-width: 560px; margin: 0 auto; padding: 24px;"><h1 style="font-size: 1.4rem; color: #46519C; font-weight: 600;">A spot opened up</h1><p>You are now confirmed for:</p><p><strong>${eventTitle}</strong><br/>${rideLevel}</p><p style="margin-top: 24px; font-size: 0.9rem; color: #5f6264;">Need to cancel? Use the link below.</p><p style="margin-top: 8px;"><a href="{{CANCEL_URL}}" style="color: #46519C;">Cancel my spot</a></p></body></html>`;
}

function _buildPromotedText(eventTitle: string, rideLevel: string): string {
  return [
    'A spot opened up',
    '',
    'You are now confirmed for:',
    `${eventTitle} - ${rideLevel}`,
    '',
    'Need to cancel? Use this link:',
    '{{CANCEL_URL}}',
  ].join('\n');
}

function createCancelToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(24).toString('base64url');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

function getCapacityForLevel(rideLevel: string, access: EventAccessData): number | null {
  if (rideLevel === 'workshop') {
    return access.workshopCapacity ?? null;
  }
  const guideCount = access.guideCounts[rideLevel] ?? 0;
  if (!guideCount) return 0;
  return guideCount * PLACES_PER_GUIDE;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!checkRateLimit(req, res, { windowMs: 60_000, max: 20, keyPrefix: 'event-signup' })) {
    return;
  }
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Server configuration error' });
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Event signup is not configured' });
  }
  const body = req.body as EventSignupBody;
  const eventIdRaw = body?.eventId;
  const rideLevel = typeof body?.rideLevel === 'string' ? body.rideLevel : null;
  const eventType = typeof body?.eventType === 'string' ? body.eventType : null;
  const eventTitle = typeof body?.eventTitle === 'string' ? body.eventTitle : 'Kandie Gang Event';
  const flintaAttested = Boolean(body?.flintaAttested);
  const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body?.lastName === 'string' ? body.lastName.trim() : '';
  const eventId = typeof eventIdRaw === 'string' ? Number(eventIdRaw) : eventIdRaw;
  if (!eventId || Number.isNaN(eventId)) {
    return res.status(400).json({ error: 'Missing or invalid eventId' });
  }
  if (!rideLevel) {
    return res.status(400).json({ error: 'Missing ride level' });
  }
  if (!firstName || !lastName) {
    return res.status(400).json({ error: 'Missing first or last name' });
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
    const { token: cancelToken, hash: cancelTokenHash } = createCancelToken();
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('is_member')
      .eq('id', user.id)
      .single();
    if (profileError) {
      console.error('Event signup profile error:', profileError);
      return res.status(500).json({ error: 'Failed to verify membership' });
    }
    const isMember = Boolean(profile?.is_member);
    let access: EventAccessData | null = null;
    try {
      access = await fetchEventAccessData(eventId);
    } catch (eventError) {
      console.error('Event signup event fetch error:', eventError);
      return res.status(502).json({ error: 'Unable to verify event access window' });
    }
    if (!access) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const isFlintaOnly = Boolean(access.isFlintaOnly);
    if (isFlintaOnly && !flintaAttested) {
      return res.status(403).json({ error: 'This event is FLINTA only.' });
    }
    const now = new Date();
    const releaseDate = access.publicReleaseDate ? new Date(access.publicReleaseDate) : null;
    const hasReleaseDate = Boolean(releaseDate && !Number.isNaN(releaseDate.getTime()));
    if (hasReleaseDate && releaseDate) {
      const isPublic = now >= releaseDate;
      const inMemberWindow = isWithinWindow(now, releaseDate, MEMBER_EARLY_DAYS);
      const inFlintaWindow = isWithinWindow(now, releaseDate, FLINTA_EARLY_DAYS);
      if (!isPublic) {
        if (inMemberWindow && !isMember && !flintaAttested) {
          return res.status(403).json({ error: 'Member early access only.' });
        }
        if (inFlintaWindow && !flintaAttested) {
          return res.status(403).json({ error: 'FLINTA early access only.' });
        }
        if (!inMemberWindow && !inFlintaWindow) {
          return res.status(403).json({ error: 'Registration and waitlist are not open yet.' });
        }
      }
    }
    const { data: existing } = await adminClient
      .from('registrations')
      .select('id, is_waitlist')
      .eq('event_id', eventId)
      .eq('ride_level', rideLevel)
      .eq('user_id', user.id)
      .is('cancelled_at', null)
      .limit(1)
      .maybeSingle();
    if (existing) {
      return res.status(409).json({
        error: existing.is_waitlist
          ? 'You are already on the waitlist.'
          : 'You are already registered for this level.',
      });
    }
    const insertPayload: Record<string, unknown> = {
      event_id: eventId,
      user_id: user.id,
      ride_level: rideLevel,
      event_type: eventType ?? 'ride',
      cancel_token_hash: cancelTokenHash,
      cancel_token_issued_at: new Date().toISOString(),
      first_name: firstName,
      last_name: lastName,
    };
    const capacity = getCapacityForLevel(rideLevel, access);
    let waitlisted = false;
    if (capacity != null) {
      const { count, error: countError } = await adminClient
        .from('registrations')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('ride_level', rideLevel)
        .eq('is_waitlist', false)
        .is('cancelled_at', null);
      if (countError) {
        console.error('Event signup capacity error:', countError);
        return res.status(500).json({ error: 'Unable to verify capacity' });
      }
      if (typeof count === 'number' && count >= capacity) {
        waitlisted = true;
      }
    }
    if (waitlisted) {
      insertPayload.is_waitlist = true;
      insertPayload.waitlist_joined_at = new Date().toISOString();
    } else {
      insertPayload.is_waitlist = false;
    }
    const { error: insertError } = await adminClient.from('registrations').insert(insertPayload);
    if (insertError) {
      console.error('Event signup insert error:', insertError);
      return res.status(500).json({ error: insertError.message || 'Failed to save signup' });
    }
    if (RESEND_API_KEY) {
      try {
        const resend = new Resend(RESEND_API_KEY);
        const { data: profile } = await adminClient
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .single();
        const email = profile?.email ?? null;
        if (email) {
          const cancelUrl = `${BASE_URL}/event/cancel?token=${encodeURIComponent(cancelToken)}`;
          const html = waitlisted
            ? buildWaitlistHtml(eventTitle, rideLevel).replace('{{CANCEL_URL}}', cancelUrl)
            : buildConfirmationHtml(eventTitle, rideLevel).replace('{{CANCEL_URL}}', cancelUrl);
          const text = waitlisted
            ? buildWaitlistText(eventTitle, rideLevel).replace('{{CANCEL_URL}}', cancelUrl)
            : buildConfirmationText(eventTitle, rideLevel).replace('{{CANCEL_URL}}', cancelUrl);
          await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: waitlisted ? 'You are on the waitlist' : 'Your event spot is saved',
            html,
            text,
          });
        }
      } catch (emailErr) {
        console.warn('Event signup email failed:', emailErr);
      }
    }
    return res.status(200).json({ success: true, waitlisted });
  } catch (err) {
    console.error('event-signup error:', err);
    return res.status(500).json({ error: 'Failed to save signup' });
  }
}
