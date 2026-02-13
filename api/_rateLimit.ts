import type { VercelRequest, VercelResponse } from '@vercel/node';

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix: string;
};

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (value && typeof value === 'string') {
    return value.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
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
