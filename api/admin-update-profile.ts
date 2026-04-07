import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';
import { checkRateLimit } from '../lib/rateLimit.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
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

/** Per-field type validators for editable profile fields. */
const FIELD_VALIDATORS: Record<string, (v: unknown) => boolean> = {
  is_guide:                 (v) => typeof v === 'boolean',
  is_member:                (v) => typeof v === 'boolean',
  is_team:                  (v) => typeof v === 'boolean',
  is_archived:              (v) => v === null || typeof v === 'boolean',
  wp_user_id:               (v) => v === null || (typeof v === 'number' && Number.isInteger(v)),
  display_name:             (v) => typeof v === 'string' && v.length <= 200,
  accepts_marketing:        (v) => v === null || typeof v === 'boolean',
  member_since:             (v) => v === null || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)),
  membership_expiration:    (v) => v === null || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)),
  stripe_subscription_status: (v) => v === null || (typeof v === 'string' && v.length <= 50),
  order_count:              (v) => typeof v === 'number' && Number.isInteger(v) && v >= 0,
  lifetime_value:           (v) => typeof v === 'number' && v >= 0,
  avg_order_value:          (v) => v === null || (typeof v === 'number' && v >= 0),
  last_order_date:          (v) => v === null || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)),
  tags:                     (v) => Array.isArray(v) && (v as unknown[]).every((t) => typeof t === 'string' && t.length <= 100),
  order_history:            (v) => Array.isArray(v),
};

const EDITABLE_FIELDS = new Set(Object.keys(FIELD_VALIDATORS));

