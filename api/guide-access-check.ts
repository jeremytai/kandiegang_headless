import { NextApiRequest, NextApiResponse } from 'next';

const WP_GRAPHQL_URL =
  process.env.VITE_WP_GRAPHQL_URL ||
  process.env.WP_GRAPHQL_URL ||
  'https://wp-origin.kandiegang.com/graphql';

interface Guide {
  databaseId: number | string;
  title: string;
}

interface GuideLevel {
  key: string;
  label: string;
  guides: Guide[];
}

interface GuideAccessCheckResponse {
  eventId: string;
  eventTitle: string;
  levels: GuideLevel[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GuideAccessCheckResponse | { error: string }>
) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { eventId } = req.body;
  if (!eventId) return res.status(400).json({ error: 'Missing eventId' });

  const query = `
    query GetRideEvent($id: ID!) {
      rideEvent(id: $id, idType: DATABASE_ID) {
        databaseId
        title
        eventDetails {
          level1 { guides { nodes { ... on RideGuide { databaseId title } } } }
          level2 { guides { nodes { ... on RideGuide { databaseId title } } } }
          level2plus { guides { nodes { ... on RideGuide { databaseId title } } } }
          level3 { guides { nodes { ... on RideGuide { databaseId title } } } }
        }
      }
    }
  `;
  try {
    const wpRes = await fetch(WP_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { id: eventId } }),
    });
    const json = await wpRes.json();
    if (!json.data?.rideEvent) return res.status(404).json({ error: 'Event not found' });
    const event = json.data.rideEvent;
    const levels = [
      { key: 'level1', label: 'Level 1', guides: event.eventDetails?.level1?.guides?.nodes || [] },
      { key: 'level2', label: 'Level 2', guides: event.eventDetails?.level2?.guides?.nodes || [] },
      {
        key: 'level2plus',
        label: 'Level 2+',
        guides: event.eventDetails?.level2plus?.guides?.nodes || [],
      },
      { key: 'level3', label: 'Level 3', guides: event.eventDetails?.level3?.guides?.nodes || [] },
    ];
    res.status(200).json({ eventId, eventTitle: event.title, levels });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch event data';
    res.status(500).json({ error: message });
  }
}
