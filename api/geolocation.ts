/**
 * Vercel serverless proxy for IP geolocation.
 * Avoids CORS by calling ipapi.co from the server and returning JSON to the client.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const IPAPI_URL = 'https://ipapi.co/json/';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(IPAPI_URL);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upstream request failed' });
    }
    const data = await response.json();
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch (err) {
    console.error('Geolocation proxy error:', err);
    return res.status(502).json({ error: 'Geolocation unavailable' });
  }
}
