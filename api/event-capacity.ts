// Vercel serverless function for event capacity
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Persistent rate limiting using Upstash Redis
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
  limit: number,
  windowMs: number
): Promise<boolean> {
  if (!redis) {
    return true; // Allow if Redis not configured (dev environment)
  }

  const ip = getClientIp(req);
  const key = `ratelimit:event-capacity:${ip}`;

  try {
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.pexpire(key, windowMs);
    }

    if (count > limit) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
      return false;
    }

    return true;
  } catch (error) {
    console.error('[event-capacity] Rate limit check failed:', error);
    return true; // Allow on error to prevent false positives
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit: 60 requests per minute per IP
  if (!(await checkRateLimit(req, res, 60, 60_000))) {
    return;
  }

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

    console.log(
      `[event-capacity] Event ${eventIdNumber}: ${rows.length} total signups, counts:`,
      counts
    );

    return res.status(200).json({
      eventId: eventIdNumber,
      total: rows.length,
      counts,
    });
  } catch (err) {
    console.error('[event-capacity] Error:', err);
    return res.status(500).json({ error: 'Failed to load capacity' });
  }
}
