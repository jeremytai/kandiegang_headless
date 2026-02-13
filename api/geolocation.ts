/**
 * Vercel serverless proxy for IP geolocation.
 * Avoids CORS by calling ipapi.co from the server and returning JSON to the client.
 * Forwards the client IP so ipapi.co geolocates the visitor, not the Vercel server (e.g. Ashburn).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const IPAPI_BASE = 'https://ipapi.co';

/** Returns client IP from Vercel/edge headers, or empty string if missing/invalid. */
function getClientIp(req: VercelRequest): string {
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

/** Simple IPv4/IPv6 check so we don't pass garbage to ipapi.co. */
function isValidIp(ip: string): boolean {
  if (!ip || ip.length > 45) return false;
  // IPv4
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return true;
  // IPv6 (simplified: has colons and valid chars)
  if (/^[0-9a-fA-F:.]{2,45}$/.test(ip)) return true;
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const clientIp = getClientIp(req);
    const url = isValidIp(clientIp)
      ? `${IPAPI_BASE}/${encodeURIComponent(clientIp)}/json/`
      : `${IPAPI_BASE}/json/`;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upstream request failed' });
    }

    const data = await response.json();
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch (err) {
    console.error('Geolocation proxy error:', err);
    // Always send a response, even on error
    if (!res.headersSent) {
      return res.status(502).json({ error: 'Geolocation unavailable' });
    }
  }
}
