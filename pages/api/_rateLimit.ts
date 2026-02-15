// Migrated from /api/_rateLimit.ts to Next.js API route helper
import type { NextApiRequest, NextApiResponse } from 'next';

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix: string;
};

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (value && typeof value === 'string') {
    return value.split(',')[0].trim();
  }
  // req.socket is a NodeJS.Socket, which has remoteAddress
  return (req.socket as import('net').Socket)?.remoteAddress || 'unknown';
}

export function checkRateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  options: RateLimitOptions
): boolean {
  const now = Date.now();
  const ip = getClientIp(req);
  const key = `${options.keyPrefix}:${ip}`;
  const current = buckets.get(key);

  if (!current || now > current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return true;
  }

  if (current.count >= options.max) {
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return false;
  }

  current.count += 1;
  buckets.set(key, current);
  return true;
}
