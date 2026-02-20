// Combined event API: capacity (GET), signup (POST action=signup), cancel (POST action=cancel)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';
import { Redis } from '@upstash/redis';

// ─── Shared constants ─────────────────────────────────────────────────────────
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
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

// ─── Rate limiting ────────────────────────────────────────────────────────────
type RateLimitOptions = { windowMs: number; max: number; keyPrefix: string };
type Bucket = { count: number; resetAt: number };
const inMemoryBuckets = new Map<string, Bucket>();

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (value && typeof value === 'string') return value.split(',')[0].trim();
  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') return realIp;
  return 'unknown';
}

async function checkRateLimit(
  req: VercelRequest,
  res: VercelResponse,
  options: RateLimitOptions
): Promise<boolean> {
  const ip = getClientIp(req);
  const key = `ratelimit:${options.keyPrefix}:${ip}`;

  if (redis) {
    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.pexpire(key, options.windowMs);
      if (count > options.max) {
        res.status(429).json({ error: 'Too many requests. Please try again later.' });
        return false;
      }
      return true;
    } catch (error) {
      console.error('[event] Rate limit Redis error, falling back to in-memory:', error);
    }
  }

  const now = Date.now();
  const current = inMemoryBuckets.get(key);
  if (!current || now > current.resetAt) {
    inMemoryBuckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return true;
  }
  if (current.count >= options.max) {
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return false;
  }
  current.count += 1;
  inMemoryBuckets.set(key, current);
  return true;
}

// ─── Shared utilities ─────────────────────────────────────────────────────────
function createCancelToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(24).toString('base64url');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function verifyTurnstile(token: string, remoteIp: string): Promise<boolean> {
  if (!TURNSTILE_SECRET_KEY) {
    console.warn('[event] Turnstile secret key not configured');
    return true;
  }
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: remoteIp,
      }),
    });
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('[event] Turnstile verification failed:', error);
    return false;
  }
}

// ─── WordPress fetch ──────────────────────────────────────────────────────────
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
  if (!response.ok) throw new Error(`WordPress query failed: ${response.status}`);
  const json = await response.json();
  if (json?.errors) throw new Error('WordPress query error');
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

function isWithinWindow(now: Date, target: Date, daysBefore: number): boolean {
  const windowStart = new Date(target.getTime() - daysBefore * 24 * 60 * 60 * 1000);
  return now >= windowStart && now < target;
}

function getCapacityForLevel(rideLevel: string, access: EventAccessData): number | null {
  if (rideLevel === 'workshop') return access.workshopCapacity ?? null;
  const guideCount = access.guideCounts[rideLevel] ?? 0;
  if (!guideCount) return 0;
  return guideCount * PLACES_PER_GUIDE;
}

// ─── Email builders ───────────────────────────────────────────────────────────
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

// ─── Capacity handler (GET) ───────────────────────────────────────────────────
async function handleCapacity(req: VercelRequest, res: VercelResponse) {
  if (!(await checkRateLimit(req, res, { windowMs: 60_000, max: 60, keyPrefix: 'event-capacity' })))
    return;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Capacity lookup is not configured' });
  }

  const eventIdRaw = req.query.eventId;
  const eventId = Array.isArray(eventIdRaw) ? eventIdRaw[0] : eventIdRaw;
  const eventIdNumber = eventId ? Number(eventId) : NaN;

  if (!eventId || Number.isNaN(eventIdNumber)) {
    return res.status(400).json({ error: 'Missing or invalid eventId' });
  }

  try {
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await adminClient
      .from('registrations')
      .select('ride_level')
      .eq('event_id', eventIdNumber)
      .eq('is_waitlist', false)
      .is('cancelled_at', null);

    if (error) {
      console.error('[event-capacity] Query error:', error);
      return res.status(500).json({ error: error.message || 'Failed to load capacity' });
    }

    const counts: Record<string, number> = {};
    const rows = Array.isArray(data) ? data : [];
    rows.forEach((row) => {
      const level =
        typeof row.ride_level === 'string' && row.ride_level.trim() ? row.ride_level : 'workshop';
      counts[level] = (counts[level] ?? 0) + 1;
    });

    return res.status(200).json({ eventId: eventIdNumber, total: rows.length, counts });
  } catch (err) {
    console.error('[event-capacity] Error:', err);
    return res.status(500).json({ error: 'Failed to load capacity' });
  }
}

