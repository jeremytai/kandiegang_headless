// Guide ride-level cancellation endpoint
// POST /api/guide-cancel-ride
// Requires Bearer token from an authenticated guide.
// Cancels all registrations for the given event+level and emails every rider.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// ─── Config ───────────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRideLevel(rideLevel: string): string {
  const map: Record<string, string> = {
    level1: 'Level 1',
    level2: 'Level 2',
    level2plus: 'Level 2+',
    level3: 'Level 3',
    workshop: 'Workshop',
  };
  return map[rideLevel] ?? rideLevel;
}

async function fetchEventTitleAndSlug(
  eventId: number
): Promise<{ title: string; slug: string | null }> {
  const query = `query GetRideEventTitle($id: ID!) { rideEvent(id: $id, idType: DATABASE_ID) { title slug } }`;
  try {
    const response = await fetch(WP_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { id: eventId } }),
    });
    if (!response.ok) return { title: 'Kandie Gang Event', slug: null };
    const json = await response.json().catch(() => ({}));
    return {
      title: json?.data?.rideEvent?.title || 'Kandie Gang Event',
      slug: json?.data?.rideEvent?.slug ?? null,
    };
  } catch {
    return { title: 'Kandie Gang Event', slug: null };
  }
}

// Returns the array of WP databaseId values for guides on the given level.
async function fetchLevelGuideIds(
  eventId: number,
  rideLevel: string
): Promise<number[]> {
  const levelField =
    rideLevel === 'level2plus' ? 'level2plus' : rideLevel; // field names match in WP
  const query = `query GetEventLevelGuides($id: ID!) {
    rideEvent(id: $id, idType: DATABASE_ID) {
      eventDetails {
        level1 { guides { nodes { databaseId } } }
        level2 { guides { nodes { databaseId } } }
        level2plus { guides { nodes { databaseId } } }
        level3 { guides { nodes { databaseId } } }
      }
    }
  }`;
  try {
    const response = await fetch(WP_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { id: eventId } }),
    });
    if (!response.ok) return [];
    const json = await response.json().catch(() => ({}));
    const details = json?.data?.rideEvent?.eventDetails;
    if (!details) return [];
    const nodes = details[levelField]?.guides?.nodes;
    if (!Array.isArray(nodes)) return [];
    return nodes.map((n: { databaseId: number }) => n.databaseId);
  } catch {
    return [];
  }
}

