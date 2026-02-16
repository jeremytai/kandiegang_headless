// Unified rate limit helper for Next.js API routes and Vercel serverless functions
import type { NextApiRequest, NextApiResponse } from 'next';
import type { VercelRequest, VercelResponse } from '@vercel/node';

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix: string;
};

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

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

export function checkRateLimit(
  req: NextApiRequest | VercelRequest,
  res: NextApiResponse | VercelResponse,
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
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
    } else if (typeof res.writeHead === 'function' && typeof res.end === 'function') {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Too many requests. Please try again later.' }));
    }
    return false;
  }

  current.count += 1;
  buckets.set(key, current);
  return true;
}
