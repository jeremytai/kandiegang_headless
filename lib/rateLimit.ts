// Unified rate limit helper for Next.js API routes and Vercel serverless functions
import type { NextApiRequest, NextApiResponse } from 'next';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix: string;
};

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Optional Redis client for cross-instance rate limiting. When not configured,
// the helper falls back to in-memory buckets (per lambda / process).
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

function getClientIp(req: any): string {
  // Try x-forwarded-for (works for both Next.js and Vercel)
  const forwarded = req.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (value && typeof value === 'string') {
    return value.split(',')[0].trim();
  }
  // Fallback to x-real-ip
  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') {
    return realIp;
  }
  // Fallback to req.socket.remoteAddress (Next.js)
  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress;
  }
  return 'unknown';
}

export async function checkRateLimit(
  req: NextApiRequest | VercelRequest,
  res: NextApiResponse | VercelResponse,
  options: RateLimitOptions
): Promise<boolean> {
  const now = Date.now();
  const ip = getClientIp(req);
  const key = `${options.keyPrefix}:${ip}`;

  // Prefer Redis when configured so limits are shared across all instances.
  if (redis) {
    try {
      const ttlSeconds = Math.ceil(options.windowMs / 1000);
      const count = await redis.incr(key);
      if (count === 1) {
        // Set expiry for the first hit in this window.
        await redis.expire(key, ttlSeconds);
      }
      if (count > options.max) {
        if (typeof (res as any).status === 'function' && typeof (res as any).json === 'function') {
          (res as any).status(429).json({ error: 'Too many requests. Please try again later.' });
        } else if (
          typeof (res as any).writeHead === 'function' &&
          typeof (res as any).end === 'function'
        ) {
          (res as any).writeHead(429, { 'Content-Type': 'application/json' });
          (res as any).end(
            JSON.stringify({ error: 'Too many requests. Please try again later.' })
          );
        }
        return false;
      }
      return true;
    } catch {
      // If Redis is misconfigured or temporarily unavailable, fall back to in-memory buckets.
    }
  }

  const current = buckets.get(key);

  if (!current || now > current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return true;
  }

  if (current.count >= options.max) {
    if (typeof (res as any).status === 'function' && typeof (res as any).json === 'function') {
      (res as any).status(429).json({ error: 'Too many requests. Please try again later.' });
    } else if (
      typeof (res as any).writeHead === 'function' &&
      typeof (res as any).end === 'function'
    ) {
      (res as any).writeHead(429, { 'Content-Type': 'application/json' });
      (res as any).end(JSON.stringify({ error: 'Too many requests. Please try again later.' }));
    }
    return false;
  }

  current.count += 1;
  buckets.set(key, current);
  return true;
}
