// Cron job: send 24-hour event reminder emails to confirmed participants.
// Runs once daily at 07:00 UTC via Vercel Cron. The 17–41h window covers all
// events starting anytime the following calendar day. The reminder_sent_at
// guard ensures each participant receives exactly one reminder per registration.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'Kandie Gang <noreply@kandiegang.com>';
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://kandiegang.com');
const WP_GRAPHQL_URL =
  process.env.VITE_WP_GRAPHQL_URL ||
  process.env.WP_GRAPHQL_URL ||
  'https://wp-origin.kandiegang.com/graphql';
const CRON_SECRET = process.env.CRON_SECRET;

// ─── Utilities ────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function formatRideLevel(rideLevel: string): string {
  const map: Record<string, string> = {
    level1: 'Level 1', level2: 'Level 2', level2plus: 'Level 2+',
    level3: 'Level 3', gravel: 'Gravel', workshop: 'Workshop',
  };
  return map[rideLevel] ?? rideLevel;
}

function createCancelToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(24).toString('base64url');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

// ─── WordPress event metadata ─────────────────────────────────────────────────

interface WpEventMeta {
  title: string;
  date: string;   // YYYY-MM-DD from eventDetails.eventDate
  link: string;   // event page permalink
}

async function fetchWpEventsMeta(eventIds: number[]): Promise<Record<number, WpEventMeta>> {
  if (eventIds.length === 0) return {};
  const aliases = eventIds
    .map((id) => `e${id}: rideEvent(id: "${id}", idType: DATABASE_ID) { title link eventDetails { eventDate } }`)
    .join('\n    ');
  try {
    const response = await fetch(WP_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `{ ${aliases} }` }),
    });
    if (!response.ok) return {};
    const json = await response.json().catch(() => ({}));
    const data = json?.data ?? {};
    const result: Record<number, WpEventMeta> = {};
    for (const id of eventIds) {
      const entry = data[`e${id}`];
      if (entry) {
        result[id] = {
          title: entry.title || `Event #${id}`,
          date: entry.eventDetails?.eventDate ? entry.eventDetails.eventDate.split('T')[0] : '',
          link: entry.link || `${BASE_URL}/community`,
        };
      }
    }
    return result;
  } catch {
    return {};
  }
}

// ─── Email template ───────────────────────────────────────────────────────────

