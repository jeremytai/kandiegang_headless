/**
 * Generates an iCalendar (.ics) file string for a Kandie Gang event.
 * Pure function — no platform-specific imports; safe to use in browser and Node.
 */

export type IcsEventInput = {
  title: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" 24-hour, or "H:MMam/pm" — optional */
  time?: string;
  /** Duration in minutes (default 120) */
  durationMinutes?: number;
  location?: string;
  description?: string;
  uid?: string;
};

/** Parse a time string to { h, m } or null. Handles "19:00", "7:30", "7:30pm", "7pm". */
function parseTime(raw: string): { h: number; m: number } | null {
  const s = raw.trim().toLowerCase();
  const ampm = s.endsWith('am') || s.endsWith('pm') ? s.slice(-2) : null;
  const core = ampm ? s.slice(0, -2).trim() : s;
  const parts = core.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] != null ? parseInt(parts[1], 10) : 0;
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  if (ampm === 'pm' && h < 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  return { h, m };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Format a date+time as iCal local datetime string "YYYYMMDDTHHmmss". */
function icalDate(dateStr: string, h: number, m: number): string {
  const d = dateStr.replace(/-/g, '');
  return `${d}T${pad(h)}${pad(m)}00`;
}

/** UTC timestamp for DTSTAMP. */
function dtstamp(): string {
  const now = new Date();
  return (
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`
  );
}

/** Fold long lines per RFC 5545 (max 75 octets). */
function fold(line: string): string {
  const out: string[] = [];
  while (line.length > 75) {
    out.push(line.slice(0, 75));
    line = ' ' + line.slice(75);
  }
  out.push(line);
  return out.join('\r\n');
}

/** Escape text values per RFC 5545. */
function escapeIcal(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function generateIcs(event: IcsEventInput): string {
  const parsed = event.time ? parseTime(event.time) : null;
  const startH = parsed?.h ?? 0;
  const startM = parsed?.m ?? 0;
  const duration = event.durationMinutes ?? 120;

  const totalStartMins = startH * 60 + startM;
  const totalEndMins = totalStartMins + duration;
  const endH = Math.floor(totalEndMins / 60) % 24;
  const endM = totalEndMins % 60;

  // Use DATE-only when no time is known
  const dtstart = parsed
    ? `DTSTART;TZID=Europe/Berlin:${icalDate(event.date, startH, startM)}`
    : `DTSTART;VALUE=DATE:${event.date.replace(/-/g, '')}`;
  const dtend = parsed
    ? `DTEND;TZID=Europe/Berlin:${icalDate(event.date, endH, endM)}`
    : `DTEND;VALUE=DATE:${event.date.replace(/-/g, '')}`;

  const uid = event.uid ?? `${Date.now()}-${Math.random().toString(36).slice(2)}@kandiegang.com`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kandie Gang//Event//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp()}`,
    dtstart,
    dtend,
    fold(`SUMMARY:${escapeIcal(event.title)}`),
    event.location ? fold(`LOCATION:${escapeIcal(event.location)}`) : '',
    event.description ? fold(`DESCRIPTION:${escapeIcal(event.description)}`) : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter((l) => l !== '')
    .join('\r\n');

  return lines;
}
