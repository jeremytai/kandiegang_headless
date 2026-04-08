export type EventType = 'ride' | 'workshop' | 'training';

/**
 * WordPress `eventDetails.primaryType` is human-facing and not guaranteed stable/cased.
 * Normalize it into a small canonical set used by Supabase + UI logic.
 */
export function normalizeEventType(primaryType: string | null | undefined): EventType {
  const raw = (primaryType ?? '').trim().toLowerCase();
  if (raw.includes('workshop')) return 'workshop';
  if (raw.includes('training')) return 'training';
  return 'ride';
}

export function formatEventTypeLabel(type: EventType): string {
  if (type === 'workshop') return 'Workshop';
  if (type === 'training') return 'Training';
  return 'Ride';
}