// ─── Signup handler (POST, action=signup) ─────────────────────────────────────
type EventSignupBody = {
  action?: string;
  eventId?: string | number;
  rideLevel?: string;
  eventType?: string;
  flintaAttested?: boolean;
  eventTitle?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  turnstileToken?: string;
};

async function handleSignup(req: VercelRequest, res: VercelResponse) {
  if (!(await checkRateLimit(req, res, { windowMs: 60_000, max: 20, keyPrefix: 'event-signup' })))
    return;

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const isGuestSignup = !token;

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
  const eventTitle =
    typeof body?.eventTitle === 'string' ? body.eventTitle.trim() : 'Kandie Gang Event';
  const flintaAttested = Boolean(body?.flintaAttested);
  const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body?.lastName === 'string' ? body.lastName.trim() : '';
  const guestEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const turnstileToken = typeof body?.turnstileToken === 'string' ? body.turnstileToken : '';
  const eventId = typeof eventIdRaw === 'string' ? Number(eventIdRaw) : eventIdRaw;

  if (!eventId || Number.isNaN(eventId as number)) {
    return res.status(400).json({ error: 'Missing or invalid eventId' });
  }
  if (!rideLevel) return res.status(400).json({ error: 'Missing ride level' });
  if (!firstName || !lastName) {
    return res.status(400).json({ error: 'Missing first or last name' });
  }
  if (firstName.length > 100) {
    return res.status(400).json({ error: 'First name is too long (max 100 characters)' });
  }
  if (lastName.length > 100) {
    return res.status(400).json({ error: 'Last name is too long (max 100 characters)' });
  }
  if (eventTitle.length > 200) {
    return res.status(400).json({ error: 'Event title is too long (max 200 characters)' });
  }

  if (isGuestSignup) {
    if (!guestEmail) return res.status(400).json({ error: 'Email is required for guest signup' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestEmail)) {
      return res.status(400).json({ error: 'Invalid email address format' });
    }
    if (guestEmail.length > 255) {
      return res.status(400).json({ error: 'Email is too long (max 255 characters)' });
    }
    if (TURNSTILE_SECRET_KEY && !turnstileToken) {
      return res.status(400).json({ error: 'Bot verification required' });
    }
    if (turnstileToken) {
      const clientIp = getClientIp(req);
      const isValidTurnstile = await verifyTurnstile(turnstileToken, clientIp);
      if (!isValidTurnstile) {
        console.warn('[event-signup] Turnstile verification failed for IP:', clientIp);
        return res.status(403).json({ error: 'Bot verification failed. Please try again.' });
      }
    }
  }

  try {
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let userId: string | null = null;
    let userEmail: string | null = null;
    let isMember = false;

    if (isGuestSignup) {
      userEmail = guestEmail;
    } else {
      const {
        data: { user },
        error: userError,
      } = await anonClient.auth.getUser(token ?? undefined);
      if (userError || !user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      userId = user.id;
      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('is_member, email')
        .eq('id', user.id)
        .single();
      if (profileError) {
        console.error('Event signup profile error:', profileError);
        return res.status(500).json({ error: 'Failed to verify membership' });
      }
      isMember = Boolean(profile?.is_member);
      userEmail = profile?.email ?? user.email ?? null;
    }

    const { token: cancelToken, hash: cancelTokenHash } = createCancelToken();
    let access: EventAccessData | null = null;
    try {
      access = await fetchEventAccessData(eventId as number);
    } catch (eventError) {
      console.error('Event signup event fetch error:', eventError);
      return res.status(502).json({ error: 'Unable to verify event access window' });
    }
    if (!access) return res.status(404).json({ error: 'Event not found' });

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

    let existingQuery = adminClient
      .from('registrations')
      .select('id, is_waitlist')
      .eq('event_id', eventId)
      .eq('ride_level', rideLevel)
      .is('cancelled_at', null);
    if (userId) {
      existingQuery = existingQuery.eq('user_id', userId);
    } else {
      existingQuery = existingQuery.eq('email', userEmail!);
    }
    const { data: existing } = await existingQuery.limit(1).maybeSingle();
    if (existing) {
      return res.status(409).json({
        error: existing.is_waitlist
          ? 'You are already on the waitlist.'
          : 'You are already registered for this level.',
      });
    }

    const insertPayload: Record<string, unknown> = {
      event_id: eventId,
      user_id: userId,
      email: userEmail,
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
      if (typeof count === 'number' && count >= capacity) waitlisted = true;
    }

    insertPayload.is_waitlist = waitlisted;
    if (waitlisted) insertPayload.waitlist_joined_at = new Date().toISOString();

    const { error: insertError } = await adminClient.from('registrations').insert(insertPayload);
    if (insertError) {
      console.error('Event signup insert error:', insertError);
      return res.status(500).json({ error: insertError.message || 'Failed to save signup' });
    }

    if (RESEND_API_KEY && userEmail) {
      try {
        const resend = new Resend(RESEND_API_KEY);
        const cancelUrl = `${BASE_URL}/event/cancel?token=${encodeURIComponent(cancelToken)}`;
        const html = waitlisted
          ? buildWaitlistHtml(eventTitle, rideLevel).replace('{{CANCEL_URL}}', cancelUrl)
          : buildConfirmationHtml(eventTitle, rideLevel).replace('{{CANCEL_URL}}', cancelUrl);
        const text = waitlisted
          ? buildWaitlistText(eventTitle, rideLevel).replace('{{CANCEL_URL}}', cancelUrl)
          : buildConfirmationText(eventTitle, rideLevel).replace('{{CANCEL_URL}}', cancelUrl);
        await resend.emails.send({
          from: FROM_EMAIL,
          to: userEmail,
          subject: waitlisted ? 'You are on the waitlist' : 'Your event spot is saved',
          html,
          text,
        });
      } catch (emailErr) {
        console.error('[event-signup] Email failed:', emailErr);
      }
    }

    return res.status(200).json({ success: true, waitlisted });
  } catch (err) {
    console.error('event-signup error:', err);
    return res.status(500).json({ error: 'Failed to save signup' });
  }
}

// ─── Cancel handler (POST, action=cancel) ─────────────────────────────────────
async function handleCancel(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (bearerToken) {
    // Authenticated cancellation
    if (
      !(await checkRateLimit(req, res, {
        windowMs: 60_000,
        max: 20,
        keyPrefix: 'event-cancel-auth',
      }))
    )
      return;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Event cancellation is not configured' });
    }

    const body = req.body as { action?: string; eventId?: string | number; rideLevel?: string };
    const eventIdRaw = body?.eventId;
    const rideLevel = typeof body?.rideLevel === 'string' ? body.rideLevel : null;
    const eventId = typeof eventIdRaw === 'string' ? Number(eventIdRaw) : eventIdRaw;

    if (!eventId || Number.isNaN(eventId as number)) {
      return res.status(400).json({ error: 'Missing or invalid eventId' });
    }
    if (!rideLevel) return res.status(400).json({ error: 'Missing ride level' });

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

      if (data.is_waitlist === false) {
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
          const { token: newCancelToken, hash: newCancelTokenHash } = createCancelToken();
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
              let recipientEmail: string | null = null;
              if (nextInLine.email) {
                recipientEmail = nextInLine.email;
              } else if (nextInLine.user_id) {
                const { data: profile } = await adminClient
                  .from('profiles')
                  .select('email')
                  .eq('id', nextInLine.user_id)
                  .single();
                recipientEmail = profile?.email ?? null;
              }
              if (recipientEmail) {
                const eventTitle = await fetchEventTitle(Number(eventId));
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

  // Token-based cancellation (from email link)
  if (
    !(await checkRateLimit(req, res, { windowMs: 60_000, max: 20, keyPrefix: 'event-cancel' }))
  )
    return;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Event cancellation is not configured' });
  }

  const body = req.body as { action?: string; token?: string };
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  if (!token) return res.status(400).json({ error: 'Missing cancellation token' });

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

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return handleCapacity(req, res);
  if (req.method === 'POST') {
    const action = (req.body as Record<string, unknown>)?.action;
    if (action === 'signup') return handleSignup(req, res);
    if (action === 'cancel') return handleCancel(req, res);
    return res.status(400).json({ error: 'Invalid or missing action' });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