// ─── Email builders ───────────────────────────────────────────────────────────
function buildRideCancelledHtml(
  eventTitle: string,
  rideLevel: string,
  reason: string,
  eventUrl?: string
): string {
  const levelLabel = formatRideLevel(rideLevel);
  const pill = eventUrl
    ? `<a href="${eventUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:16px;line-height:24px;color:rgb(255,254,254);background-color:rgb(72,81,151);text-decoration:none;padding:11px 16px 13px;border-radius:9999px;font-weight:bold;">${eventTitle} - ${levelLabel}</a>`
    : `<span style="display:inline-block;font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:16px;line-height:24px;color:rgb(255,254,254);background-color:rgb(72,81,151);padding:11px 16px 13px;border-radius:9999px;font-weight:bold;">${eventTitle} - ${levelLabel}</span>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background:rgb(250,250,252);"><table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width:100%;border-collapse:collapse;margin:0;padding:0;text-align:center;table-layout:fixed;background:rgb(250,250,252);"><tbody><tr><td align="center" style="padding:0;background:rgb(250,250,252);"><table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width:100%;border-collapse:collapse;margin:0;padding:0;text-align:center;table-layout:fixed;background:rgb(250,250,252);"><tbody><tr><td align="center" style="padding:24px 0px 16px;background:rgb(250,250,252);"><a href="https://kandiegang.com?ridecancelled" target="_blank" rel="noopener noreferrer"><img alt="Kandie Gang" width="138" src="https://www.kandiegang.com/logos/kandiegang_logo_purplerain_pill.png" style="display:block;width:138px;max-width:138px;margin:0 auto;"></a></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:602px;border-collapse:separate;background:rgb(255,255,254);border-radius:16px;border:1px solid rgb(221,221,221);margin:0 auto;"><tbody><tr><td align="center" style="padding:40px 0px;border-radius:16px;background:rgb(255,255,254);"><table border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="max-width:600px;margin:0 auto;border-collapse:collapse;"><tbody><tr><td align="center" style="padding:0px 40px 20px;background:rgb(255,255,254);"><h2 style="font-family:RoobertPRO,Helvetica,Arial,sans-serif;font-size:32px;line-height:40px;font-weight:normal;margin:0;color:rgb(72,81,151);">Your ride has been cancelled.</h2></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="max-width:600px;margin:0 auto;border-collapse:collapse;"><tbody><tr><td align="center" style="padding:0px 40px;background:rgb(255,255,254);"><p style="font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:16px;line-height:24px;color:rgb(28,28,30);margin:0;">We're sorry to let you know that the following ride has been cancelled:</p></td></tr><tr><td align="center" style="padding:20px 0px 0px;background:rgb(255,255,254);"></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="max-width:600px;margin:0 auto;border-collapse:collapse;"><tbody><tr><td align="center" style="padding:0px 40px;background:rgb(255,255,254);"><table border="0" cellpadding="0" cellspacing="0" align="center" style="border-collapse:collapse;"><tbody><tr><td align="center">${pill}</td></tr></tbody></table></td></tr><tr><td align="center" style="padding:20px 0px 0px;background:rgb(255,255,254);"></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="max-width:600px;margin:0 auto;border-collapse:collapse;"><tbody><tr><td align="left" style="padding:0px 40px 24px;background:rgb(255,255,254);"><p style="font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;color:rgb(100,100,105);margin:0 0 4px 0;text-transform:uppercase;letter-spacing:0.08em;">Reason</p><p style="font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:16px;line-height:24px;color:rgb(28,28,30);margin:0;">${reason}</p></td></tr></tbody></table></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:600px;border-collapse:collapse;margin:0 auto;"><tbody><tr><td align="center" style="padding:60px 0px 0px;background:rgb(250,250,252);"></td></tr><tr><td align="center" style="padding:0px 40px 24px;background:rgb(250,250,252);"><p style="font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;margin:0;color:rgb(28,28,30);">If you have any questions, just reply to this email — we're always happy to help.</p></td></tr><tr><td align="center" style="padding:0px 40px 24px;background:rgb(250,250,252);"><a href="https://kandiegang.com?ridecancelled" target="_blank" rel="noopener noreferrer"><img alt="Kandie Gang" width="138" src="https://www.kandiegang.com/logos/kandiegang_logo_purplerain_pill.png" style="display:block;width:138px;max-width:138px;margin:0 auto;"></a></td></tr><tr><td align="center" style="padding:0px 40px;font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;color:rgb(28,28,30);"><span>Kandie Gang<br>It's a love story 💜</span><br><br></td></tr><tr><td align="center" style="padding:0px 40px;font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;"><span><a href="https://www.kandiegang.com/privacy-policy?ridecancelled" target="_blank" rel="noopener noreferrer" style="font-weight:bold;text-decoration:none;color:rgb(72,81,151);">Privacy Policy</a> | <a href="https://www.kandiegang.com/about?ridecancelled" target="_blank" rel="noopener noreferrer" style="font-weight:bold;text-decoration:none;color:rgb(72,81,151);">About Us</a></span></td></tr></tbody></table></td></tr></tbody></table></body></html>`;
}

