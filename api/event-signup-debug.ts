import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Log what we received
    console.log('Request method:', req.method);
    console.log('Request body type:', typeof req.body);
    console.log('Request body:', req.body);

    return res.status(200).json({
      message: 'Debug endpoint working',
      method: req.method,
      bodyType: typeof req.body,
      body: req.body,
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return res.status(500).json({
      error: 'Internal error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
