// Migrated from /api/geolocation.ts to Next.js API route
import type { NextApiRequest, NextApiResponse } from 'next';

const IPAPI_BASE = 'https://ipapi.co';

function getClientIp(req: NextApiRequest): string {
  const real = req.headers['x-real-ip'];
  if (typeof real === 'string' && real.trim()) return real.trim();
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    const first = String(forwarded[0]).trim();
    if (first) return first;
  }
  return '';
}

function isValidIp(ip: string): boolean {
  if (!ip || ip.length > 45) return false;
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return true;
  if (/^[0-9a-fA-F:.]{2,45}$/.test(ip)) return true;
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const clientIp = getClientIp(req);
    const url = isValidIp(clientIp)
      ? `${IPAPI_BASE}/${encodeURIComponent(clientIp)}/json/`
      : `${IPAPI_BASE}/json/`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upstream request failed' });
    }
    const data = await response.json();
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch (err) {
    console.error('Geolocation proxy error:', err);
    if (!res.headersSent) {
      return res.status(502).json({ error: 'Geolocation unavailable' });
    }
  }
}