function buildReminderHtml(
  firstName: string,
  eventTitle: string,
  rideLevel: string,
  eventDate: string,
  eventUrl: string,
  cancelUrl: string
): string {
  const safeName = escapeHtml(firstName || 'there');
  const safeTitle = escapeHtml(eventTitle);
  const safeLevel = escapeHtml(formatRideLevel(rideLevel));
  const safeEventUrl = escapeHtml(eventUrl);
  const safeCancel = escapeHtml(cancelUrl);
  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'tomorrow';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background:rgb(250,250,252);"><table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width:100%;border-collapse:collapse;margin:0;padding:0;text-align:center;table-layout:fixed;background:rgb(250,250,252);"><tbody><tr><td align="center" style="padding:0;background:rgb(250,250,252);"><table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width:100%;border-collapse:collapse;margin:0;padding:0;text-align:center;table-layout:fixed;background:rgb(250,250,252);"><tbody><tr><td align="center" style="padding:24px 0px 16px;background:rgb(250,250,252);"><a href="${safeEventUrl}" target="_blank" rel="noopener noreferrer"><img alt="Kandie Gang" width="138" src="https://www.kandiegang.com/logos/kandiegang_logo_purplerain_pill.png" style="display:block;width:138px;max-width:138px;margin:0 auto;"></a></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:602px;border-collapse:separate;background:rgb(255,255,254);border-radius:16px;border:1px solid rgb(221,221,221);margin:0 auto;"><tbody><tr><td align="center" style="padding:40px 0px;border-radius:16px;background:rgb(255,255,254);"><table border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="max-width:600px;margin:0 auto;border-collapse:collapse;"><tbody><tr><td align="center" style="padding:0px 40px 20px;background:rgb(255,255,254);"><h2 style="font-family:RoobertPRO,Helvetica,Arial,sans-serif;font-size:32px;line-height:40px;font-weight:normal;margin:0;color:rgb(72,81,151);">See you tomorrow, ${safeName}!</h2></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="max-width:600px;margin:0 auto;border-collapse:collapse;"><tbody><tr><td align="center" style="padding:0px 40px;background:rgb(255,255,254);"><p style="font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:16px;line-height:24px;color:rgb(28,28,30);margin:0;">You're confirmed for the following ride:</p></td></tr><tr><td align="center" style="padding:20px 0px 0px;background:rgb(255,255,254);"></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="max-width:600px;margin:0 auto;border-collapse:collapse;"><tbody><tr><td align="center" style="padding:0px 40px;background:rgb(255,255,254);"><table border="0" cellpadding="0" cellspacing="0" align="center" style="border-collapse:collapse;"><tbody><tr><td align="center"><a href="${safeEventUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:16px;line-height:24px;color:rgb(255,254,254);background-color:rgb(72,81,151);text-decoration:none;padding:11px 16px 13px;border-radius:9999px;font-weight:bold;">${safeTitle} — ${safeLevel}</a></td></tr></tbody></table></td></tr><tr><td align="center" style="padding:16px 40px 0px;background:rgb(255,255,254);"><p style="font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:15px;line-height:22px;color:rgb(100,100,105);margin:0;">${formattedDate}</p></td></tr><tr><td align="center" style="padding:20px 0px 0px;background:rgb(255,255,254);"></td></tr></tbody></table></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:600px;border-collapse:collapse;margin:0 auto;"><tbody><tr><td align="center" style="padding:60px 0px 0px;background:rgb(250,250,252);"></td></tr><tr><td align="center" style="padding:0px 40px 24px;background:rgb(250,250,252);"><p style="font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;margin:0;color:rgb(28,28,30);">Can't make it? Please cancel as early as possible so someone on the waitlist can take your spot.</p></td></tr><tr><td align="center" style="padding:0px 40px 40px;background:rgb(250,250,252);"><p style="font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;margin:0;"><a href="${safeCancel}" target="_blank" rel="noopener noreferrer" style="font-weight:bold;text-decoration:none;color:rgb(72,81,151);">Cancel my spot</a></p></td></tr><tr><td align="center" style="padding:0px 40px 24px;background:rgb(250,250,252);"><a href="${safeEventUrl}" target="_blank" rel="noopener noreferrer"><img alt="Kandie Gang" width="138" src="https://www.kandiegang.com/logos/kandiegang_logo_purplerain_pill.png" style="display:block;width:138px;max-width:138px;margin:0 auto;"></a></td></tr><tr><td align="center" style="padding:0px 40px;font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;color:rgb(28,28,30);"><span>Kandie Gang<br>It's a love story 💜</span><br><br></td></tr><tr><td align="center" style="padding:0px 40px;font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;"><span><a href="https://www.kandiegang.com/privacy-policy?reminder" target="_blank" rel="noopener noreferrer" style="font-weight:bold;text-decoration:none;color:rgb(72,81,151);">Privacy Policy</a> | <a href="https://www.kandiegang.com/about?reminder" target="_blank" rel="noopener noreferrer" style="font-weight:bold;text-decoration:none;color:rgb(72,81,151);">About Us</a></span></td></tr></tbody></table></td></tr></tbody></table></body></html>`;
}

