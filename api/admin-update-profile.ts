import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkRateLimit } from '../lib/rateLimit.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

/** Fields that guides are allowed to edit via this endpoint. */
const EDITABLE_FIELDS = new Set([
  'is_guide',
  'is_member',
  'is_team',
  'display_name',
  'tags',
  'accepts_marketing',
  'member_since',
  'membership_expiration',
  'stripe_subscription_status',
  'order_history',
  'order_count',
  'lifetime_value',
  'avg_order_value',
  'last_order_date',
]);

/**
 * POST /api/admin-update-profile
 *
 * Actions (via body.action):
 *   "update" (default) — update whitelisted profile fields
 *     Body: { memberId, updates }
 *   "merge" — merge source profile into target profile
 *     Body: { action: "merge", targetId, sourceId }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!checkRateLimit(req, res, { windowMs: 60_000, max: 30, keyPrefix: 'admin-update-profile' })) {
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Not configured' });
  }

  // Verify caller is an authenticated guide
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

  const action = (req.body as { action?: string }).action || 'update';

  if (action === 'merge') {
    return handleMerge(req, res, adminClient);
  }

  return handleUpdate(req, res, adminClient);
}

// ─── Update action ───────────────────────────────────────────────────────────

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
  for (const [key, value] of Object.entries(updates)) {
    if (EDITABLE_FIELDS.has(key)) {
      safeUpdates[key] = value;
    }
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