/**
 * POST /api/admin-update-profile
 *
 * Actions (via body.action):
 *   "update" (default) — update whitelisted profile fields
 *     Body: { memberId, updates }
 *   "merge" — merge source profile into target profile
 *     Body: { targetId, sourceId }
 *   "admin-remove-participant" — cancel a single registration (opens waitlist spot)
 *     Body: { registrationId, eventId }
 *   "admin-no-show" — mark a registration as no-show (no waitlist change)
 *     Body: { registrationId }
 *   "admin-send-participant-email" — send a personal email to a participant
 *     Body: { registrationId, subject, message }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (
    !(await checkRateLimit(req, res, { windowMs: 60_000, max: 30, keyPrefix: 'admin-update-profile' }))
  ) {
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Not configured' });
  }

  const action = (req.body as { action?: string }).action || 'update';

  // profile-lookup is unauthenticated — handle before auth check
  if (action === 'profile-lookup') return handleProfileLookup(req, res);

  // All other actions require guide authentication
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error: authError,
  } = await adminClient.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('is_guide')
    .eq('id', user.id)
    .single();

  if (!callerProfile?.is_guide) {
    return res.status(403).json({ error: 'Forbidden — guide access required' });
  }

  if (action === 'merge') return handleMerge(req, res, adminClient);
  if (action === 'admin-remove-participant') return handleRemoveParticipant(req, res, adminClient);
  if (action === 'admin-no-show') return handleNoShow(req, res, adminClient);
  if (action === 'admin-send-participant-email') return handleSendParticipantEmail(req, res, adminClient);

  return handleUpdate(req, res, adminClient);
}

// ─── Profile update action ────────────────────────────────────────────────────

async function handleUpdate(
  req: NextApiRequest,
  res: NextApiResponse,
  adminClient: SupabaseClient<any>
) {
  const { memberId, updates } = req.body as {
    memberId?: string;
    updates?: Record<string, unknown>;
  };

  if (!memberId || typeof memberId !== 'string') {
    return res.status(400).json({ error: 'memberId is required' });
  }
  if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'updates object is required' });
  }

  const safeUpdates: Record<string, unknown> = {};
  const invalidFields: string[] = [];
  for (const [key, value] of Object.entries(updates)) {
    if (!EDITABLE_FIELDS.has(key)) continue;
    if (!FIELD_VALIDATORS[key](value)) {
      invalidFields.push(key);
    } else {
      safeUpdates[key] = value;
    }
  }

  if (invalidFields.length > 0) {
    return res.status(400).json({ error: `Invalid value for field(s): ${invalidFields.join(', ')}` });
  }
  if (Object.keys(safeUpdates).length === 0) {
    return res.status(400).json({ error: 'No editable fields provided' });
  }

  try {
    const { data, error } = await adminClient
      .from('profiles')
      .update(safeUpdates)
      .eq('id', memberId)
      .select(
        'id, display_name, is_guide, is_member, is_team, tags, accepts_marketing, member_since, membership_expiration, stripe_subscription_status'
      )
      .single();

    if (error) {
      console.error('Admin profile update error:', error);
      return res.status(500).json({ error: error.message || 'Failed to update profile' });
    }

    return res.status(200).json({ profile: data });
  } catch (err) {
    console.error('Admin profile update error:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
}

// ─── Merge action ────────────────────────────────────────────────────────────

async function handleMerge(
  req: NextApiRequest,
  res: NextApiResponse,
  adminClient: SupabaseClient<any>
) {
  const { targetId, sourceId } = req.body as { targetId?: string; sourceId?: string };

  if (!targetId || !sourceId) {
    return res.status(400).json({ error: 'targetId and sourceId are required' });
  }
  if (targetId === sourceId) {
    return res.status(400).json({ error: 'Cannot merge a profile into itself' });
  }

  try {
    const { data: target, error: targetError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', targetId)
      .single();

    const { data: source, error: sourceError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', sourceId)
      .single();

    if (targetError || !target) {
      return res.status(404).json({ error: 'Target profile not found' });
    }
    if (sourceError || !source) {
      return res.status(404).json({ error: 'Source profile not found' });
    }

    // Merge alternate_emails
    const existingAlternates: string[] = target.alternate_emails || [];
    const newAlternates = new Set(existingAlternates.map((e: string) => e.toLowerCase()));
    if (source.email) newAlternates.add(source.email.toLowerCase());
    if (source.alternate_emails) {
      for (const e of source.alternate_emails) {
        newAlternates.add(e.toLowerCase());
      }
    }
    if (target.email) newAlternates.delete(target.email.toLowerCase());
    const mergedAlternates = [...newAlternates];

    // Merge order_history (deduplicate by order_id)
    const targetHistory = Array.isArray(target.order_history) ? target.order_history : [];
    const sourceHistory = Array.isArray(source.order_history) ? source.order_history : [];
    const existingOrderIds = new Set(targetHistory.map((o: { order_id?: string }) => String(o.order_id)));
    const newOrders = sourceHistory.filter(
      (o: { order_id?: string }) => !existingOrderIds.has(String(o.order_id))
    );
    const mergedHistory = [...targetHistory, ...newOrders].sort(
      (a: { date?: string }, b: { date?: string }) =>
        (b.date || '').localeCompare(a.date || '')
    );

    // Recalculate metrics
    const orderCount = mergedHistory.length;
    const lifetimeValue =
      Math.round(
        mergedHistory.reduce(
          (sum: number, o: { total?: number | string }) => sum + (parseFloat(String(o.total)) || 0),
          0
        ) * 100
      ) / 100;
    const avgOrderValue = orderCount > 0 ? Math.round((lifetimeValue / orderCount) * 100) / 100 : 0;
    const lastOrderDate = mergedHistory.reduce(
      (latest: string | null, o: { date?: string }) => {
        if (!o.date) return latest;
        const d = String(o.date).substring(0, 10);
        return !latest || d > latest ? d : latest;
      },
      target.last_order_date || null
    );

    // Fill in missing fields from source
    const fillableFields = [
      'first_name', 'last_name',
      'billing_address_1', 'billing_city', 'billing_postcode', 'billing_country', 'billing_phone',
      'discord_id', 'username', 'avatar_url',
      'newsletter_status', 'newsletter_source', 'engagement_score',
      'customer_since', 'member_since',
    ] as const;

    const fieldUpdates: Record<string, unknown> = {};
    for (const field of fillableFields) {
      if (target[field] === null && source[field] !== null) {
        fieldUpdates[field] = source[field];
      }
    }

    // Merge tags
    const targetTags: string[] = target.tags || [];
    const sourceTags: string[] = source.tags || [];
    const mergedTags = [...new Set([...targetTags, ...sourceTags])];

    const isMember = target.is_member || source.is_member;
    const isGuide = target.is_guide || source.is_guide;

    // Update target profile
    const { data: updated, error: updateError } = await adminClient
      .from('profiles')
      .update({
        ...fieldUpdates,
        alternate_emails: mergedAlternates,
        order_history: mergedHistory,
        order_count: orderCount,
        lifetime_value: lifetimeValue,
        avg_order_value: avgOrderValue,
        last_order_date: lastOrderDate,
        tags: mergedTags,
        is_member: isMember,
        is_guide: isGuide,
      })
      .eq('id', targetId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Merge update error:', updateError);
      return res.status(500).json({ error: 'Failed to update target profile' });
    }

    // Delete source profile
    const { error: deleteError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', sourceId);

    if (deleteError) {
      console.error('Source profile delete error:', deleteError);
    }

    // Delete source auth user
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(sourceId);
    if (authDeleteError) {
      console.error('Source auth user delete error:', authDeleteError);
    }

    return res.status(200).json({
      profile: updated,
      merged: {
        newOrders: newOrders.length,
        totalOrders: orderCount,
        alternateEmails: mergedAlternates,
      },
    });
  } catch (err) {
    console.error('Merge profiles error:', err);
    return res.status(500).json({ error: 'Failed to merge profiles' });
  }
}

// ─── Participant management helpers ──────────────────────────────────────────

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

async function fetchEventTitle(eventId: number): Promise<string> {
  const query = `query GetRideEventTitle($id: ID!) { rideEvent(id: $id, idType: DATABASE_ID) { title } }`;
  try {
    const response = await fetch(WP_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { id: eventId } }),
    });
    if (!response.ok) return `Event #${eventId}`;
    const json = await response.json().catch(() => ({}));
    return json?.data?.rideEvent?.title ?? `Event #${eventId}`;
  } catch {
    return `Event #${eventId}`;
  }
}

function buildPromotedHtml(eventTitle: string, rideLevel: string, cancelUrl: string): string {
  const safeTitle = escapeHtml(eventTitle);
  const safeLevel = escapeHtml(formatRideLevel(rideLevel));
  const safeCancel = escapeHtml(cancelUrl);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background:rgb(250,250,252);"><table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width:100%;border-collapse:collapse;margin:0;padding:0;text-align:center;table-layout:fixed;background:rgb(250,250,252);"><tbody><tr><td align="center" style="padding:0;background:rgb(250,250,252);"><table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width:100%;border-collapse:collapse;margin:0;padding:0;text-align:center;table-layout:fixed;background:rgb(250,250,252);"><tbody><tr><td align="center" style="padding:24px 0px 16px;background:rgb(250,250,252);"><a href="https://kandiegang.com?spotopened" target="_blank" rel="noopener noreferrer"><img alt="Kandie Gang" width="138" src="https://www.kandiegang.com/logos/kandiegang_logo_purplerain_pill.png" style="display:block;width:138px;max-width:138px;margin:0 auto;"></a></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:602px;border-collapse:separate;background:rgb(255,255,254);border-radius:16px;border:1px solid rgb(221,221,221);margin:0 auto;"><tbody><tr><td align="center" style="padding:40px 0px;border-radius:16px;background:rgb(255,255,254);"><table border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="max-width:600px;margin:0 auto;border-collapse:collapse;"><tbody><tr><td align="center" style="padding:0px 40px 20px;background:rgb(255,255,254);"><h2 style="font-family:RoobertPRO,Helvetica,Arial,sans-serif;font-size:32px;line-height:40px;font-weight:normal;margin:0;color:rgb(72,81,151);">A spot opened up!</h2></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="max-width:600px;margin:0 auto;border-collapse:collapse;"><tbody><tr><td align="center" style="padding:0px 40px;background:rgb(255,255,254);"><p style="font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:16px;line-height:24px;color:rgb(28,28,30);margin:0;">You are now confirmed for:</p></td></tr><tr><td align="center" style="padding:20px 0px 0px;background:rgb(255,255,254);"></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="max-width:600px;margin:0 auto;border-collapse:collapse;"><tbody><tr><td align="center" style="padding:0px 40px;background:rgb(255,255,254);"><table border="0" cellpadding="0" cellspacing="0" align="center" style="border-collapse:collapse;"><tbody><tr><td align="center"><span style="display:inline-block;font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:16px;line-height:24px;color:rgb(255,254,254);background-color:rgb(72,81,151);padding:11px 16px 13px;border-radius:9999px;font-weight:bold;">${safeTitle} - ${safeLevel}</span></td></tr></tbody></table></td></tr><tr><td align="center" style="padding:20px 0px 0px;background:rgb(255,255,254);"></td></tr></tbody></table></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:600px;border-collapse:collapse;margin:0 auto;"><tbody><tr><td align="center" style="padding:60px 0px 0px;background:rgb(250,250,252);"></td></tr><tr><td align="center" style="padding:0px 40px 24px;background:rgb(250,250,252);"><p style="font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;margin:0;color:rgb(28,28,30);">Need to cancel? Use the link below.</p></td></tr><tr><td align="center" style="padding:0px 40px 40px;background:rgb(250,250,252);"><p style="font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;margin:0;color:rgb(28,28,30);"><a href="${safeCancel}" target="_blank" rel="noopener noreferrer" style="font-weight:bold;text-decoration:none;color:rgb(72,81,151);">Cancel my spot</a>.</p></td></tr><tr><td align="center" style="padding:0px 40px 24px;background:rgb(250,250,252);"><a href="https://kandiegang.com?spotopened" target="_blank" rel="noopener noreferrer"><img alt="Kandie Gang" width="138" src="https://www.kandiegang.com/logos/kandiegang_logo_purplerain_pill.png" style="display:block;width:138px;max-width:138px;margin:0 auto;"></a></td></tr><tr><td align="center" style="padding:0px 40px;font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;color:rgb(28,28,30);"><span>Kandie Gang<br>It's a love story 💜</span><br><br></td></tr><tr><td align="center" style="padding:0px 40px;font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;"><span><a href="https://www.kandiegang.com/privacy-policy?spotopened" target="_blank" rel="noopener noreferrer" style="font-weight:bold;text-decoration:none;color:rgb(72,81,151);">Privacy Policy</a> | <a href="https://www.kandiegang.com/about?spotopened" target="_blank" rel="noopener noreferrer" style="font-weight:bold;text-decoration:none;color:rgb(72,81,151);">About Us</a></span></td></tr></tbody></table></td></tr></tbody></table></body></html>`;
}

function buildPromotedText(eventTitle: string, rideLevel: string, cancelUrl: string): string {
  return ['A spot opened up', '', 'You are now confirmed for:', `${eventTitle} - ${formatRideLevel(rideLevel)}`, '', 'Need to cancel? Use this link:', cancelUrl].join('\n');
}

function buildPersonalEmailHtml(subject: string, message: string): string {
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background:rgb(250,250,252);"><table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width:100%;border-collapse:collapse;margin:0;padding:0;text-align:center;table-layout:fixed;background:rgb(250,250,252);"><tbody><tr><td align="center" style="padding:0;background:rgb(250,250,252);"><table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width:100%;border-collapse:collapse;margin:0;padding:0;text-align:center;table-layout:fixed;background:rgb(250,250,252);"><tbody><tr><td align="center" style="padding:24px 0px 16px;background:rgb(250,250,252);"><a href="https://kandiegang.com?guidemessage" target="_blank" rel="noopener noreferrer"><img alt="Kandie Gang" width="138" src="https://www.kandiegang.com/logos/kandiegang_logo_purplerain_pill.png" style="display:block;width:138px;max-width:138px;margin:0 auto;"></a></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:602px;border-collapse:separate;background:rgb(255,255,254);border-radius:16px;border:1px solid rgb(221,221,221);margin:0 auto;"><tbody><tr><td align="center" style="padding:40px 0px;border-radius:16px;background:rgb(255,255,254);"><table border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="max-width:600px;margin:0 auto;border-collapse:collapse;"><tbody><tr><td align="center" style="padding:0px 40px 20px;background:rgb(255,255,254);"><h2 style="font-family:RoobertPRO,Helvetica,Arial,sans-serif;font-size:32px;line-height:40px;font-weight:normal;margin:0;color:rgb(72,81,151);">${safeSubject}</h2></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="max-width:600px;margin:0 auto;border-collapse:collapse;"><tbody><tr><td align="left" style="padding:0px 40px 24px;background:rgb(255,255,254);"><p style="font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:16px;line-height:24px;color:rgb(28,28,30);margin:0;">${safeMessage}</p></td></tr></tbody></table></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:600px;border-collapse:collapse;margin:0 auto;"><tbody><tr><td align="center" style="padding:60px 0px 0px;background:rgb(250,250,252);"></td></tr><tr><td align="center" style="padding:0px 40px 24px;background:rgb(250,250,252);"><p style="font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;margin:0;color:rgb(28,28,30);">If you have any questions, just reply to this email — we're always happy to help.</p></td></tr><tr><td align="center" style="padding:0px 40px 24px;background:rgb(250,250,252);"><a href="https://kandiegang.com?guidemessage" target="_blank" rel="noopener noreferrer"><img alt="Kandie Gang" width="138" src="https://www.kandiegang.com/logos/kandiegang_logo_purplerain_pill.png" style="display:block;width:138px;max-width:138px;margin:0 auto;"></a></td></tr><tr><td align="center" style="padding:0px 40px;font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;color:rgb(28,28,30);"><span>Kandie Gang<br>It's a love story 💜</span><br><br></td></tr><tr><td align="center" style="padding:0px 40px;font-family:NotoSans,Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;"><span><a href="https://www.kandiegang.com/privacy-policy?guidemessage" target="_blank" rel="noopener noreferrer" style="font-weight:bold;text-decoration:none;color:rgb(72,81,151);">Privacy Policy</a> | <a href="https://www.kandiegang.com/about?guidemessage" target="_blank" rel="noopener noreferrer" style="font-weight:bold;text-decoration:none;color:rgb(72,81,151);">About Us</a></span></td></tr></tbody></table></td></tr></tbody></table></body></html>`;
}

function buildPersonalEmailText(subject: string, message: string): string {
  return [subject, '', message, '', "If you have any questions, just reply to this email — we're always happy to help.", '', "Kandie Gang — It's a love story 💜"].join('\n');
}

// ─── Remove participant action ────────────────────────────────────────────────

async function handleRemoveParticipant(
  req: NextApiRequest,
  res: NextApiResponse,
  adminClient: SupabaseClient<any>
) {
  const body = req.body as { registrationId?: string; eventId?: string | number };
  const registrationId = typeof body?.registrationId === 'string' ? body.registrationId.trim() : null;
  const eventIdRaw = body?.eventId;
  const eventId = typeof eventIdRaw === 'string' ? Number(eventIdRaw) : (eventIdRaw as number | undefined);

  if (!registrationId) return res.status(400).json({ error: 'Missing registrationId' });
  if (!eventId || Number.isNaN(eventId)) return res.status(400).json({ error: 'Missing or invalid eventId' });

  const { data: reg, error: regError } = await adminClient
    .from('registrations')
    .select('id, event_id, ride_level, user_id, email, first_name, is_waitlist, cancelled_at')
    .eq('id', registrationId)
    .single();

  if (regError || !reg) return res.status(404).json({ error: 'Registration not found' });
  if (Number(reg.event_id) !== eventId) return res.status(404).json({ error: 'Registration not found' });
  if (reg.cancelled_at) return res.status(400).json({ error: 'Registration is already cancelled' });

  const now = new Date().toISOString();
  const { error: cancelError } = await adminClient
    .from('registrations')
    .update({ cancelled_at: now })
    .eq('id', registrationId);

  if (cancelError) {
    console.error('[admin-remove-participant] Cancel error:', cancelError);
    return res.status(500).json({ error: 'Failed to cancel registration' });
  }

  // Promote next waitlisted person only if the cancelled registration was confirmed (not waitlist)
  let promoted = false;
  if (!reg.is_waitlist && RESEND_API_KEY) {
    const { data: nextWaitlist } = await adminClient
      .from('registrations')
      .select('id, user_id, email, first_name, ride_level')
      .eq('event_id', eventId)
      .eq('ride_level', reg.ride_level)
      .eq('is_waitlist', true)
      .is('cancelled_at', null)
      .order('waitlist_joined_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextWaitlist) {
      const newCancelToken = crypto.randomBytes(24).toString('base64url');
      const newCancelTokenHash = crypto.createHash('sha256').update(newCancelToken).digest('hex');
      await adminClient
        .from('registrations')
        .update({ is_waitlist: false, waitlist_promoted_at: now, cancel_token_hash: newCancelTokenHash })
        .eq('id', nextWaitlist.id);

      let toEmail: string | null = nextWaitlist.email ?? null;
      if (!toEmail && nextWaitlist.user_id) {
        const { data: profile } = await adminClient.from('profiles').select('email').eq('id', nextWaitlist.user_id).single();
        toEmail = profile?.email ?? null;
      }

      if (toEmail) {
        try {
          const eventTitle = await fetchEventTitle(eventId);
          const cancelUrl = `${BASE_URL}/cancel?token=${newCancelToken}`;
          const resend = new Resend(RESEND_API_KEY);
          await resend.emails.send({
            from: FROM_EMAIL,
            to: toEmail,
            subject: `You're in! ${eventTitle} - ${formatRideLevel(nextWaitlist.ride_level)}`,
            html: buildPromotedHtml(eventTitle, nextWaitlist.ride_level, cancelUrl),
            text: buildPromotedText(eventTitle, nextWaitlist.ride_level, cancelUrl),
          });
        } catch (emailErr) {
          console.warn('[admin-remove-participant] Waitlist promotion email failed:', emailErr);
        }
      }
      promoted = true;
    }
  }

  return res.status(200).json({ success: true, promoted });
}

// ─── No-show action ───────────────────────────────────────────────────────────

async function handleNoShow(
  req: NextApiRequest,
  res: NextApiResponse,
  adminClient: SupabaseClient<any>
) {
  const body = req.body as { registrationId?: string };
  const registrationId = typeof body?.registrationId === 'string' ? body.registrationId.trim() : null;
  if (!registrationId) return res.status(400).json({ error: 'Missing registrationId' });

  const { data: reg, error: regError } = await adminClient
    .from('registrations')
    .select('id, cancelled_at, no_show_at')
    .eq('id', registrationId)
    .single();

  if (regError || !reg) return res.status(404).json({ error: 'Registration not found' });
  if (reg.cancelled_at) return res.status(400).json({ error: 'Cannot mark a cancelled registration as no-show' });
  if (reg.no_show_at) return res.status(400).json({ error: 'Registration is already marked as no-show' });

  const { error: updateError } = await adminClient
    .from('registrations')
    .update({ no_show_at: new Date().toISOString() })
    .eq('id', registrationId);

  if (updateError) {
    console.error('[admin-no-show] Update error:', updateError);
    return res.status(500).json({ error: 'Failed to mark registration as no-show' });
  }

  return res.status(200).json({ success: true });
}

// ─── Send personal email action ───────────────────────────────────────────────

async function handleSendParticipantEmail(
  req: NextApiRequest,
  res: NextApiResponse,
  adminClient: SupabaseClient<any>
) {
  const body = req.body as { registrationId?: string; subject?: string; message?: string };
  const registrationId = typeof body?.registrationId === 'string' ? body.registrationId.trim() : null;
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : null;
  const message = typeof body?.message === 'string' ? body.message.trim() : null;

  if (!registrationId) return res.status(400).json({ error: 'Missing registrationId' });
  if (!subject || subject.length === 0) return res.status(400).json({ error: 'Subject is required' });
  if (subject.length > 200) return res.status(400).json({ error: 'Subject is too long (max 200 characters)' });
  if (!message || message.length < 3) return res.status(400).json({ error: 'Message must be at least 3 characters' });
  if (message.length > 5000) return res.status(400).json({ error: 'Message is too long (max 5000 characters)' });

  const { data: reg, error: regError } = await adminClient
    .from('registrations')
    .select('id, user_id, email, first_name, last_name')
    .eq('id', registrationId)
    .single();

  if (regError || !reg) return res.status(404).json({ error: 'Registration not found' });

  let toEmail: string | null = reg.email ?? null;
  if (!toEmail && reg.user_id) {
    const { data: profile } = await adminClient.from('profiles').select('email').eq('id', reg.user_id).single();
    toEmail = profile?.email ?? null;
  }

  if (!toEmail) return res.status(400).json({ error: 'This participant has no email address on file' });
  if (!RESEND_API_KEY) return res.status(500).json({ error: 'Email service not configured' });

  try {
    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject,
      html: buildPersonalEmailHtml(subject, message),
      text: buildPersonalEmailText(subject, message),
    });
  } catch (emailErr) {
    console.error('[admin-send-participant-email] Send error:', emailErr);
    return res.status(500).json({ error: 'Failed to send email' });
  }

  return res.status(200).json({ success: true });
}

// ─── Profile lookup (unauthenticated) ────────────────────────────────────────

async function handleProfileLookup(req: NextApiRequest, res: NextApiResponse) {
  const body = req.body as { email?: string };
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || !email.includes('@')) return res.status(200).json({ displayName: null });

  try {
    const adminClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data } = await adminClient
      .from('profiles')
      .select('display_name')
      .ilike('email', email)
      .limit(1)
      .maybeSingle();
    const displayName =
      typeof data?.display_name === 'string' && data.display_name.trim()
        ? data.display_name.trim()
        : null;
    return res.status(200).json({ displayName });
  } catch {
    return res.status(200).json({ displayName: null });
  }
}
