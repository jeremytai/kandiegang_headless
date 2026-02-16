// Rate limiting helper for Vercel serverless functions
import type { VercelRequest, VercelResponse } from '@vercel/node';

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix: string;
};

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function getClientIp(req: VercelRequest): string {
  // In Vercel serverless functions, always use x-forwarded-for header
  const forwarded = req.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (value && typeof value === 'string') {
    return value.split(',')[0].trim();
  }
  // Fallback to x-real-ip if x-forwarded-for not available
  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') {
    return realIp;
  }
  return 'unknown';
}

export function checkRateLimit(
  req: VercelRequest,
  res: VercelResponse,
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