function buildReminderText(
  firstName: string,
  eventTitle: string,
  rideLevel: string,
  eventDate: string,
  eventUrl: string,
  cancelUrl: string
): string {
  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'tomorrow';
  return [
    `See you tomorrow, ${firstName || 'there'}!`,
    '',
    "You're confirmed for the following ride:",
    `${eventTitle} — ${formatRideLevel(rideLevel)}`,
    formattedDate,
    '',
    `View event: ${eventUrl}`,
    '',
    "Can't make it? Please cancel as early as possible so someone on the waitlist can take your spot.",
    `Cancel my spot: ${cancelUrl}`,
    '',
    "Kandie Gang — It's a love story 💜",
  ].join('\n');
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.authorization;
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server configuration error' });
  }
  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Fetch all confirmed, non-reminded registrations
    const { data: registrations, error: regError } = await adminClient
      .from('registrations')
      .select('id, event_id, ride_level, user_id, email, first_name, cancel_token_hash')
      .eq('is_waitlist', false)
      .is('cancelled_at', null)
      .is('reminder_sent_at', null);

    if (regError) throw regError;
    if (!registrations || registrations.length === 0) {
      return res.status(200).json({ sent: 0, message: 'No pending reminders' });
    }

    // Get unique event IDs and fetch their dates from WordPress
    const eventIds = [...new Set(registrations.map((r) => Number(r.event_id)))];
    const wpMeta = await fetchWpEventsMeta(eventIds);

    // Filter to events happening tomorrow (17–41h from now).
    // Cron runs at 07:00 UTC daily, so this window covers all events
    // starting anywhere between 00:00 and 23:59 UTC the following day.
    const now = Date.now();
    const windowStart = now + 17 * 60 * 60 * 1000;
    const windowEnd = now + 41 * 60 * 60 * 1000;

    const qualifyingEventIds = new Set(
      eventIds.filter((id) => {
        const meta = wpMeta[id];
        if (!meta?.date) return false;
        const eventTs = new Date(meta.date).getTime();
        return eventTs >= windowStart && eventTs < windowEnd;
      })
    );

    if (qualifyingEventIds.size === 0) {
      return res.status(200).json({ sent: 0, message: 'No events in reminder window' });
    }

    // Resolve emails for authenticated users via profiles
    const userIds = [
      ...new Set(
        registrations
          .filter((r) => qualifyingEventIds.has(Number(r.event_id)) && r.user_id && !r.email)
          .map((r) => r.user_id as string)
      ),
    ];
    const profileEmails: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, email')
        .in('id', userIds);
      (profiles ?? []).forEach((p) => { if (p.email) profileEmails[p.id] = p.email; });
    }

    const resend = new Resend(RESEND_API_KEY);
    let sent = 0;
    let failed = 0;
    const now_iso = new Date().toISOString();

    for (const reg of registrations) {
      const eventId = Number(reg.event_id);
      if (!qualifyingEventIds.has(eventId)) continue;

      const meta = wpMeta[eventId];
      const toEmail: string | null = reg.email ?? (reg.user_id ? (profileEmails[reg.user_id] ?? null) : null);
      if (!toEmail) continue;

      // Issue a fresh cancel token so the reminder email's cancel link works
      const { token: newCancelToken, hash: newCancelTokenHash } = createCancelToken();
      const cancelUrl = `${BASE_URL}/event/cancel?token=${encodeURIComponent(newCancelToken)}`;
      const eventUrl = meta.link || `${BASE_URL}/community`;

      // Update DB: new cancel token + mark reminder sent (in one round-trip)
      const { error: updateError } = await adminClient
        .from('registrations')
        .update({
          cancel_token_hash: newCancelTokenHash,
          cancel_token_issued_at: now_iso,
          reminder_sent_at: now_iso,
        })
        .eq('id', reg.id);

      if (updateError) {
        console.error(`[send-reminders] DB update failed for reg ${reg.id}:`, updateError);
        failed++;
        continue;
      }

      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: toEmail,
          subject: `Reminder: ${meta.title} is tomorrow`,
          html: buildReminderHtml(reg.first_name, meta.title, reg.ride_level, meta.date, eventUrl, cancelUrl),
          text: buildReminderText(reg.first_name, meta.title, reg.ride_level, meta.date, eventUrl, cancelUrl),
        });
        sent++;
      } catch (emailErr) {
        console.warn(`[send-reminders] Email failed for reg ${reg.id}:`, emailErr);
        // reminder_sent_at is already set — won't retry next hour, which is correct:
        // the event is <25h away; a failed email is better than a double-send.
        failed++;
      }
    }

    return res.status(200).json({ sent, failed, eventsInWindow: qualifyingEventIds.size });
  } catch (err) {
    console.error('[send-reminders] Error:', err);
    return res.status(500).json({ error: 'Reminder job failed' });
  }
}