function buildRideCancelledText(
  eventTitle: string,
  rideLevel: string,
  reason: string
): string {
  return [
    'Your ride has been cancelled',
    '',
    `We're sorry to let you know that the following ride has been cancelled:`,
    `${eventTitle} - ${formatRideLevel(rideLevel)}`,
    '',
    'Reason:',
    reason,
    '',
    "If you have any questions, just reply to this email — we're always happy to help.",
    '',
    "Kandie Gang — It's a love story 💜",
  ].join('\n');
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Auth
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!bearerToken) {
    return res.status(401).json({ error: 'Authentication required' });
  }

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

  // Verify caller is a guide
  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('is_guide, wp_user_id, email, display_name')
    .eq('id', user.id)
    .single();

  if (!callerProfile?.is_guide || !callerProfile?.wp_user_id) {
    return res.status(403).json({ error: 'Guide access required' });
  }

  // Parse body
  const body = req.body as {
    eventId?: string | number;
    rideLevel?: string;
    reason?: string;
  };
  const eventIdRaw = body?.eventId;
  const eventId =
    typeof eventIdRaw === 'string' ? Number(eventIdRaw) : (eventIdRaw as number | undefined);
  const rideLevel = typeof body?.rideLevel === 'string' ? body.rideLevel.trim() : null;
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : null;

  if (!eventId || Number.isNaN(eventId)) {
    return res.status(400).json({ error: 'Missing or invalid eventId' });
  }
  if (!rideLevel) {
    return res.status(400).json({ error: 'Missing rideLevel' });
  }
  if (!reason || reason.length < 3) {
    return res.status(400).json({ error: 'A cancellation reason is required' });
  }

  // Verify guide is assigned to this level in WordPress
  const guideIds = await fetchLevelGuideIds(eventId, rideLevel);
  if (guideIds.length > 0 && !guideIds.includes(Number(callerProfile.wp_user_id))) {
    return res.status(403).json({ error: 'You are not assigned as a guide for this level' });
  }

  // Check not already cancelled
  const { data: existing } = await adminClient
    .from('ride_level_cancellations')
    .select('id')
    .eq('event_id', eventId)
    .eq('ride_level', rideLevel)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ error: 'This ride level has already been cancelled' });
  }

  // Insert cancellation record
  const { error: insertError } = await adminClient.from('ride_level_cancellations').insert({
    event_id: eventId,
    ride_level: rideLevel,
    cancelled_by: user.id,
    reason,
  });

  if (insertError) {
    console.error('[guide-cancel-ride] Insert error:', insertError);
    return res.status(500).json({ error: 'Failed to record cancellation' });
  }

  // Fetch all non-cancelled registrations for this level
  const { data: registrations, error: regsError } = await adminClient
    .from('registrations')
    .select('id, user_id, email, first_name, ride_level')
    .eq('event_id', eventId)
    .eq('ride_level', rideLevel)
    .is('cancelled_at', null);

  if (regsError) {
    console.error('[guide-cancel-ride] Registrations fetch error:', regsError);
    return res.status(500).json({ error: 'Failed to fetch registrations' });
  }

  const registrationList = registrations ?? [];

  // Bulk cancel all registrations
  if (registrationList.length > 0) {
    const ids = registrationList.map((r) => r.id);
    await adminClient
      .from('registrations')
      .update({ cancelled_at: new Date().toISOString() })
      .in('id', ids);
  }

  // Fetch event title for emails
  const { title: eventTitle, slug: eventSlug } = await fetchEventTitleAndSlug(eventId);
  const eventUrl = eventSlug ? `${BASE_URL}/community/${eventSlug}` : undefined;

  // Send cancellation email to each participant
  let emailsSent = 0;
  if (RESEND_API_KEY && registrationList.length > 0) {
    const resend = new Resend(RESEND_API_KEY);

    // Collect user_ids that need profile lookup
    const profileLookups = registrationList
      .filter((r) => !r.email && r.user_id)
      .map((r) => r.user_id as string);

    let profileEmails: Record<string, string> = {};
    if (profileLookups.length > 0) {
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, email')
        .in('id', profileLookups);
      (profiles ?? []).forEach((p) => {
        if (p.email) profileEmails[p.id] = p.email;
      });
    }

    for (const reg of registrationList) {
      const recipientEmail = reg.email ?? (reg.user_id ? profileEmails[reg.user_id] : null);
      if (!recipientEmail) continue;

      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: recipientEmail,
          subject: `Your ${eventTitle} - ${formatRideLevel(rideLevel)} ride has been cancelled`,
          html: buildRideCancelledHtml(eventTitle, rideLevel, reason, eventUrl),
          text: buildRideCancelledText(eventTitle, rideLevel, reason),
        });
        emailsSent++;
      } catch (emailErr) {
        console.error('[guide-cancel-ride] Email send error for', recipientEmail, emailErr);
      }
    }
  }

  return res.status(200).json({
    success: true,
    cancelledCount: registrationList.length,
    emailsSent,
  });
}
